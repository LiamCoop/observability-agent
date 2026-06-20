import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { runGcx } from "./command";

export const getResourceTool = tool(
  async ({ resource }) => runGcx(["resources", "get", resource, "-o", "json"]),
  {
    name: "gcx_get_resource",
    description:
      "Get Grafana resources through gcx, such as dashboards or dashboards/<uid>. Use to find service-specific dashboards or inspect a known dashboard's panels and templating variables.",
    schema: z.object({
      resource: z.string().describe("Resource path, e.g. dashboards or dashboards/<dashboard-uid>."),
    }),
  }
);

export const pullResourcesTool = tool(
  async ({ resourceType }) => runGcx(["resources", "pull", resourceType, "-o", "json"]),
  {
    name: "gcx_pull_resources",
    description:
      "Pull Grafana resources locally through gcx. Use for dashboards when you need to inspect panel queries in bulk.",
    schema: z.object({
      resourceType: z.literal("dashboards").describe("Grafana resource type to pull."),
    }),
  }
);
