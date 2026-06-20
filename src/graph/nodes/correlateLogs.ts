import { queryLogsTool } from "../../tools/gcx";
import type { DebugWithGrafanaStateType } from "../state";
import { finding, invokeGcxTool } from "./utils";

export async function correlateLogsNode(state: DebugWithGrafanaStateType) {
  if (!state.lokiUid) {
    return {
      findings: [finding("correlate_logs", "Skipped log correlation because no Loki datasource was discovered.")],
    };
  }

  const base = { datasourceUid: state.lokiUid, from: state.from, to: state.to };
  const errorText = await invokeGcxTool(queryLogsTool, {
    ...base,
    query: `{job="${state.serviceName}"} |= "error"`,
    output: "json",
  });
  const structuredErrors = await invokeGcxTool(queryLogsTool, {
    ...base,
    query: `{job="${state.serviceName}"} | json | level="error"`,
    output: "json",
  });
  const logErrorRate = await invokeGcxTool(queryLogsTool, {
    ...base,
    step: state.step,
    query: `sum(count_over_time({job="${state.serviceName}"} |= "error" [5m]))`,
    output: "json",
  });
  const patterns = await invokeGcxTool(queryLogsTool, {
    ...base,
    query: `{job="${state.serviceName}"} |~ "timeout|connection refused|OOM|panic"`,
    output: "json",
  });

  const logs = {
    errorText: errorText.output,
    structuredErrors: structuredErrors.output,
    logErrorRate: logErrorRate.output,
    patterns: patterns.output,
  };

  return {
    logs,
    toolCalls: [errorText.record, structuredErrors.record, logErrorRate.record, patterns.record],
    findings: [finding("correlate_logs", `Queried Loki for error messages, structured errors, log error counts, and failure patterns for ${state.serviceName}.`, logs)],
  };
}
