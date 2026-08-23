import "server-only";
import type { AiProvider } from "./types";
import { TemplateAiProvider } from "./template-provider";
import { AnthropicAiProvider } from "./anthropic-provider";

let provider: AiProvider | undefined;

export function getAiProvider(): AiProvider {
  if (provider) return provider;

  switch (process.env.AI_PROVIDER) {
    case "anthropic":
      provider = new AnthropicAiProvider();
      break;
    default:
      provider = new TemplateAiProvider();
  }

  return provider;
}

export type { AiProvider, GenerateProductDescriptionParams } from "./types";
