import { Annotation } from "@langchain/langgraph";

export type DatasourceSummary = {
  uid: string;
  name?: string;
  type: "prometheus" | "loki" | "tempo" | string;
};

export type ToolCallRecord = {
  tool: string;
  input: unknown;
  output?: unknown;
  error?: string;
};

export type DiagnosticFinding = {
  step: string;
  summary: string;
  evidence?: unknown;
};

export const DebugWithGrafanaState = Annotation.Root({
  serviceName: Annotation<string>,
  from: Annotation<string>({ value: (_current, update) => update, default: () => "now-1h" }),
  to: Annotation<string>({ value: (_current, update) => update, default: () => "now" }),
  step: Annotation<string>({ value: (_current, update) => update, default: () => "1m" }),

  datasources: Annotation<DatasourceSummary[]>({ value: (_current, update) => update, default: () => [] }),
  prometheusUid: Annotation<string | undefined>,
  lokiUid: Annotation<string | undefined>,
  tempoUid: Annotation<string | undefined>,

  metricJobLabels: Annotation<unknown>,
  logJobLabels: Annotation<unknown>,
  availability: Annotation<unknown>,
  errorRates: Annotation<unknown>,
  latency: Annotation<unknown>,
  logs: Annotation<unknown>,
  traces: Annotation<unknown>,
  resources: Annotation<unknown>,

  findings: Annotation<DiagnosticFinding[]>({
    value: (current, update) => current.concat(update),
    default: () => [],
  }),
  toolCalls: Annotation<ToolCallRecord[]>({
    value: (current, update) => current.concat(update),
    default: () => [],
  }),
  summary: Annotation<string>,
});

export type DebugWithGrafanaStateType = typeof DebugWithGrafanaState.State;
