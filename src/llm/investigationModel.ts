import { ChatOpenAI } from "@langchain/openai";

const DEFAULT_INVESTIGATION_MODEL = "gpt-5-mini";

let cachedInvestigationModel: ChatOpenAI | undefined;

export function getInvestigationModel(): ChatOpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to run the alert investigation LLM summary.");
  }

  cachedInvestigationModel ??= new ChatOpenAI({
    model: process.env.ALERT_INVESTIGATION_MODEL ?? DEFAULT_INVESTIGATION_MODEL,
    useResponsesApi: true,
  });

  return cachedInvestigationModel;
}

export function getInvestigationModelName(): string {
  return process.env.ALERT_INVESTIGATION_MODEL ?? DEFAULT_INVESTIGATION_MODEL;
}
