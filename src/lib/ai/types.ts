export type GenerateProductDescriptionParams = {
  title: string;
  productType: "DIGITAL" | "COURSE" | "SUBSCRIPTION" | "BOOKING";
  priceLabel: string;
};

export interface AiProvider {
  name: "TEMPLATE" | "ANTHROPIC";
  generateProductDescription(params: GenerateProductDescriptionParams): Promise<string>;
}
