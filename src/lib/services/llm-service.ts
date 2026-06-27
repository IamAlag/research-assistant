/**
 * LLM Service.
 * 
 * Wraps the Google Gemini chat model with streaming support.
 * Provides both streaming and non-streaming interfaces.
 */

import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { getConfig } from '@/lib/config';

/** Singleton LLM instances */
let plannerInstance: ChatGroq | null = null;
let synthesizerInstance: ChatGroq | null = null;

/**
 * Get or create the Planner LLM instance (Llama 8B for fast, structured tasks).
 */
function getPlannerLLM(): ChatGroq {
  if (!plannerInstance) {
    const config = getConfig();
    const apiKey = config.groq.apiKey;
    if (!apiKey) {
      throw new Error(
        'GROQ_API_KEY is not set. Get your Groq API key and ' +
        'add it to your .env.local file as GROQ_API_KEY=gsk_...'
      );
    }
    plannerInstance = new ChatGroq({
      apiKey,
      model: 'llama-3.1-8b-instant', // Extremely fast and low TPM cost for structured JSON steps
      temperature: 0.1,
      maxTokens: 1024,
    });
  }
  return plannerInstance;
}

/**
 * Get or create the Synthesizer LLM instance (Llama 70B for high-fidelity writing).
 */
function getSynthesizerLLM(): ChatGroq {
  if (!synthesizerInstance) {
    const config = getConfig();
    const apiKey = config.groq.apiKey;
    if (!apiKey) {
      throw new Error(
        'GROQ_API_KEY is not set. Get your Groq API key and ' +
        'add it to your .env.local file as GROQ_API_KEY=gsk_...'
      );
    }
    synthesizerInstance = new ChatGroq({
      apiKey,
      model: config.groq.chatModel || 'llama-3.3-70b-versatile', // High reasoning capability
      temperature: 0.3,
      maxTokens: 4096,
      streaming: true,
    });
  }
  return synthesizerInstance;
}

/**
 * Generate a non-streaming response from the LLM.
 * Used for planning and evaluation steps where we need the full response.
 */
export async function generateResponse(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const llm = getPlannerLLM();
  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ]);
  return response.content as string;
}

/**
 * Generate a streaming response from the LLM.
 * Yields chunks of text as they are generated.
 */
export async function* generateStreamingResponse(
  systemPrompt: string,
  userPrompt: string
): AsyncGenerator<string> {
  const llm = getSynthesizerLLM();
  const stream = await llm.stream([
    new SystemMessage(systemPrompt),
    new HumanMessage(userPrompt),
  ]);

  for await (const chunk of stream) {
    const content = chunk.content;
    if (typeof content === 'string' && content.length > 0) {
      yield content;
    }
  }
}

/**
 * Parse JSON from LLM response, handling common formatting issues.
 * LLMs sometimes wrap JSON in markdown code fences.
 */
export function parseLLMJson<T>(response: string): T {
  // Strip markdown code fences if present
  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    console.error('[LLMService] Failed to parse JSON response:', cleaned.substring(0, 200));
    throw new Error('Failed to parse LLM response as JSON');
  }
}
