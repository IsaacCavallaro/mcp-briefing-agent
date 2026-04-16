import type { BriefDocument } from "./types.js";

export const briefingLibrary: BriefDocument[] = [
  {
    id: "responses-api",
    title: "Responses API becomes the default agent loop",
    source: "OpenAI developer docs",
    updatedAt: "2026-04-16",
    tags: ["openai", "responses", "tools", "agents"],
    summary:
      "The Responses API unifies multi-step reasoning, tool calling, and stateful interaction patterns into one endpoint that is better aligned with agent workflows than single-shot chat wrappers.",
    keySignals: [
      "Teams are standardizing on one orchestration surface instead of stitching multiple endpoints together.",
      "Tool calls are now a first-class part of product architecture, not an optional extra.",
      "State and iteration matter more than prompt cleverness."
    ],
    notes: [
      "Good repos show the loop around tool calls, not just the final completion request.",
      "A public repo should make the handoff between model reasoning and tool execution easy to audit."
    ]
  },
  {
    id: "mcp-protocol",
    title: "MCP defines the context boundary",
    source: "Model Context Protocol docs",
    updatedAt: "2026-04-16",
    tags: ["mcp", "protocol", "tools", "resources"],
    summary:
      "Model Context Protocol gives AI systems a standard interface for tools, prompts, and resources, making integrations more portable than bespoke app-specific connectors.",
    keySignals: [
      "MCP is becoming the cleanest way to separate application context from model orchestration.",
      "Standard tool surfaces reduce bespoke glue code and make demos easier to trust.",
      "Engineers who understand MCP can move faster across vendors and clients."
    ],
    notes: [
      "A robust implementation usually includes one real server and one real client path.",
      "The protocol is especially persuasive when used to guard access to a useful but constrained knowledge surface."
    ]
  },
  {
    id: "evals-first",
    title: "Evals are replacing vibe checks",
    source: "OpenAI developer docs",
    updatedAt: "2026-04-16",
    tags: ["evals", "quality", "reliability", "agents"],
    summary:
      "Agentic systems need repeatable scoring and regression checks because success depends on tool use, structure, and behavior over multiple steps, not just a nice-sounding answer.",
    keySignals: [
      "Teams are increasingly treating evals as part of application code, not a later research exercise.",
      "Simple contract checks catch regressions earlier than ad hoc manual prompting.",
      "Lightweight evaluators catch regressions early and make behavior easier to inspect."
    ],
    notes: [
      "You do not need a huge framework to prove the habit; a small scenario runner is enough.",
      "A useful eval checks structure, coverage, and actionability, not only tone."
    ]
  },
  {
    id: "ai-engineering-market",
    title: "The market rewards systems thinking",
    source: "GitHub ecosystem signals",
    updatedAt: "2026-04-16",
    tags: ["market", "typescript", "architecture", "teams"],
    summary:
      "Teams increasingly value AI systems that combine product judgment, infrastructure boundaries, and workflow reliability rather than a thin wrapper around a single model call.",
    keySignals: [
      "Small polished systems are easier to audit, explain, and extend than sprawling experiments.",
      "TypeScript remains a strong public language for AI demos because it communicates product and platform fluency.",
      "Operational quality, docs, and command ergonomics affect trust as much as model choice."
    ],
    notes: [
      "A repo should answer what problem it solves, how the model is used, and how quality is checked.",
      "The fastest way to look current is to show tools, protocols, and evaluation discipline in one place."
    ]
  }
];

function scoreDocument(document: BriefDocument, queryTerms: string[]): number {
  const haystack = [
    document.title,
    document.summary,
    document.source,
    ...document.tags,
    ...document.keySignals,
    ...document.notes
  ]
    .join(" ")
    .toLowerCase();

  return queryTerms.reduce((score, term) => {
    if (!term) {
      return score;
    }

    if (haystack.includes(term)) {
      return score + 3;
    }

    if (document.tags.some((tag) => tag.includes(term))) {
      return score + 2;
    }

    return score;
  }, 0);
}

export function searchBriefs(query: string, limit = 3): BriefDocument[] {
  const queryTerms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);

  return [...briefingLibrary]
    .map((document) => ({
      document,
      score: scoreDocument(document, queryTerms)
    }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map((item) => item.document);
}

export function getBrief(id: string): BriefDocument | undefined {
  return briefingLibrary.find((document) => document.id === id);
}

export function getCatalog(): Array<Pick<BriefDocument, "id" | "title" | "source" | "tags">> {
  return briefingLibrary.map(({ id, title, source, tags }) => ({
    id,
    title,
    source,
    tags
  }));
}
