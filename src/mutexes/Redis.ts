import { Redis } from 'ioredis';
import RatelimitMutex, { Ratelimit } from './RatelimitMutex';
import * as fs from 'fs';
import * as path from 'path';


declare module 'ioredis' {
	interface Redis {
		gettimeout(key: string, limit: string, globalLimit: string, defaultTimeout: number): Promise<number>;
	}

	interface Pipeline {
		gettimeout(key: string, limit: string, globalLimit: string, defaultTimeout: number): this;
	}
}

export default class RedisMutex extends RatelimitMutex {

	public readonly keys: {
		global: string,
		remaining: (route: string) => string,
		limit: (route: string) => string
	};

	constructor(public readonly redis: Redis, public readonly prefix?: string) {
		super();
		redis.defineCommand('gettimeout', {
			numberOfKeys: 3,
			lua: fs.readFileSync(path.join(__dirname, '../../scripts/gettimeout.lua')).toString(),
		});

		this.keys = {
			global: `${prefix ? `${prefix}:` : '' }global`,
			remaining: (route: string) => `${prefix ? `${prefix}:` : '' }${route}:remaining`,
			limit: (route: string) => `${prefix ? `${prefix}:` : '' }${route}:limit`
		}
	}

	public async set(route: string, limits: Partial<Ratelimit>): Promise<void> {
		const pipe = this.redis.pipeline();
		if (limits.timeout) {
			if (limits.global) pipe.set(this.keys.global, 'true', 'px', limits.timeout);
			else pipe.pexpire(this.keys.remaining(route), limits.timeout);
		}
		pipe.set(this.keys.limit(route), limits.limit ?? 0);
		pipe.set(this.keys.remaining(route), limits.remaining ?? 0, 'nx');
		await pipe.exec();
	}

	protected async getTimeout(route: string) {
		return this.redis.gettimeout(this.keys.remaining(route), this.keys.limit(route), this.keys.global, 1e3);
	}
}
