import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { appendTimeRange, runGcx, withOutput } from "./command";

const logOutputSchema = z.enum(["json", "graph", "wide"]);

export const queryLogsTool = tool(
  async ({ datasourceUid, query, from, to, step, output }) => {
    const baseArgs = appendTimeRange(["logs", "query", "-d", datasourceUid, query], { from, to, step });
    const { args, parseJson } = withOutput(baseArgs, output ?? "json");
    return runGcx(args, parseJson);
  },
  {
    name: "gcx_query_logs",
    description:
      "Run a LogQL query against a Loki datasource via gcx. Use to correlate service error logs, structured error logs, log-derived rates, and crash/timeout patterns with metric spikes. Always include at least one non-empty label matcher in the LogQL selector. Use output=graph for log metric visualizations and output=wide for label-rich log tables.",
    schema: z.object({
      datasourceUid: z.string().describe("Loki datasource UID from gcx_list_datasources."),
      query: z.string().describe("LogQL query, e.g. {job=\"api\"} |= \"error\"."),
      from: z.string().optional().describe("Start time, e.g. now-1h."),
      to: z.string().optional().describe("End time, e.g. now."),
      step: z.string().optional().describe("Step for metric LogQL queries like count_over_time."),
      output: logOutputSchema.optional().describe("json for analysis, graph for log metric visualizations, or wide for label-rich log output."),
    }),
  }
);

export const listLogLabelValuesTool = tool(
  async ({ datasourceUid, label }) => {
    const args = ["logs", "labels", "-d", datasourceUid];
    if (label) args.push("-l", label);
    args.push("-o", "json");
    return runGcx(args);
  },
  {
    name: "gcx_list_log_label_values",
    description:
      "List Loki log label names or values through gcx. Omit label to list stream label names; pass label (commonly job, namespace, service_name) to list values before querying streams.",
    schema: z.object({
      datasourceUid: z.string().describe("Loki datasource UID."),
      label: z.string().optional().describe("Optional log label name. Omit to list all available stream label names."),
    }),
  }
);

export const listLogSeriesTool = tool(
  async ({ datasourceUid, matcher }) => runGcx(["logs", "series", "-d", datasourceUid, "-M", matcher, "-o", "json"]),
  {
    name: "gcx_list_log_series",
    description:
      "List Loki series matching a stream selector through gcx. Use to verify log streams are available for a service, e.g. matcher {job=\"api\"}.",
    schema: z.object({
      datasourceUid: z.string().describe("Loki datasource UID."),
      matcher: z.string().describe("Loki stream matcher, e.g. {job=\"api\"}."),
    }),
  }
);
