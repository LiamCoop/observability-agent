import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { appendTimeRange, runGcx } from "./command";

export const snapshotDashboardTool = tool(
  async ({ dashboardUid, outputDir, variables, from, to, since, panelId }) => {
    let args = ["dashboards", "snapshot", dashboardUid];
    if (panelId !== undefined) args.push("--panel", String(panelId));
    if (since) args.push("--since", since);
    args = appendTimeRange(args, { from, to });
    for (const [name, value] of Object.entries(variables ?? {})) {
      args.push("--var", `${name}=${value}`);
    }
    args.push("--output-dir", outputDir);
    return runGcx(args, false);
  },
  {
    name: "gcx_snapshot_dashboard",
    description:
      "Capture a PNG snapshot of a Grafana dashboard or panel through gcx. Use after identifying a relevant dashboard UID to visually inspect current or incident-window panel state. Requires Grafana image renderer support.",
    schema: z.object({
      dashboardUid: z.string().describe("Dashboard UID."),
      outputDir: z.string().default("./debug-snapshots").describe("Directory to write snapshot PNG files."),
      variables: z.record(z.string(), z.string()).optional().describe("Dashboard template variables, e.g. { cluster: 'prod', job: 'api' }."),
      from: z.string().optional().describe("Incident window start, e.g. now-1h."),
      to: z.string().optional().describe("Incident window end, e.g. now."),
      since: z.string().optional().describe("Relative lookback accepted by gcx, e.g. 1h. Do not combine with from/to."),
      panelId: z.number().int().optional().describe("Optional panel ID to snapshot only one panel."),
    }),
  }
);
