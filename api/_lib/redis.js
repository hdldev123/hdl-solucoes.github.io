// Cliente Upstash Redis. Aceita as envs da integração Upstash direta
// (UPSTASH_REDIS_REST_*) ou do Vercel KV legado (KV_REST_API_*).
import { Redis } from '@upstash/redis';

let instancia = null;

export function obterRedis(env = process.env) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN;
  if (!url || !token) return null;
  if (env === process.env) {
    instancia ??= new Redis({ url, token });
    return instancia;
  }
  return new Redis({ url, token });
}
