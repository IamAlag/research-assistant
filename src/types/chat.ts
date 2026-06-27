/**
 * Chat and conversation type definitions.
 * 
 * These types power the chat interface, message history,
 * source citations, and the streaming response protocol.
 */

/** Role of a message sender */
export type MessageRole = 'user' | 'assistant' | 'system';

/** A source citation attached to an assistant response */
export interface Citation {
  /** Parent document ID */
  documentId: string;
  /** Parent document filename */
  documentName: string;
  /** Page number of the cited content */
  pageNumber: number;
  /** Section heading where the citation was found */
  sectionHeading: string;
  /** The exact quoted text from the source */
  quotation: string;
  /** Chunk ID for traceability */
  chunkId: string;
  /** Similarity/relevance score (0-1) */
  relevanceScore: number;
}

/** A single step in the agent's visible reasoning process */
export interface ThinkingStep {
  /** Step identifier */
  id: string;
  /** Type of reasoning step */
  type: 'planning' | 'decomposing' | 'searching' | 'evaluating' | 're-searching' | 'synthesizing' | 'complete';
  /** Human-readable title for this step */
  title: string;
  /** Description of what happened in this step */
  description: string;
  /** Status of this step */
  status: 'pending' | 'active' | 'complete' | 'error';
  /** Duration of this step in milliseconds */
  durationMs?: number;
  /** Metadata specific to the step type */
  metadata?: Record<string, unknown>;
}

/** A single chat message */
export interface ChatMessage {
  /** Unique message ID */
  id: string;
  /** Message role */
  role: MessageRole;
  /** Message text content (markdown supported) */
  content: string;
  /** Timestamp */
  timestamp: string;
  /** Source citations (assistant messages only) */
  citations?: Citation[];
  /** Agent reasoning steps (assistant messages only) */
  thinkingSteps?: ThinkingStep[];
  /** Whether this response is still streaming */
  isStreaming?: boolean;
  /** Suggested follow-up questions */
  suggestedQuestions?: string[];
  /** Token usage for this response */
  tokenUsage?: TokenUsage;
}

/** Token consumption tracking */
export interface TokenUsage {
  /** Tokens in the prompt */
  promptTokens: number;
  /** Tokens in the completion */
  completionTokens: number;
  /** Total tokens used */
  totalTokens: number;
}

/** A chat session containing a conversation thread */
export interface ChatSession {
  /** Unique session ID */
  id: string;
  /** Session title (auto-generated from first message) */
  title: string;
  /** All messages in this session */
  messages: ChatMessage[];
  /** Document IDs referenced in this session */
  documentIds: string[];
  /** Session creation timestamp */
  createdAt: string;
  /** Last activity timestamp */
  updatedAt: string;
}

/** Shape of the streamed response from the chat API */
export interface StreamEvent {
  /** Event type */
  type: 'thinking' | 'content' | 'citations' | 'suggestions' | 'token_usage' | 'error' | 'done';
  /** Event payload */
  data: ThinkingStep | string | Citation[] | string[] | TokenUsage | { message: string };
}
