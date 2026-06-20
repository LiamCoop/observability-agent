import type { DiagnosticFinding, ToolCallRecord } from "../state";

type InvokableTool = {
  name: string;
  invoke(input: unknown): Promise<unknown>;
};

export async function invokeGcxTool(tool: InvokableTool, input: unknown): Promise<{ output?: unknown; record: ToolCallRecord }> {
  try {
    const output = await tool.invoke(input);
    return { output, record: { tool: tool.name, input, output } };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { record: { tool: tool.name, input, error: message } };
  }
}

export function finding(step: string, summary: string, evidence?: unknown): DiagnosticFinding {
  return { step, summary, ...(evidence === undefined ? {} : { evidence }) };
}

export function extractDatasources(payload: unknown): Array<{ uid: string; name?: string; type: string }> {
  const json = (payload as { json?: unknown })?.json ?? payload;
  const datasources = (json as { datasources?: unknown })?.datasources;
  if (!Array.isArray(datasources)) return [];
  return datasources
    .filter((item): item is { uid: string; name?: string; type: string } => {
      const maybe = item as { uid?: unknown; type?: unknown };
      return typeof maybe.uid === "string" && typeof maybe.type === "string";
    })
    .map((item) => ({ uid: item.uid, name: item.name, type: item.type }));
}

export function firstDatasourceUid(payload: unknown): string | undefined {
  return extractDatasources(payload)[0]?.uid;
}
