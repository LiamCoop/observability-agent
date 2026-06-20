import { queryMetricsTool } from "../../tools/gcx";
import type { DebugWithGrafanaStateType } from "../state";
import { finding, invokeGcxTool } from "./utils";

export async function queryErrorRatesNode(state: DebugWithGrafanaStateType) {
  if (!state.prometheusUid) {
    return {
      findings: [finding("query_error_rates", "Skipped error-rate queries because no Prometheus datasource was discovered.")],
    };
  }

  const base = { datasourceUid: state.prometheusUid, from: state.from, to: state.to, step: state.step };
  const errorRate = await invokeGcxTool(queryMetricsTool, {
    ...base,
    query: `rate(http_requests_total{job="${state.serviceName}",status=~"5.."}[5m])`,
    output: "json",
  });
  const errorRatio = await invokeGcxTool(queryMetricsTool, {
    ...base,
    query: `rate(http_requests_total{job="${state.serviceName}",status=~"5.."}[5m]) / rate(http_requests_total{job="${state.serviceName}"}[5m])`,
    output: "json",
  });
  const statusBreakdown = await invokeGcxTool(queryMetricsTool, {
    ...base,
    query: `sum by(status) (rate(http_requests_total{job="${state.serviceName}"}[5m]))`,
    output: "json",
  });

  const errorRates = {
    errorRate: errorRate.output,
    errorRatio: errorRatio.output,
    statusBreakdown: statusBreakdown.output,
  };

  return {
    errorRates,
    toolCalls: [errorRate.record, errorRatio.record, statusBreakdown.record],
    findings: [finding("query_error_rates", `Queried HTTP 5xx rate, error ratio, and status-code breakdown for ${state.serviceName}.`, errorRates)],
  };
}
