import { AxiosInstance } from 'axios';
import RedisStore from './stores/Redis';
import instance, { Options } from './instance';
import { reflectors } from './util';
import Query, { ChainableQuery } from './structures/Query';

export { RedisStore }
export type Rest = ChainableQuery & AxiosInstance;
export const rest = (token: string, options: Options = {}): ChainableQuery & AxiosInstance => {
  const inst = instance(token, options);
  return new Proxy(inst as ChainableQuery & AxiosInstance, {
    get(target, prop) {
      if (prop in target) return target[prop as any];
      if (reflectors.includes(prop)) return target;

      const q = new Query(inst, prop.toString());
      const p: any = new Proxy(q, {
        get(target, prop) {
          if (reflectors.includes(prop)) return target.endpoint;
          if (prop in target || typeof prop === 'symbol') return (target as any)[prop];
          if (prop != null && !target.frozen) target.keys.push(prop.toString());
          return p;
        }
      });
      return p;
    },
  });
}
