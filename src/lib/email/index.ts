import "server-only";
import type { EmailProvider } from "./types";
import { ConsoleEmailProvider } from "./console-provider";
import { ResendEmailProvider } from "./resend-provider";

let provider: EmailProvider | undefined;

export function getEmailProvider(): EmailProvider {
  if (provider) return provider;

  switch (process.env.EMAIL_PROVIDER) {
    case "resend":
      provider = new ResendEmailProvider();
      break;
    default:
      provider = new ConsoleEmailProvider();
  }

  return provider;
}

export type { EmailProvider, SendEmailParams, SendEmailResult } from "./types";
