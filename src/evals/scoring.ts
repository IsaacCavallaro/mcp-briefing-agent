import type { EvalResult } from "../briefing/types.js";

export function scoreScenario(markdown: string, expectedTerms: string[]): Omit<EvalResult, "scenarioId"> {
  const checks = [
    { label: "has executive summary heading", pass: markdown.includes("## Executive Summary") },
    { label: "has key signals heading", pass: markdown.includes("## Key Signals") },
    { label: "has source notes heading", pass: markdown.includes("## Source Notes") },
    { label: "has at least three bullet points", pass: (markdown.match(/^- /gm) ?? []).length >= 3 },
    {
      label: "covers expected terms",
      pass: expectedTerms.filter((term) => markdown.toLowerCase().includes(term.toLowerCase())).length >= 2
    }
  ];

  const passedChecks = checks.filter((check) => check.pass).length;
  const score = Math.round((passedChecks / checks.length) * 100);

  return {
    passed: score >= 80,
    score,
    reasons: checks.filter((check) => !check.pass).map((check) => check.label)
  };
}
