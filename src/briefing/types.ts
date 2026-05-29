export interface BriefDocument {
  id: string;
  title: string;
  source: string;
  updatedAt: string;
  tags: string[];
  summary: string;
  keySignals: string[];
  notes: string[];
}

export interface BriefingRequest {
  topic: string;
  audience: string;
  limit: number;
  live: boolean;
}

export interface BriefingTraceEvent {
  timestamp: string;
  name: string;
  attributes: Record<string, string | number | boolean | null>;
}

export interface BriefingResult {
  mode: "live" | "mock";
  markdown: string;
  briefIds: string[];
  durationMs: number;
  trace: BriefingTraceEvent[];
}

export interface EvalScenario {
  id: string;
  topic: string;
  audience: string;
  expectedTerms: string[];
}

export interface EvalResult {
  scenarioId: string;
  passed: boolean;
  score: number;
  reasons: string[];
}
