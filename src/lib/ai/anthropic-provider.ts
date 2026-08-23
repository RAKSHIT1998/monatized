import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider, GenerateProductDescriptionParams } from "./types";

const PRODUCT_TYPE_LABEL: Record<GenerateProductDescriptionParams["productType"], string> = {
  DIGITAL: "a digital download",
  COURSE: "an online course",
  SUBSCRIPTION: "a recurring membership",
  BOOKING: "a bookable 1:1 session",
};

export class AnthropicAiProvider implements AiProvider {
  name = "ANTHROPIC" as const;
  private client: Anthropic;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is required for AI_PROVIDER=anthropic.");
    }
    this.client = new Anthropic();
  }

  async generateProductDescription(params: GenerateProductDescriptionParams): Promise<string> {
    const response = await this.client.messages.create({
      model: "claude-opus-5",
      max_tokens: 400,
      system:
        "You write short, punchy product descriptions for a creator's storefront. " +
        "Reply with only the description text — 2-3 sentences, no headings, no quotes, no markdown.",
      messages: [
        {
          role: "user",
          content: `Write a product description for "${params.title}", ${PRODUCT_TYPE_LABEL[params.productType]} priced at ${params.priceLabel}.`,
        },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock) throw new Error("Anthropic returned no text content.");
    return textBlock.text.trim();
  }
}
