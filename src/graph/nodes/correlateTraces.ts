import { listTraceLabelsTool, listTraceTagValuesTool, queryTracesTool } from "../../tools/gcx";
import type { DebugWithGrafanaStateType } from "../state";
import { finding, invokeGcxTool } from "./utils";

export async function correlateTracesNode(state: DebugWithGrafanaStateType) {
  if (!state.tempoUid) {
    return {
      findings: [finding("correlate_traces", "Skipped trace correlation because no Tempo datasource was discovered.")],
    };
  }

  const labels = await invokeGcxTool(listTraceLabelsTool, {
    datasourceUid: state.tempoUid,
    scope: "resource",
  });
  const services = await invokeGcxTool(listTraceTagValuesTool, {
    datasourceUid: state.tempoUid,
    label: "resource.service.name",
  });
  const serviceTraces = await invokeGcxTool(queryTracesTool, {
    datasourceUid: state.tempoUid,
    query: `{ resource.service.name = "${state.serviceName}" }`,
    from: state.from,
    to: state.to,
  });
  const errorTraces = await invokeGcxTool(queryTracesTool, {
    datasourceUid: state.tempoUid,
    query: `{ resource.service.name = "${state.serviceName}" && status = error }`,
    from: state.from,
    to: state.to,
  });
  const slowTraces = await invokeGcxTool(queryTracesTool, {
    datasourceUid: state.tempoUid,
    query: `{ resource.service.name = "${state.serviceName}" && duration > 1s }`,
    from: state.from,
    to: state.to,
  });

  const traces = {
    labels: labels.output,
    services: services.output,
    serviceTraces: serviceTraces.output,
    errorTraces: errorTraces.output,
    slowTraces: slowTraces.output,
  };

  return {
    traces,
    toolCalls: [labels.record, services.record, serviceTraces.record, errorTraces.record, slowTraces.record],
    findings: [finding("correlate_traces", `Searched Tempo for service, error, and slow traces for ${state.serviceName}.`, traces)],
  };
}
