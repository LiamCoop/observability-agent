import { tool } from "@langchain/core/tools";
import { runGcx } from "./command";

export const listAlertRulesTool = tool(
  async () => runGcx(["alert", "rules", "list", "-o", "json"]),
  {
    name: "gcx_list_alert_rules",
    description:
      "List Grafana alert rules through gcx. Use to find firing or pending alerts related to the investigated service, then filter by labels such as job or by state in the returned JSON.",
  }
);
