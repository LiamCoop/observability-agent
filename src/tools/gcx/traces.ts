import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { appendTimeRange, runGcx } from "./command";

export const queryTracesTool = tool(
  async ({ datasourceUid, query, from, to }) => {
    const args = appendTimeRange(["traces", "query", "-d", datasourceUid, query], { from, to });
    args.push("-o", "json");
    return runGcx(args);
  },
  {
    name: "gcx_query_traces",
    description:
      "Search Tempo traces with TraceQL through gcx. Use if a Tempo datasource exists to find error traces, service traces, or slow traces in an incident window. Use scoped attributes like resource.service.name and span.http.status_code.",
    schema: z.object({
      datasourceUid: z.string().describe("Tempo datasource UID from gcx_list_datasources."),
      query: z.string().describe("TraceQL query, e.g. { resource.service.name = \"api\" && duration > 1s }."),
      from: z.string().optional().describe("Start time, e.g. now-1h."),
      to: z.string().optional().describe("End time, e.g. now."),
    }),
  }
);

export const getTraceTool = tool(
  async ({ datasourceUid, traceId }) => runGcx(["traces", "get", "-d", datasourceUid, traceId, "--llm", "-o", "json"]),
  {
    name: "gcx_get_trace",
    description:
      "Fetch a specific Tempo trace by ID through gcx using Tempo's compact --llm encoding. Use after gcx_query_traces or when logs contain a trace ID.",
    schema: z.object({
      datasourceUid: z.string().describe("Tempo datasource UID."),
      traceId: z.string().describe("Trace ID to fetch."),
    }),
  }
);

export const listTraceLabelsTool = tool(
  async ({ datasourceUid }) => runGcx(["traces", "labels", "-d", datasourceUid], false),
  {
    name: "gcx_list_trace_labels",
    description:
      "List available Tempo TraceQL labels through gcx. Use to discover valid scoped trace attributes before querying.",
    schema: z.object({ datasourceUid: z.string().describe("Tempo datasource UID.") }),
  }
);

export const listTraceTagValuesTool = tool(
  async ({ datasourceUid, label }) => runGcx(["traces", "tags", "-d", datasourceUid, "-l", label, "--llm", "-o", "json"]),
  {
    name: "gcx_list_trace_tag_values",
    description:
      "List Tempo tag values for a trace label through gcx using compact --llm JSON. Use with labels such as resource.service.name.",
    schema: z.object({
      datasourceUid: z.string().describe("Tempo datasource UID."),
      label: z.string().describe("Scoped TraceQL label, e.g. resource.service.name."),
    }),
  }
);
