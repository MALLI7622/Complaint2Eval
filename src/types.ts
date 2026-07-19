export type WildFBLabelType = 1 | 2 | 3 | 4;

export interface Conversation {
  id: string;
  title: string;
  originalRequest: string;
  badResponse: string;
  userCorrection: string;
  wildfbLabel?: WildFBLabelType;
  history?: { role: string; content: string }[];
}

export interface Evaluation {
  failureCategory: string;
  correctionType: string;
  expectedBehavior: string;
  evaluationCriteria: string[];
  verifierType: string;
  confidenceScore: number; // 0 - 100
  wildfbLabel?: WildFBLabelType;
  wildfbAnalysis?: string;
}

export interface SuiteTestCase {
  title: string;
  prompt: string;
  expectedOutcome: string;
  rubric: string;
}

export interface SuiteCluster {
  name: string;
  description: string;
  count: number;
  testCases: SuiteTestCase[];
}

export interface EvalSuite {
  summary: string;
  clusters: SuiteCluster[];
}

export interface TrajectoryStep {
  index: number;
  type: "user" | "thought" | "tool_call" | "observation" | "assistant" | "system";
  title: string;
  content: string;
  toolName?: string;
  arguments?: Record<string, any>;
  durationMs?: number;
  tokenUsage?: number;
}
