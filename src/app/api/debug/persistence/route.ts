import { NextResponse } from 'next/server';
import { isPersistentStorageConfigured } from '@/lib/services/persistence-service';

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