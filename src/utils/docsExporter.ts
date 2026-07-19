export interface DocExportResult {
  documentId: string;
  documentUrl: string;
  title: string;
}

export async function exportProjectSpecToGoogleDoc(accessToken: string): Promise<DocExportResult> {
  const docTitle = "Eval & Trajectory Workspace - Technical Specification";

  // 1. Create the document
  const createResponse = await fetch("https://docs.googleapis.com/v1/documents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: docTitle,
    }),
  });

  if (!createResponse.ok) {
    const errorData = await createResponse.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to create Google Doc: ${createResponse.statusText}`);
  }

  const doc = await createResponse.json();
  const documentId = doc.documentId;

  // 2. Build the comprehensive specification content (approx. 3/4 to 1 full page)
  const content = `EVAL & TRAJECTORY DIAGNOSTICS WORKSPACE
TECHNICAL SPECIFICATION AND SYSTEM DESIGN MANUAL

1. EXECUTIVE SUMMARY & MISSION VISION
In the rapidly evolving landscape of Large Language Models (LLMs) and agentic architectures, identifying, diagnosing, and organizing system failures is the single greatest bottleneck to deploying robust, production-grade applications. The "Eval & Trajectory Diagnostics Workspace" is a state-of-the-art developer platform engineered to bridge this gap.

By analyzing real-world developer logs, taxonomic classifications, and correction prompts, this application provides an interactive, end-to-end sandbox. Developers can ingest historical execution runs, map failures to taxonomic labels, examine granular system traces, and automatically compile clustered evaluation suites to prevent regression and safeguard operational alignment.

2. THE FAILURE TAXONOMY PIPELINE (THE WILDFB TAXONOMY)
At the heart of the workspace is a rigorous classification pipeline based on the THU-KEG/WildFB framework. Rather than treating failures as binary outcomes, our system maps developer corrections to taxonomic tiers:

* Level 1 (Negative Constraint Violation): The model failed to follow strict exclusions, formatting bans, word-count constraints, or structural limits. For example, outputting the 'eval' function in python when security rules forbade it, or failing to exclude certain geographic regions in recommendations.
* Level 2 (Logical Premise Negation): The model failed in raw analytical reasoning, mathematical subtraction, or logical assumptions (e.g., misinterpreting sheep counts in classical word puzzles), requiring a direct logical correction.
* Level 3 (Instruction Compliance Deviation): The model outputted generic, under-detailed, or format-incorrect answers that missed key aspects of the prompt parameters.
* Level 4 (Aligned Resolution): The user's prompt or correction has successfully steered the model to correct its mistakes, establishing a target profile for future fine-tuning.

3. DETAILED SYSTEM COMPONENTS & FUNCTIONAL WORKFLOWS
The application decomposes developer diagnostics into three primary interactive visual modules:

A. Conversation History & WildFB Catalog: Displays chronological lists of LLM outputs and correction events, decorated with taxonomic tags and visual filters (e.g., filtering by Label 2 to isolate negative constraint failures).
B. Trajectory Viewer (Trace Diagnostics): Reconstructs the agent's internal timeline. It represents the granular sequence of "Thought" processes, "Tool Calls" (e.g., database queries or filesystem operations with arguments), "Observations" (terminal or query outputs), and the final "Assistant Response." This helps developers identify exactly where the model's reasoning drifted from the target constraints.
C. AI-Powered Evaluation Suite Synthesizer: By grouping related failures, developers can trigger our automated compiler. This engine groups common failure modalities into named clusters (such as "Logical Reasoning and Code Quality Failures" and "Negative Constraint Deviations") and synthesizes fully-fledged test cases. Each test case features a highly challenging system prompt, a targeted expected outcome, and a multi-step objective grading rubric to programmatically verify future releases.

4. SYSTEM ARCHITECTURE & HIGH-AVAILABILITY FAULT TOLERANCE
To ensure zero-downtime developer workflows and seamless enterprise integration, the platform implements a dual-layer architectural model:
- Frontend: Single-Page Application (SPA) built on React 18, Vite, and Tailwind CSS. Responsive designs provide detailed workspace splits, while Lucide React provides modern telemetry iconography.
- Backend Services: An Express custom server proxying requests safely to the server-side Gemini API (using the modern @google/genai SDK) to protect API keys.
- Intelligent Fallbacks & Exponential Backoff: Given high-demand APIs, the backend features an automated fallback heuristic analyzer. If Gemini experiences transient outages (HTTP 503), the server retries with jittered exponential backoff. If the outage persists, the system generates high-fidelity synthesized traces and test-suite clusters offline, ensuring uninterrupted app responsiveness and continuous continuous-integration runs.
`;

  // 3. Insert the text using batchUpdate
  const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests: [
        {
          insertText: {
            text: content,
            location: {
              index: 1,
            },
          },
        },
      ],
    }),
  });

  if (!updateResponse.ok) {
    const errorData = await updateResponse.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to write content to Google Doc: ${updateResponse.statusText}`);
  }

  return {
    documentId,
    documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
    title: docTitle,
  };
}
