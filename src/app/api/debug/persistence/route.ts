import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';
import {
  isPersistentStorageConfigured,
  loadDocumentRecords,
  saveDocumentRecords,
} from '@/lib/services/persistence-service';

export function GET() {
  return NextResponse.json({
    configured: isPersistentStorageConfigured(),
    env: {
      UPSTASH_REDIS_REST_URL: Boolean(process.env.UPSTASH_REDIS_REST_URL),
      UPSTASH_REDIS_REST_TOKEN: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN),
      KV_REST_API_URL: Boolean(process.env.KV_REST_API_URL),
      KV_REST_API_TOKEN: Boolean(process.env.KV_REST_API_TOKEN),
      KV_URL: Boolean(process.env.KV_URL),
      REDIS_URL: Boolean(process.env.REDIS_URL),
      REDIS_TOKEN: Boolean(process.env.REDIS_TOKEN),
    },
  });
}

export async function POST() {
  try {
    const redis = Redis.fromEnv();
    const key = `research-assistant:debug:${Date.now()}`;
    const value = { ok: true, at: new Date().toISOString() };

    await redis.set(key, value);
    const roundTrip = await redis.get<typeof value>(key);

    const documentProbe = [
      {
        id: `debug_${Date.now()}`,
        fileName: 'debug.txt',
        fileType: 'txt',
        fileSize: 1,
        pageCount: 1,
        chunkCount: 1,
        totalTokens: 1,
        uploadedAt: new Date().toISOString(),
        title: 'Debug Document',
      },
    ];

    await saveDocumentRecords(documentProbe);
    const documentRoundTrip = await loadDocumentRecords<typeof documentProbe[number]>();

    return NextResponse.json({
      configured: isPersistentStorageConfigured(),
      key,
      roundTrip,
      documentRoundTrip,
    });
  } catch (error) {
    return NextResponse.json(
      {
        configured: isPersistentStorageConfigured(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}