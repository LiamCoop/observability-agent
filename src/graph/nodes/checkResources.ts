import { getResourceTool, listAlertRulesTool, pullResourcesTool } from "../../tools/gcx";
import type { DebugWithGrafanaStateType } from "../state";
import { finding, invokeGcxTool } from "./utils";

export async function checkResourcesNode(state: DebugWithGrafanaStateType) {
  const alerts = await invokeGcxTool(listAlertRulesTool, {});
  const dashboards = await invokeGcxTool(getResourceTool, { resource: "dashboards" });
  const pulledDashboards = await invokeGcxTool(pullResourcesTool, { resourceType: "dashboards" });

  const resources = {
    alerts: alerts.output,
    dashboards: dashboards.output,
    pulledDashboards: pulledDashboards.output,
  };

  return {
    resources,
    toolCalls: [alerts.record, dashboards.record, pulledDashboards.record],
    findings: [finding("check_resources", `Checked alert rules and dashboards for context related to ${state.serviceName}.`, resources)],
  };
}
