import { END, START, StateGraph } from "@langchain/langgraph";
import { DebugWithGrafanaState } from "./state";
import {
  checkResourcesNode,
  confirmDataAvailabilityNode,
  correlateLogsNode,
  correlateTracesNode,
  discoverDatasourcesNode,
  queryErrorRatesNode,
  queryLatencyNode,
  summarizeFindingsNode,
} from "./nodes";

export const DEBUG_WITH_GRAFANA_NODE_NAMES = {
  discoverDatasources: "discover_datasources",
  confirmDataAvailability: "confirm_data_availability",
  queryErrorRates: "query_error_rates",
  queryLatency: "query_latency",
  correlateLogs: "correlate_logs",
  correlateTraces: "correlate_traces",
  checkResources: "check_resources",
  summarizeFindings: "summarize_findings",
} as const;

export function createDebugWithGrafanaGraph() {
  return new StateGraph(DebugWithGrafanaState)
    .addNode(DEBUG_WITH_GRAFANA_NODE_NAMES.discoverDatasources, discoverDatasourcesNode)
    .addNode(DEBUG_WITH_GRAFANA_NODE_NAMES.confirmDataAvailability, confirmDataAvailabilityNode)
    .addNode(DEBUG_WITH_GRAFANA_NODE_NAMES.queryErrorRates, queryErrorRatesNode)
    .addNode(DEBUG_WITH_GRAFANA_NODE_NAMES.queryLatency, queryLatencyNode)
    .addNode(DEBUG_WITH_GRAFANA_NODE_NAMES.correlateLogs, correlateLogsNode)
    .addNode(DEBUG_WITH_GRAFANA_NODE_NAMES.correlateTraces, correlateTracesNode)
    .addNode(DEBUG_WITH_GRAFANA_NODE_NAMES.checkResources, checkResourcesNode)
    .addNode(DEBUG_WITH_GRAFANA_NODE_NAMES.summarizeFindings, summarizeFindingsNode)
    .addEdge(START, DEBUG_WITH_GRAFANA_NODE_NAMES.discoverDatasources)
    .addEdge(DEBUG_WITH_GRAFANA_NODE_NAMES.discoverDatasources, DEBUG_WITH_GRAFANA_NODE_NAMES.confirmDataAvailability)
    .addEdge(DEBUG_WITH_GRAFANA_NODE_NAMES.confirmDataAvailability, DEBUG_WITH_GRAFANA_NODE_NAMES.queryErrorRates)
    .addEdge(DEBUG_WITH_GRAFANA_NODE_NAMES.queryErrorRates, DEBUG_WITH_GRAFANA_NODE_NAMES.queryLatency)
    .addEdge(DEBUG_WITH_GRAFANA_NODE_NAMES.queryLatency, DEBUG_WITH_GRAFANA_NODE_NAMES.correlateLogs)
    .addEdge(DEBUG_WITH_GRAFANA_NODE_NAMES.correlateLogs, DEBUG_WITH_GRAFANA_NODE_NAMES.correlateTraces)
    .addEdge(DEBUG_WITH_GRAFANA_NODE_NAMES.correlateTraces, DEBUG_WITH_GRAFANA_NODE_NAMES.checkResources)
    .addEdge(DEBUG_WITH_GRAFANA_NODE_NAMES.checkResources, DEBUG_WITH_GRAFANA_NODE_NAMES.summarizeFindings)
    .addEdge(DEBUG_WITH_GRAFANA_NODE_NAMES.summarizeFindings, END)
    .compile();
}

export const debugWithGrafanaGraph = createDebugWithGrafanaGraph();
