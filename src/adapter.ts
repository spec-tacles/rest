import { AxiosRequestConfig, AxiosResponse } from 'axios';
import Bucket from './structures/Bucket';
import RatelimitMutex from './stores/RatelimitMutex';
import LocalMutex from './stores/Local';

export const buckets: Map<string, Bucket> = new Map();

/**
 * Make an Axios adapter that automatically handles ratelimits.
 * @param {Client} client The client for which to make this adapter
 * @returns {AxiosAdapter}
 */
export default (store: RatelimitMutex = new LocalMutex()) => async function adapt(config: AxiosRequestConfig): Promise<AxiosResponse> {
  // configure route and ratelimiter
  const route = Bucket.makeRoute(config.method || 'get', config.url || '');
  let b = buckets.get(route);
  if (!b) {
    b = new Bucket(store, route);
    buckets.set(route, b);
  }

  // make request
  return b.enqueue(config);
}
