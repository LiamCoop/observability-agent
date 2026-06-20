import { listDatasourcesTool } from "../../tools/gcx";
import type { DebugWithGrafanaStateType } from "../state";
import { extractDatasources, finding, firstDatasourceUid, invokeGcxTool } from "./utils";

export async function discoverDatasourcesNode(_state: DebugWithGrafanaStateType) {
  const all = await invokeGcxTool(listDatasourcesTool, {});
  const prometheus = await invokeGcxTool(listDatasourcesTool, { type: "prometheus" });
  const loki = await invokeGcxTool(listDatasourcesTool, { type: "loki" });
  const tempo = await invokeGcxTool(listDatasourcesTool, { type: "tempo" });

  const datasources = extractDatasources(all.output);
  const prometheusUid = firstDatasourceUid(prometheus.output);
  const lokiUid = firstDatasourceUid(loki.output);
  const tempoUid = firstDatasourceUid(tempo.output);

  return {
    datasources,
    prometheusUid,
    lokiUid,
    tempoUid,
    toolCalls: [all.record, prometheus.record, loki.record, tempo.record],
    findings: [
      finding(
        "discover_datasources",
        `Discovered datasource UIDs: prometheus=${prometheusUid ?? "missing"}, loki=${lokiUid ?? "missing"}, tempo=${tempoUid ?? "missing"}.`,
        { datasources }
      ),
    ],
  };
}
