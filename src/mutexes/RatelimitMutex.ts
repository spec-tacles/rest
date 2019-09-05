import { AbortSignal } from 'node-fetch/externals';
import { InternalError } from '../structures/HTTPError';
import { pause } from '../util';

export interface Ratelimit {
	global: boolean;
	limit: number;
	timeout: number;
	remaining: number;
}

export default abstract class RatelimitMutex {
	public claim(route: string, signal?: AbortSignal | null): Promise<void> {
		return new Promise(async (resolve, reject) => {
			const listener = () => reject(new Error(InternalError.REQUEST_CANCELLED));
			if (signal) signal.addEventListener('abort', listener);

			let timeout: number;
			do {
				timeout = await this.getTimeout(route);
				await pause(timeout);

				// keep checking for a timeout while we don't have 0 and the request isn't aborted
			} while (timeout > 0 && (!signal || !signal.aborted));

			if (signal) signal.removeEventListener('abort', listener)
			resolve();
		});

	}

	public abstract set(route: string, limits: Partial<Ratelimit>): Promise<void>;
	protected abstract getTimeout(route: string): Promise<number>;
}