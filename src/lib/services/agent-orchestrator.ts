/**
 * Agent Orchestrator — The Agentic Reasoning Engine.
 * 
 * Implements a multi-step reasoning loop that goes far beyond simple RAG:
 * 
 * 1. PLAN      → Analyze the question complexity
 * 2. DECOMPOSE → Break complex questions into sub-questions
 * 3. RETRIEVE  → Search for relevant evidence
 * 4. EVALUATE  → Assess evidence quality and sufficiency
 * 5. RE-RETRIEVE → If evidence is weak, search again with refined queries
 * 6. SYNTHESIZE → Generate a grounded answer with citations
 * 7. CITE      → Extract and format source citations
 * 
 * Each step emits ThinkingStep events for the UI's thinking panel.
 * The entire pipeline streams results back to the client in real-time.
 */

import { generateResponse, generateStreamingResponse, parseLLMJson } from './llm-service';
import { retrieveChunks, retrieveForMultipleQueries, retrieveBalancedAcrossDocuments } from './retrieval-service';
import { addMessage, getFormattedHistory, addDocumentReference } from './memory-service';
import { hasDocuments, getStoredDocumentIds } from './vector-store-provider';
import { getDocumentList } from './document-store';
import { SYSTEM_PROMPT } from '@/lib/prompts/system-prompt';
import { PLANNER_PROMPT } from '@/lib/prompts/planner-prompt';
import { EVALUATOR_PROMPT } from '@/lib/prompts/evaluator-prompt';
import { SYNTHESIZER_PROMPT, REPORT_PROMPT, COMPARE_PROMPT } from '@/lib/prompts/synthesizer-prompt';
import { generateMessageId, generateStepId } from '@/lib/utils/id-generator';
import type { ChatMessage, Citation, ThinkingStep, StreamEvent } from '@/types/chat';
import type { AgentPlan, EvidenceEvaluation, AgentConfig } from '@/types/agent';
import type { ScoredChunk } from '@/types/retrieval';
import { DEFAULT_AGENT_CONFIG } from '@/types/agent';

/** Metadata about all uploaded documents (stored externally) */
let documentMetadataList: Array<{ id: string; fileName: string; title: string }> = [];

/**
 * Update the document metadata list (called when documents are added/removed).
 */
export function updateDocumentList(docs: Array<{ id: string; fileName: string; title: string }>) {
  documentMetadataList = docs;
}

/**
 * Run the agentic reasoning pipeline for a user question.
 * Yields StreamEvent objects that the API route serializes as SSE.
 */
export async function* processQuestion(
  question: string,
  sessionId: string,
  config: Partial<AgentConfig> = {}
): AsyncGenerator<StreamEvent> {
  const agentConfig = { ...DEFAULT_AGENT_CONFIG, ...config };
  const thinkingSteps: ThinkingStep[] = [];
  let allEvidence: ScoredChunk[] = [];
  let citations: Citation[] = [];

  // Save user message to history
  const userMessage: ChatMessage = {
    id: generateMessageId(),
    role: 'user',
    content: question,
    timestamp: new Date().toISOString(),
  };
  addMessage(sessionId, userMessage);

  // Check if documents are available
  if (!(await hasDocuments())) {
    yield { type: 'content', data: 'Please upload some documents first before asking questions. I need document context to provide accurate, grounded answers.' };
    yield { type: 'done', data: { message: 'complete' } };
    return;
  }

  try {
    // ============================================================
    // STEP 1: PLANNING
    // ============================================================
    const planStep = createThinkingStep('planning', 'Analyzing Question', 'Understanding the question and planning the research approach...');
    yield { type: 'thinking', data: planStep };
    thinkingSteps.push(planStep);

    const plan = await planQuestion(question, sessionId);
    console.log('[AgentOrchestrator] Plan:', plan);

    const liveDocumentList = await getDocumentList();
    applyDeterministicIntentOverride(plan, question, liveDocumentList.length);
    
    completeStep(planStep, `Strategy: ${plan.strategy} (Difficulty: ${plan.difficulty}/5)`);
    yield { type: 'thinking', data: planStep };

    // ============================================================
    // STEP 2: DECOMPOSITION (if complex)
    // ============================================================
    const queries: string[] = [];

    if (plan.isComplex && plan.subQuestions.length > 0 && agentConfig.enableDecomposition) {
      const decomposeStep = createThinkingStep(
        'decomposing',
        'Breaking Down Question',
        `Decomposing into ${plan.subQuestions.length} sub-questions...`
      );
      yield { type: 'thinking', data: decomposeStep };
      thinkingSteps.push(decomposeStep);

      for (const sq of plan.subQuestions) {
        queries.push(sq.question);
      }

      completeStep(decomposeStep, `Sub-questions: ${queries.map((q, i) => `${i + 1}. ${q}`).join('; ')}`);
      yield { type: 'thinking', data: decomposeStep };
    } else {
      queries.push(question);
    }

    // ============================================================
    // STEP 3: RETRIEVAL
    // ============================================================
    let retrievalRound = 0;
    let evidenceIsSufficient = false;

    while (retrievalRound < agentConfig.maxRetrievalRounds && !evidenceIsSufficient) {
      retrievalRound++;

      const docIds = await getStoredDocumentIds();
      const isMultiDocSearch = plan.taskIntent && plan.taskIntent !== 'qa' && docIds.length > 1;

      const searchStep = createThinkingStep(
        retrievalRound === 1 ? 'searching' : 're-searching',
        retrievalRound === 1 ? 'Searching Documents' : `Re-searching (Round ${retrievalRound})`,
        isMultiDocSearch 
          ? `Retrieving balanced chunks per document across ${docIds.length} papers...`
          : `Searching across ${docIds.length} documents...`
      );
      yield { type: 'thinking', data: searchStep };
      thinkingSteps.push(searchStep);

      // Retrieve balanced chunks per document or standard search
      const result = isMultiDocSearch
        ? await retrieveBalancedAcrossDocuments(queries[0], docIds)
        : (queries.length > 1
            ? await retrieveForMultipleQueries(queries)
            : await retrieveChunks(queries[0]));

      // Merge evidence (deduplicate by chunk ID)
      const existingIds = new Set(allEvidence.map(e => e.chunk.chunkId));
      for (const chunk of result.chunks) {
        if (!existingIds.has(chunk.chunk.chunkId)) {
          allEvidence.push(chunk);
          existingIds.add(chunk.chunk.chunkId);
        }
      }

      completeStep(searchStep, isMultiDocSearch 
        ? `Found ${result.chunks.length} chunks (Balanced across ${docIds.length} papers)`
        : `Found ${result.chunks.length} relevant chunks (${result.retrievalTimeMs}ms)`);
      yield { type: 'thinking', data: searchStep };

      // Track referenced documents
      for (const chunk of result.chunks) {
        addDocumentReference(sessionId, chunk.chunk.documentId);
      }

      // ============================================================
      // STEP 4: EVIDENCE EVALUATION
      // ============================================================
      const evalStep = createThinkingStep(
        'evaluating',
        'Evaluating Evidence',
        'Assessing whether the retrieved evidence is sufficient...'
      );
      yield { type: 'thinking', data: evalStep };
      thinkingSteps.push(evalStep);

      const evaluation = await evaluateEvidence(question, allEvidence);
      
      evidenceIsSufficient = evaluation.isSufficient || retrievalRound >= agentConfig.maxRetrievalRounds;

      let relevanceLabel = 'Low Relevance';
      if (evaluation.qualityScore >= 0.75) {
        relevanceLabel = 'High Relevance (Solid evidence base)';
      } else if (evaluation.qualityScore >= 0.45) {
        relevanceLabel = 'Moderate Relevance (Contextual coverage)';
      }

      if (evidenceIsSufficient) {
        completeStep(evalStep, `Evidence Quality: [ ${relevanceLabel} ] — Sufficient`);
      } else {
        completeStep(evalStep, `Evidence Quality: [ ${relevanceLabel} ] — Expanding retrieval...`);
        // Add gap-filling queries for next round
        if (evaluation.suggestions.length > 0) {
          queries.length = 0;
          queries.push(...evaluation.suggestions.slice(0, 3));
        }
      }

      yield { type: 'thinking', data: evalStep };
    }

    // ============================================================
    // STEP 5: SYNTHESIS
    // ============================================================
    const synthesizeStep = createThinkingStep(
      'synthesizing',
      'Generating Answer',
      'Synthesizing a comprehensive answer from the evidence...'
    );
    yield { type: 'thinking', data: synthesizeStep };
    thinkingSteps.push(synthesizeStep);

    // Build evidence context for the synthesizer
    const evidenceContext = formatEvidenceForPrompt(allEvidence);
    const history = getFormattedHistory(sessionId);

    // Route dynamically based on detected intent
    let targetPrompt = SYNTHESIZER_PROMPT;
    if (plan.taskIntent === 'report' || plan.taskIntent === 'explain_all') {
      targetPrompt = REPORT_PROMPT;
    } else if (plan.taskIntent === 'compare') {
      targetPrompt = COMPARE_PROMPT;
    }

    const synthesizerPrompt = targetPrompt
      .replace('{question}', question)
      .replace('{history}', history || 'No previous conversation.')
      .replace('{evidence}', evidenceContext);

    // Build list of unique documents involved
    const uniqueDocsMap = new Map<string, string>(); // id -> fileName
    for (const sc of allEvidence) {
      uniqueDocsMap.set(sc.chunk.documentId, sc.chunk.documentName);
    }
    
    let documentsHeader = '';
    if (uniqueDocsMap.size > 0) {
      documentsHeader = `📚 **Documents Analyzed:**\n`;
      uniqueDocsMap.forEach((fileName) => {
        documentsHeader += `- [x] **${fileName}**\n`;
      });
      documentsHeader += `\n---\n\n`;
    }

    // Prepend document checklist to the response stream
    if (documentsHeader) {
      yield { type: 'content', data: documentsHeader };
    }

    // Stream the synthesized answer
    let fullAnswer = documentsHeader;
    for await (const chunk of generateStreamingResponse(SYSTEM_PROMPT, synthesizerPrompt)) {
      fullAnswer += chunk;
      yield { type: 'content', data: chunk };
    }

    completeStep(synthesizeStep, 'Answer generated successfully');
    yield { type: 'thinking', data: synthesizeStep };

    // ============================================================
    // STEP 6: CITATIONS
    // ============================================================
    citations = extractCitations(allEvidence);
    if (citations.length > 0) {
      yield { type: 'citations', data: citations };
    }

    // Extract suggested follow-up questions from the answer
    const suggestions = extractSuggestions(fullAnswer);
    if (suggestions.length > 0) {
      yield { type: 'suggestions', data: suggestions };
    }

    // Save assistant message to history
    const assistantMessage: ChatMessage = {
      id: generateMessageId(),
      role: 'assistant',
      content: fullAnswer,
      timestamp: new Date().toISOString(),
      citations,
      thinkingSteps,
      suggestedQuestions: suggestions,
    };
    addMessage(sessionId, assistantMessage);

    // Mark complete
    const completeStep2 = createThinkingStep('complete', 'Complete', 'Research complete');
    completeStep2.status = 'complete';
    yield { type: 'thinking', data: completeStep2 };
    yield { type: 'done', data: { message: 'complete' } };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    console.error('[AgentOrchestrator] Error:', errorMessage);
    yield { type: 'error', data: { message: errorMessage } };
    yield { type: 'done', data: { message: 'error' } };
  }
}

/**
 * Plan how to answer the question using the LLM.
 */
async function planQuestion(question: string, sessionId: string): Promise<AgentPlan> {
  const history = getFormattedHistory(sessionId);
  const docList = (await getDocumentList()).map(d => `- ${d.fileName} (${d.title})`).join('\n');

  const plannerPrompt = PLANNER_PROMPT
    .replace('{question}', question)
    .replace('{history}', history || 'No previous conversation.')
    .replace('{documentList}', docList || 'No documents available.');

  try {
    const response = await generateResponse(SYSTEM_PROMPT, plannerPrompt);
    const parsed = parseLLMJson<{
      isComplex: boolean;
      strategy: string;
      difficulty: number;
      taskIntent?: 'explain_all' | 'compare' | 'report' | 'insights' | 'quiz' | 'qa';
      subQuestions: Array<{ question: string; reasoning: string }>;
    }>(response);

    return {
      originalQuestion: question,
      isComplex: parsed.isComplex,
      strategy: parsed.strategy,
      difficulty: parsed.difficulty,
      taskIntent: parsed.taskIntent || 'qa',
      subQuestions: parsed.subQuestions.map((sq, i) => ({
        id: `sq_${i}`,
        question: sq.question,
        reasoning: sq.reasoning,
        answered: false,
      })),
    };
  } catch (error) {
    console.warn('[AgentOrchestrator] Planning failed, using simple strategy:', error);
    return {
      originalQuestion: question,
      isComplex: false,
      strategy: 'Direct retrieval and answer',
      difficulty: 1,
      taskIntent: 'qa',
      subQuestions: [],
    };
  }
}

/**
 * Evaluate the quality and sufficiency of retrieved evidence.
 */
async function evaluateEvidence(
  question: string,
  evidence: ScoredChunk[]
): Promise<EvidenceEvaluation> {
  if (evidence.length === 0) {
    return {
      qualityScore: 0,
      isSufficient: false,
      gaps: ['No evidence was retrieved'],
      suggestions: [question],
    };
  }

  const evidenceText = formatEvidenceForPrompt(evidence.slice(0, 12));
  const docList = (await getDocumentList()).map(d => `- ${d.fileName} (${d.title})`).join('\n');
  const evalPrompt = EVALUATOR_PROMPT
    .replace('{question}', question)
    .replace('{documentList}', docList || 'No documents available.')
    .replace('{evidence}', evidenceText);

  try {
    const response = await generateResponse(SYSTEM_PROMPT, evalPrompt);
    return parseLLMJson<EvidenceEvaluation>(response);
  } catch (error) {
    console.warn('[AgentOrchestrator] Evaluation failed, assuming sufficient:', error);
    return {
      qualityScore: 0.6,
      isSufficient: true,
      gaps: [],
      suggestions: [],
    };
  }
}

/**
 * Format evidence chunks into a text prompt for the LLM.
 */
function formatEvidenceForPrompt(chunks: ScoredChunk[]): string {
  const groupedByDocument = new Map<string, ScoredChunk[]>();

  for (const chunk of chunks) {
    const documentChunks = groupedByDocument.get(chunk.chunk.documentId) || [];
    documentChunks.push(chunk);
    groupedByDocument.set(chunk.chunk.documentId, documentChunks);
  }

  let evidenceIndex = 1;
  const sections: string[] = [];

  groupedByDocument.forEach((documentChunks, documentId) => {
    const documentName = documentChunks[0]?.chunk.documentName || documentId;
    const items = documentChunks
      .map((sc) => {
        // Escape potential XML breakout tags from document contents
        const sanitizedContent = sc.chunk.content
          .replace(/<evidence_context>/g, '&lt;evidence_context&gt;')
          .replace(/<\/evidence_context>/g, '&lt;/evidence_context&gt;')
          .replace(/<evidence_item>/g, '&lt;evidence_item&gt;')
          .replace(/<\/evidence_item>/g, '&lt;/evidence_item&gt;');

        return (
          `<evidence_item id="${evidenceIndex++}">\n` +
          `Source: ${sc.chunk.documentName}, Page ${sc.chunk.pageNumber}\n` +
          `Section: ${sc.chunk.sectionHeading}\n` +
          `Relevance: ${(sc.finalScore * 100).toFixed(0)}%\n` +
          `Content:\n${sanitizedContent}\n` +
          `</evidence_item>`
        );
      })
      .join('\n\n');

    sections.push(`<document_summary name="${documentName}">\n${items}\n</document_summary>`);
  });

  return sections.join('\n\n---\n\n');
}

function applyDeterministicIntentOverride(
  plan: AgentPlan,
  question: string,
  documentCount: number
): void {
  const lower = question.toLowerCase();
  const broadRequestSignals = [
    'all',
    'every',
    'everything',
    'overview',
    'summarize',
    'summary',
    'understand',
    'explain',
    'papers',
    'documents',
    'docs',
    'complete',
    'entire',
    'whole',
  ];

  const isBroadMultiDocRequest = documentCount > 1 && broadRequestSignals.some((signal) => lower.includes(signal));

  if (isBroadMultiDocRequest) {
    plan.taskIntent = 'explain_all';
    if (!plan.isComplex) {
      plan.isComplex = true;
    }
    if (!plan.strategy || plan.strategy === 'Direct retrieval and answer') {
      plan.strategy = 'Broad multi-document overview and synthesis';
    }
  }
}

/**
 * Extract citations from the scored evidence chunks.
 */
function extractCitations(evidence: ScoredChunk[]): Citation[] {
  // Take top chunks as citations
  return evidence.slice(0, 8).map(sc => ({
    documentId: sc.chunk.documentId,
    documentName: sc.chunk.documentName,
    pageNumber: sc.chunk.pageNumber,
    sectionHeading: sc.chunk.sectionHeading,
    quotation: sc.chunk.content.length > 200
      ? sc.chunk.content.substring(0, 200) + '...'
      : sc.chunk.content,
    chunkId: sc.chunk.chunkId,
    relevanceScore: sc.finalScore,
  }));
}

/**
 * Extract suggested follow-up questions from the LLM's answer.
 */
function extractSuggestions(answer: string): string[] {
  const suggestions: string[] = [];
  
  // Look for numbered questions after "Suggested Follow-up" or similar headers
  const followUpSection = answer.match(/(?:suggested|follow[- ]?up|related)\s*(?:questions?)?:?\s*\n([\s\S]*?)(?:\n\n|$)/i);
  if (followUpSection) {
    const lines = followUpSection[1].split('\n');
    for (const line of lines) {
      const cleaned = line.replace(/^\d+\.\s*/, '').replace(/^\*+\s*/, '').replace(/^-\s*/, '').trim();
      if (cleaned.length > 10 && cleaned.endsWith('?')) {
        suggestions.push(cleaned);
      }
    }
  }

  return suggestions.slice(0, 3);
}

/**
 * Create a new thinking step with pending status.
 */
function createThinkingStep(
  type: ThinkingStep['type'],
  title: string,
  description: string
): ThinkingStep {
  return {
    id: generateStepId(),
    type,
    title,
    description,
    status: 'active',
  };
}

/**
 * Mark a thinking step as complete with an updated description.
 */
function completeStep(step: ThinkingStep, description: string): void {
  step.status = 'complete';
  step.description = description;
}
