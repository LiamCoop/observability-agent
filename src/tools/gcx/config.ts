import { tool } from "@langchain/core/tools";
import { runGcx } from "./command";

export const viewGcxConfigTool = tool(
  async () => runGcx(["config", "view"], false),
  {
    name: "gcx_view_config",
    description:
      "Show the active gcx configuration/context. Use when debugging authentication, missing datasources, or verifying gcx is configured before querying Grafana.",
  }
);
