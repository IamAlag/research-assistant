/**
 * Planner prompt template.
 * 
 * Used by the agent to analyze a question and decide whether it needs
 * to be decomposed into sub-questions or can be answered directly.
 */

export const PLANNER_PROMPT = `Analyze the following user question and determine the best strategy to answer it.

## User Question
{question}

## Conversation History
{history}

## Available Documents
{documentList}

## Instructions
Respond with a JSON object (no markdown code fences):
{{
  "isComplex": boolean,       // true if the question requires multiple retrieval steps
  "strategy": string,         // Brief description of your answering strategy
  "difficulty": number,       // 1-5 difficulty rating
  "taskIntent": string,       // Classify the intent: "explain_all" (summarize all docs), "compare" (compare details/methods), "report" (full structured report), "insights" (main takeaways), "quiz" (active recall test), or "qa" (standard fact Q&A)
  "subQuestions": [            // Array of sub-questions if isComplex is true, empty array otherwise
    {{
      "question": string,     // The sub-question to answer
      "reasoning": string     // Why this sub-question is needed
    }}
  ]
}}

Guidelines:
- A question is "complex" if it asks about multiple topics, requires comparison, or needs information from different sections/documents
- Simple factual questions should have isComplex = false
- Generate 2-4 sub-questions for complex queries
- Classify taskIntent as "explain_all" if the user asks for a summary, overview, explanation, or synthesis of all papers/documents, or uses broad terms like "all", "every", "everything", "overview", "understand", "explain", "papers", "documents", or "docs" in a multi-document context
- Prefer "explain_all" over "qa" whenever multiple uploaded documents are present and the question is broad rather than a single targeted fact query
- Classify taskIntent as "compare" if user asks to compare/contrast methodologies/results. Classify as "report" if user asks for a comprehensive report/review. Classify as "insights" if they want main findings. Classify as "quiz" if they want a quiz. Otherwise default to "qa"
- Each sub-question should be self-contained and answerable from the documents
- Consider the conversation history for context on follow-up questions`;
