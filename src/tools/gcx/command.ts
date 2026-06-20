import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type GcxOutputFormat = "json" | "graph" | "text";

export interface GcxResult<T = unknown> {
  command: "gcx";
  args: string[];
  stdout: string;
  stderr: string;
  json?: T;
}

export async function runGcx<T = unknown>(args: string[], parseJson = true): Promise<GcxResult<T>> {
  try {
    const { stdout, stderr } = await execFileAsync("gcx", args, {
      maxBuffer: 10 * 1024 * 1024,
    });

    return {
      command: "gcx",
      args,
      stdout,
      stderr,
      ...(parseJson ? { json: parseGcxJson<T>(stdout) } : {}),
    };
  } catch (error) {
    const err = error as Error & { stdout?: string; stderr?: string; code?: number };
    throw new Error(
      JSON.stringify({
        command: "gcx",
        args,
        exitCode: err.code,
        message: err.message,
        stdout: err.stdout ?? "",
        stderr: err.stderr ?? "",
      })
    );
  }
}

function parseGcxJson<T>(stdout: string): T {
  try {
    return JSON.parse(stdout) as T;
  } catch (error) {
    throw new Error(
      JSON.stringify({
        message: "gcx did not return valid JSON on stdout",
        stdout,
        parseError: error instanceof Error ? error.message : String(error),
      })
    );
  }
}

export function withOutput(args: string[], output: GcxOutputFormat = "json"): { args: string[]; parseJson: boolean } {
  if (output === "text") return { args, parseJson: false };
  return { args: [...args, "-o", output], parseJson: output === "json" };
}

export function appendTimeRange(
  args: string[],
  options: { from?: string; to?: string; step?: string }
): string[] {
  const next = [...args];
  if (options.from) next.push("--from", options.from);
  if (options.to) next.push("--to", options.to);
  if (options.step) next.push("--step", options.step);
  return next;
}
