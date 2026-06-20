import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { appendTimeRange, runGcx, withOutput } from "./command";

const outputSchema = z.enum(["json", "graph"]);

export const queryMetricsTool = tool(
  async ({ datasourceUid, query, from, to, step, output }) => {
    const baseArgs = appendTimeRange(["metrics", "query", "-d", datasourceUid, query], { from, to, step });
    const { args, parseJson } = withOutput(baseArgs, output ?? "json");
    return runGcx(args, parseJson);
  },
  {
    name: "gcx_query_metrics",
    description:
      "Run a PromQL instant or range query against a Prometheus datasource via gcx. Use for up checks, error rates, latency, absent/data-gap checks, and status-code breakdowns. Use output=json for analysis and output=graph when sharing a visualization.",
    schema: z.object({
      datasourceUid: z.string().describe("Prometheus datasource UID from gcx_list_datasources."),
      query: z.string().describe("PromQL query."),
      from: z.string().optional().describe("Start time, e.g. now-1h or an RFC3339 timestamp."),
      to: z.string().optional().describe("End time, e.g. now."),
      step: z.string().optional().describe("Range-query step, e.g. 1m or 5m."),
      output: outputSchema.optional().describe("json for machine analysis or graph for visualization."),
    }),
  }
);

export const listMetricLabelValuesTool = tool(
  async ({ datasourceUid, label }) => runGcx(["metrics", "labels", "-d", datasourceUid, "-l", label, "-o", "json"]),
  {
    name: "gcx_list_metric_label_values",
    description:
      "List Prometheus metric label values through gcx. Use to confirm the service/job label exists before running service-specific PromQL.",
    schema: z.object({
      datasourceUid: z.string().describe("Prometheus datasource UID."),
      label: z.string().describe("Metric label name, commonly job."),
    }),
  }
);
