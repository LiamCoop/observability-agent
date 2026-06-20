import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { runGcx } from "./command";

export const viewGcxConfigTool = tool(
  async ({ minify }) => runGcx(["config", "view", ...(minify ? ["--minify"] : [])], false),
  {
    name: "gcx_view_config",
    description:
      "Show the active gcx configuration/context. Use when debugging authentication, missing datasources, or verifying gcx is configured before querying Grafana. Supports --minify for concise output.",
    schema: z.object({ minify: z.boolean().optional().describe("Pass --minify for concise config output.") }),
  }
);

export const currentGcxContextTool = tool(
  async () => runGcx(["config", "current-context"], false),
  {
    name: "gcx_current_context",
    description: "Show the active gcx context name. Use before switching contexts or when verifying the target Grafana instance.",
  }
);

export const useGcxContextTool = tool(
  async ({ contextName }) => runGcx(["config", "use-context", contextName], false),
  {
    name: "gcx_use_context",
    description: "Switch the active gcx context. Use when the current context points at the wrong Grafana instance.",
    schema: z.object({ contextName: z.string().describe("Configured gcx context name to activate.") }),
  }
);

export const setGcxConfigValueTool = tool(
  async ({ path, value }) => runGcx(["config", "set", path, value], false),
  {
    name: "gcx_set_config_value",
    description:
      "Set a gcx configuration value such as a context token or default datasource UID. Use only when the user has provided the intended value.",
    schema: z.object({
      path: z.string().describe("Config path, e.g. contexts.<context-name>.grafana.token or contexts.<context-name>.default-prometheus-datasource."),
      value: z.string().describe("Value to set. Do not invent credentials; use only user-provided values."),
    }),
  }
);
