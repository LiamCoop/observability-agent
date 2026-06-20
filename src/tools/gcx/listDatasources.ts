import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { runGcx } from "./command";

export const listDatasourcesTool = tool(
  async ({ type }) => {
    const args = ["datasources", "list"];
    if (type) args.push("-t", type);
    args.push("-o", "json");
    return runGcx(args);
  },
  {
    name: "gcx_list_datasources",
    description:
      "List Grafana datasources through gcx. Use this first to discover Prometheus, Loki, and Tempo datasource UIDs for later metrics, logs, and traces queries.",
    schema: z.object({
      type: z.enum(["prometheus", "loki", "tempo"]).optional().describe("Optional datasource type filter."),
    }),
  }
);

export const getDatasourceTool = tool(
  async ({ datasourceUid }) => runGcx(["datasources", "get", datasourceUid, "-o", "json"]),
  {
    name: "gcx_get_datasource",
    description:
      "Get full details for a Grafana datasource by UID through gcx. Use when recovering from datasource-not-found errors or verifying datasource type/details.",
    schema: z.object({ datasourceUid: z.string().describe("Datasource UID to inspect.") }),
  }
);
