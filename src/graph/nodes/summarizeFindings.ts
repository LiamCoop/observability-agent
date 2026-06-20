import { getInvestigationModel, getInvestigationModelName } from "../../llm/investigationModel";
import type { DebugWithGrafanaStateType } from "../state";

const MAX_EVIDENCE_CHARS = 40_000;

function truncate(value: string, maxChars = MAX_EVIDENCE_CHARS): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n... [truncated ${value.length - maxChars} chars]`;
}

function stringifyEvidence(value: unknown): string {
  try {
    return truncate(JSON.stringify(value, null, 2));
  } catch {
    return truncate(String(value));
  }
}

function contentToString(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) return String(part.text);
        return JSON.stringify(part);
      })
      .join("\n");
  }
  return String(content);
}

export async function summarizeFindingsNode(state: DebugWithGrafanaStateType) {
  const completedSteps = state.findings.map((item) => `- ${item.step}: ${item.summary}`).join("\n");
  const model = getInvestigationModel();
  const modelName = getInvestigationModelName();

  const response = await model.invoke([
    {
      role: "system",
      content: [
        "You are an on-call observability assistant summarizing a Grafana alert investigation.",
        "Use only the evidence provided by the LangGraph workflow; do not invent metric values, trace details, or causes.",
        "If evidence is missing or inconclusive, say so explicitly.",
        "Return a concise incident summary with: status, key evidence, likely root-cause hypothesis, confidence, and recommended next actions.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `Model: ${modelName}`,
        `Service: ${state.serviceName}`,
        `Time window: ${state.from} to ${state.to}`,
        `Datasources: prometheus=${state.prometheusUid ?? "missing"}, loki=${state.lokiUid ?? "missing"}, tempo=${state.tempoUid ?? "missing"}`,
        "",
        "Completed diagnostic workflow:",
        completedSteps || "- No findings recorded.",
        "",
        "Evidence JSON:",
        stringifyEvidence({
          availability: state.availability,
          errorRates: state.errorRates,
          latency: state.latency,
          logs: state.logs,
          traces: state.traces,
          resources: state.resources,
          findings: state.findings,
        }),
      ].join("\n"),
    },
  ]);

  return { summary: contentToString(response.content) };
}
