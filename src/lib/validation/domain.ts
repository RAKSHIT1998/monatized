import * as z from "zod";

// Bare hostname only — no protocol, no path, no port.
const HOSTNAME_PATTERN = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/i;

export const customDomainSchema = z.object({
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(4, "Enter a domain.")
    .max(253)
    .regex(HOSTNAME_PATTERN, "Enter a bare domain like store.yourbrand.com — no https:// or path."),
});
