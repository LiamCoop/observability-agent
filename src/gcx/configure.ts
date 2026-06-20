import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const contextName = process.env.GCX_CONTEXT ?? "default";
const grafanaServer = process.env.GRAFANA_SERVER;
const grafanaToken = process.env.GRAFANA_TOKEN ?? process.env.SERVICE_TOKEN;
const grafanaOrgId = process.env.GRAFANA_ORG_ID;
const grafanaStackId = process.env.GRAFANA_STACK_ID;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function runGcx(args: string[], options: { redactedArgs?: string[] } = {}) {
  const displayArgs = options.redactedArgs ?? args;
  console.log(`$ gcx ${displayArgs.join(" ")}`);

  const { stdout, stderr } = await execFileAsync("gcx", args, {
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      GRAFANA_TOKEN: grafanaToken,
    },
  });

  if (stdout.trim()) console.log(stdout.trim());
  if (stderr.trim()) console.error(stderr.trim());
}

async function main() {
  const server = requireEnv("GRAFANA_SERVER", grafanaServer);
  const token = requireEnv("SERVICE_TOKEN or GRAFANA_TOKEN", grafanaToken);

  await runGcx(["config", "set", `contexts.${contextName}.grafana.server`, server]);
  await runGcx(["config", "set", `contexts.${contextName}.grafana.token`, token], {
    redactedArgs: ["config", "set", `contexts.${contextName}.grafana.token`, "**REDACTED**"],
  });

  if (grafanaOrgId) {
    await runGcx(["config", "set", `contexts.${contextName}.grafana.org-id`, grafanaOrgId]);
  }

  if (grafanaStackId) {
    await runGcx(["config", "set", `contexts.${contextName}.grafana.stack-id`, grafanaStackId]);
  }

  await runGcx(["config", "use-context", contextName]);
  await runGcx(["config", "check"]);
  await runGcx(["datasources", "list", "-o", "json"]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
