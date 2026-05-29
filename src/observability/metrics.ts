type Labels = Record<string, string | number | boolean>;

interface MetricKey {
  name: string;
  labels: Labels;
}

function keyFor(name: string, labels: Labels = {}): string {
  return JSON.stringify({
    name,
    labels: Object.fromEntries(Object.entries(labels).sort(([left], [right]) => left.localeCompare(right)))
  });
}

function formatLabels(labels: Labels): string {
  const entries = Object.entries(labels);
  if (entries.length === 0) {
    return "";
  }

  return `{${entries
    .map(([key, value]) => `${key}="${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`)
    .join(",")}}`;
}

function parseKey(raw: string): MetricKey {
  return JSON.parse(raw) as MetricKey;
}

export class InMemoryMetrics {
  private readonly counters = new Map<string, number>();
  private readonly durations = new Map<string, { count: number; sum: number }>();
  private readonly startedAt = Date.now();

  increment(name: string, labels: Labels = {}, amount = 1): void {
    const key = keyFor(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + amount);
  }

  observeDuration(name: string, durationMs: number, labels: Labels = {}): void {
    const key = keyFor(name, labels);
    const current = this.durations.get(key) ?? { count: 0, sum: 0 };
    this.durations.set(key, {
      count: current.count + 1,
      sum: current.sum + durationMs / 1000
    });
  }

  renderPrometheus(): string {
    const lines = [
      "# HELP briefing_agent_uptime_seconds Seconds since the HTTP service started.",
      "# TYPE briefing_agent_uptime_seconds gauge",
      `briefing_agent_uptime_seconds ${Math.round((Date.now() - this.startedAt) / 1000)}`
    ];

    const counterNames = new Set([...this.counters.keys()].map((rawKey) => parseKey(rawKey).name));
    for (const name of counterNames) {
      lines.push(`# HELP ${name} Counter emitted by the local briefing agent.`);
      lines.push(`# TYPE ${name} counter`);
    }

    for (const [rawKey, value] of this.counters.entries()) {
      const { name, labels } = parseKey(rawKey);
      lines.push(`${name}${formatLabels(labels)} ${value}`);
    }

    const durationNames = new Set([...this.durations.keys()].map((rawKey) => parseKey(rawKey).name));
    for (const name of durationNames) {
      lines.push(`# HELP ${name} Duration summary emitted by the local briefing agent.`);
      lines.push(`# TYPE ${name} summary`);
    }

    for (const [rawKey, value] of this.durations.entries()) {
      const { name, labels } = parseKey(rawKey);
      lines.push(`${name}_count${formatLabels(labels)} ${value.count}`);
      lines.push(`${name}_sum${formatLabels(labels)} ${value.sum.toFixed(3)}`);
    }

    return `${lines.join("\n")}\n`;
  }
}

export const metrics = new InMemoryMetrics();
