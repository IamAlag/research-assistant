/**
 * Chat API Route.
 * 
 * POST /api/chat
 * 
 * Runs the agentic reasoning pipeline and streams results back
 * as Server-Sent Events (SSE). The frontend receives:
 * - thinking steps (for the thinking panel)
 * - content chunks (for the streaming answer)
 * - citations (for source references)
 * - suggestions (for follow-up questions)
 */

import { NextRequest } from 'next/server';
import { processQuestion } from '@/lib/services/agent-orchestrator';
import { generateSessionId } from '@/lib/utils/id-generator';

/** Maximum request duration for long reasoning chains */
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId: providedSessionId } = body as {
      message?: string;
      sessionId?: string;
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sessionId = providedSessionId || generateSessionId();

    // Create a streaming response using SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of processQuestion(message.trim(), sessionId)) {
            // Format as SSE
            const sseData = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(sseData));
          }
        } catch (error) {
          const errorEvent = {
            type: 'error',
            data: {
              message: error instanceof Error ? error.message : 'An unexpected error occurred',
            },
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Session-Id': sessionId,
      },
    });
  } catch (error) {
    console.error('[Chat API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Chat processing failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
