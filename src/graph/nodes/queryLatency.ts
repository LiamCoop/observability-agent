import { queryMetricsTool } from "../../tools/gcx";
import type { DebugWithGrafanaStateType } from "../state";
import { finding, invokeGcxTool } from "./utils";

export async function queryLatencyNode(state: DebugWithGrafanaStateType) {
  if (!state.prometheusUid) {
    return {
      findings: [finding("query_latency", "Skipped latency queries because no Prometheus datasource was discovered.")],
    };
  }

  const base = { datasourceUid: state.prometheusUid, from: state.from, to: state.to, step: state.step };
  const p95 = await invokeGcxTool(queryMetricsTool, {
    ...base,
    query: `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="${state.serviceName}"}[5m]))`,
    output: "json",
  });
  const average = await invokeGcxTool(queryMetricsTool, {
    ...base,
    query: `rate(http_request_duration_seconds_sum{job="${state.serviceName}"}[5m]) / rate(http_request_duration_seconds_count{job="${state.serviceName}"}[5m])`,
    output: "json",
  });
  const byEndpoint = await invokeGcxTool(queryMetricsTool, {
    ...base,
    query: `histogram_quantile(0.95, sum by(le, handler) (rate(http_request_duration_seconds_bucket{job="${state.serviceName}"}[5m])))`,
    output: "json",
  });

  const latency = { p95: p95.output, average: average.output, byEndpoint: byEndpoint.output };

  return {
    latency,
    toolCalls: [p95.record, average.record, byEndpoint.record],
    findings: [finding("query_latency", `Queried P95, average, and handler-level latency for ${state.serviceName}.`, latency)],
  };
}
