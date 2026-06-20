export { viewGcxConfigTool } from "./config";
export { listDatasourcesTool } from "./listDatasources";
export { queryMetricsTool, listMetricLabelValuesTool } from "./metrics";
export { queryLogsTool, listLogLabelValuesTool, listLogSeriesTool } from "./logs";
export { queryTracesTool, getTraceTool, listTraceLabelsTool, listTraceTagValuesTool } from "./traces";
export { listAlertRulesTool } from "./alerts";
export { getResourceTool, pullResourcesTool } from "./resources";
export { snapshotDashboardTool } from "./dashboards";

export const gcxToolNames = [
  "gcx_view_config",
  "gcx_list_datasources",
  "gcx_query_metrics",
  "gcx_list_metric_label_values",
  "gcx_query_logs",
  "gcx_list_log_label_values",
  "gcx_list_log_series",
  "gcx_query_traces",
  "gcx_get_trace",
  "gcx_list_trace_labels",
  "gcx_list_trace_tag_values",
  "gcx_list_alert_rules",
  "gcx_get_resource",
  "gcx_pull_resources",
  "gcx_snapshot_dashboard",
] as const;
