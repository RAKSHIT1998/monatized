export type GenerateProductDescriptionParams = {
  title: string;
  productType: "DIGITAL" | "COURSE" | "SUBSCRIPTION" | "BOOKING" | "PHYSICAL" | "TIP";
  priceLabel: string;
};

export interface AiProvider {
  name: "TEMPLATE" | "ANTHROPIC";
  generateProductDescription(params: GenerateProductDescriptionParams): Promise<string>;
}
