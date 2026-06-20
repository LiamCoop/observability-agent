import { listLogLabelValuesTool, listLogSeriesTool, listMetricLabelValuesTool, queryMetricsTool } from "../../tools/gcx";
import type { DebugWithGrafanaStateType } from "../state";
import { finding, invokeGcxTool } from "./utils";

export async function confirmDataAvailabilityNode(state: DebugWithGrafanaStateType) {
  const calls = [];
  let metricJobLabels: unknown;
  let logJobLabels: unknown;
  let uptime: unknown;
  let serviceUptime: unknown;
  let logSeries: unknown;

  if (state.prometheusUid) {
    const up = await invokeGcxTool(queryMetricsTool, {
      datasourceUid: state.prometheusUid,
      query: "up",
      output: "json",
    });
    calls.push(up.record);
    uptime = up.output;

    const jobs = await invokeGcxTool(listMetricLabelValuesTool, {
      datasourceUid: state.prometheusUid,
      label: "job",
    });
    calls.push(jobs.record);
    metricJobLabels = jobs.output;

    const serviceUp = await invokeGcxTool(queryMetricsTool, {
      datasourceUid: state.prometheusUid,
      query: `up{job="${state.serviceName}"}`,
      output: "json",
    });
    calls.push(serviceUp.record);
    serviceUptime = serviceUp.output;
  }

  if (state.lokiUid) {
    const jobs = await invokeGcxTool(listLogLabelValuesTool, {
      datasourceUid: state.lokiUid,
      label: "job",
    });
    calls.push(jobs.record);
    logJobLabels = jobs.output;

    const series = await invokeGcxTool(listLogSeriesTool, {
      datasourceUid: state.lokiUid,
      matcher: `{job="${state.serviceName}"}`,
    });
    calls.push(series.record);
    logSeries = series.output;
  }

  const availability = { uptime, serviceUptime, logSeries };
  return {
    metricJobLabels,
    logJobLabels,
    availability,
    toolCalls: calls,
    findings: [
      finding("confirm_data_availability", `Checked scrape status and log streams for service ${state.serviceName}.`, availability),
    ],
  };
}
