import { Redis } from '@upstash/redis';

const DOCUMENTS_KEY = 'research-assistant:documents:v1';
const VECTORS_KEY = 'research-assistant:vectors:v1';

let redisClient: Redis | null = null;
let missingRedisConfigLogged = false;

function getRedisConfig(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.KV_URL ||
    process.env.REDIS_URL;

  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.REDIS_TOKEN;

  if (!url || !token) {
    if (!missingRedisConfigLogged) {
      missingRedisConfigLogged = true;
      console.warn('[Persistence] Redis config incomplete - will use in-memory storage', {
        hasUrl: !!url,
        hasToken: !!token,
        urlDomain: url?.split('/')[2] || 'none',
        detectedEnvVars: {
          UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
          UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
          KV_REST_API_URL: !!process.env.KV_REST_API_URL,
          KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
          KV_URL: !!process.env.KV_URL,
          REDIS_URL: !!process.env.REDIS_URL,
          REDIS_TOKEN: !!process.env.REDIS_TOKEN,
        },
      });
    }
    return null;
  }

  return { url, token };
}

function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  const redisConfig = getRedisConfig();
  if (!redisConfig) {
    if (!missingRedisConfigLogged) {
      missingRedisConfigLogged = true;
      console.warn('[Persistence] Redis env vars not set. Falling back to in-memory storage. Data will be lost on cold start.');
    }
    return null;
  }

  try {
    redisClient = Redis.fromEnv();
    console.log('[Persistence] Redis client initialized successfully', {
      url: redisConfig.url.split('/')[2],
      timestamp: new Date().toISOString(),
    });
    return redisClient;
  } catch (error) {
    console.error('[Persistence] Failed to initialize Redis client:', error);
    return null;
  }
}

async function readJson<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) {
    console.debug(`[Persistence] No Redis client available for read: ${key}`);
    return null;
  }

  try {
    const value = await client.get<unknown>(key);
    if (value === null || value === undefined || value === '') {
      console.debug(`[Persistence] No data found in Redis for key: ${key}`);
      return null;
    }

    const parsed = typeof value === 'string' ? JSON.parse(value) as T : (value as T);
    console.log(`[Persistence] Successfully loaded ${key}`, {
      itemCount: Array.isArray(parsed) ? parsed.length : 'N/A',
      timestamp: new Date().toISOString(),
    });
    return parsed;
  } catch (error) {
    console.warn(`[Persistence] Failed to parse persisted value for ${key}:`, error);
    return null;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    console.debug(`[Persistence] No Redis client available. Skipping write for key: ${key}`);
    return;
  }

  try {
    await client.set(key, value as never);
    console.log(`[Persistence] Successfully persisted ${key}`, {
      itemCount: Array.isArray(value) ? value.length : 'N/A',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[Persistence] Failed to persist ${key}:`, error);
  }
}

export function isPersistentStorageConfigured(): boolean {
  return Boolean(getRedisConfig());
}

export async function loadDocumentRecords<T>(): Promise<T[] | null> {
  return readJson<T[]>(DOCUMENTS_KEY);
}

export async function saveDocumentRecords<T>(records: T[]): Promise<void> {
  await writeJson(DOCUMENTS_KEY, records);
}

export async function loadVectorRecords<T>(): Promise<T[] | null> {
  return readJson<T[]>(VECTORS_KEY);
}

export async function saveVectorRecords<T>(records: T[]): Promise<void> {
  await writeJson(VECTORS_KEY, records);
}
