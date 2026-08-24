import "server-only";
import type { AiProvider, GenerateProductDescriptionParams } from "./types";

const OPENERS: Record<GenerateProductDescriptionParams["productType"], string> = {
  DIGITAL: "Get instant access to",
  COURSE: "Learn exactly how with",
  SUBSCRIPTION: "Join",
  BOOKING: "Book time with me:",
  PHYSICAL: "Get your hands on",
  TIP: "Support my work with",
};

const CLOSERS: Record<GenerateProductDescriptionParams["productType"], string> = {
  DIGITAL: "Download immediately after purchase — no waiting.",
  COURSE: "Go at your own pace, revisit lessons anytime.",
  SUBSCRIPTION: "Cancel anytime, no questions asked.",
  BOOKING: "Pick a time that works for you and let's get started.",
  PHYSICAL: "Shipped straight to your door.",
  TIP: "Every bit helps me keep making this — thank you.",
};

// Deterministic, rule-based text — no external API call, so this always
// works with zero configuration. Real generative output is available via
// AnthropicAiProvider if ANTHROPIC_API_KEY is set (see index.ts).
export class TemplateAiProvider implements AiProvider {
  name = "TEMPLATE" as const;

  async generateProductDescription(params: GenerateProductDescriptionParams): Promise<string> {
    const { title, productType, priceLabel } = params;
    return [
      `${OPENERS[productType]} ${title}.`,
      `For just ${priceLabel}, you'll get everything you need — no fluff, just results.`,
      CLOSERS[productType],
    ].join(" ");
  }
}
