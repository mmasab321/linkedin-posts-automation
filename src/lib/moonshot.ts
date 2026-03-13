import OpenAI from "openai";

export function createMoonshotClient(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: "https://api.moonshot.ai/v1",
  });
}

