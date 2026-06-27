import { Redis } from '@upstash/redis';

const DOCUMENTS_KEY = 'research-assistant:documents:v1';
const VECTORS_KEY = 'research-assistant:vectors:v1';

let redisClient: Redis | null = null;
let missingRedisConfigLogged = false;

function getRedisConfig(): { url: string; token: string } | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.REDIS_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.REDIS_TOKEN;

  if (!url || !token) {
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
      console.warn('[Persistence] Redis env vars not set. Falling back to in-memory storage.');
    }
    return null;
  }

  redisClient = new Redis(redisConfig);
  return redisClient;
}

async function readJson<T>(key: string): Promise<T | null> {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  const value = await client.get<string>(key);
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn(`[Persistence] Failed to parse persisted value for ${key}:`, error);
    return null;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  await client.set(key, JSON.stringify(value));
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
