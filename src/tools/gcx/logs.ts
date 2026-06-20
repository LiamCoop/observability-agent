import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { appendTimeRange, runGcx } from "./command";

export const queryLogsTool = tool(
  async ({ datasourceUid, query, from, to, step }) => {
    const args = appendTimeRange(["logs", "query", "-d", datasourceUid, query], { from, to, step });
    args.push("-o", "json");
    return runGcx(args);
  },
  {
    name: "gcx_query_logs",
    description:
      "Run a LogQL query against a Loki datasource via gcx. Use to correlate service error logs, structured error logs, log-derived rates, and crash/timeout patterns with metric spikes. Always include at least one non-empty label matcher in the LogQL selector.",
    schema: z.object({
      datasourceUid: z.string().describe("Loki datasource UID from gcx_list_datasources."),
      query: z.string().describe("LogQL query, e.g. {job=\"api\"} |= \"error\"."),
      from: z.string().optional().describe("Start time, e.g. now-1h."),
      to: z.string().optional().describe("End time, e.g. now."),
      step: z.string().optional().describe("Step for metric LogQL queries like count_over_time."),
    }),
  }
);

export const listLogLabelValuesTool = tool(
  async ({ datasourceUid, label }) => runGcx(["logs", "labels", "-d", datasourceUid, "-l", label, "-o", "json"]),
  {
    name: "gcx_list_log_label_values",
    description:
      "List Loki label values through gcx. Use to confirm log streams exist for labels such as job before querying service logs.",
    schema: z.object({
      datasourceUid: z.string().describe("Loki datasource UID."),
      label: z.string().describe("Log label name, commonly job."),
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
