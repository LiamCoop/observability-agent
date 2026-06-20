import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { appendTimeRange, runGcx, withOutput } from "./command";

const outputSchema = z.enum(["json", "graph"]);

export const queryMetricsTool = tool(
  async ({ datasourceUid, query, from, to, step, time, output }) => {
    const baseArgs = appendTimeRange(["metrics", "query", "-d", datasourceUid, query], { from, to, step, time });
    const { args, parseJson } = withOutput(baseArgs, output ?? "json");
    return runGcx(args, parseJson);
  },
  {
    name: "gcx_query_metrics",
    description:
      "Run a PromQL instant or range query against a Prometheus datasource via gcx. Use for up checks, error rates, latency, absent/data-gap checks, status-code breakdowns, and point-in-time comparisons. Use output=json for analysis and output=graph when sharing a visualization.",
    schema: z.object({
      datasourceUid: z.string().describe("Prometheus datasource UID from gcx_list_datasources."),
      query: z.string().describe("PromQL query."),
      from: z.string().optional().describe("Start time for range queries, e.g. now-1h or an RFC3339 timestamp. Do not combine with time."),
      to: z.string().optional().describe("End time for range queries, e.g. now. Do not combine with time."),
      step: z.string().optional().describe("Range-query step, e.g. 1m or 5m."),
      time: z.string().optional().describe("Instant query evaluation time, e.g. now-1h or RFC3339. Mutually exclusive with from/to."),
      output: outputSchema.optional().describe("json for machine analysis or graph for visualization."),
    }),
  }
);

export const listMetricLabelValuesTool = tool(
  async ({ datasourceUid, label }) => {
    const args = ["metrics", "labels", "-d", datasourceUid];
    if (label) args.push("-l", label);
    args.push("-o", "json");
    return runGcx(args);
  },
  {
    name: "gcx_list_metric_label_values",
    description:
      "List Prometheus metric labels or values through gcx. Omit label to list label names; pass label (commonly job, instance, code, status) to list values before running service-specific PromQL.",
    schema: z.object({
      datasourceUid: z.string().describe("Prometheus datasource UID."),
      label: z.string().optional().describe("Optional metric label name. Omit to list all available label names."),
    }),
  }
);

export const getMetricMetadataTool = tool(
  async ({ datasourceUid, metric }) => {
    const args = ["metrics", "metadata", "-d", datasourceUid];
    if (metric) args.push("-m", metric);
    args.push("-o", "json");
    return runGcx(args);
  },
  {
    name: "gcx_get_metric_metadata",
    description:
      "Get Prometheus metric metadata through gcx. Use when a query returns empty results to verify whether a metric exists and how it is described.",
    schema: z.object({
      datasourceUid: z.string().describe("Prometheus datasource UID."),
      metric: z.string().optional().describe("Optional metric name, e.g. http_requests_total. Omit to return available metadata."),
    }),
  }
);
