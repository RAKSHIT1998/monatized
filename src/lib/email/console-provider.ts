import "server-only";
import { randomBytes } from "node:crypto";
import type { EmailProvider, SendEmailParams, SendEmailResult } from "./types";

// Dev/demo default — no external calls, no real inbox. Every send is still
// logged to the EmailLog table by the caller, so campaign/automation history
// looks and behaves the same as it would with a real provider wired up.
export class ConsoleEmailProvider implements EmailProvider {
  name = "CONSOLE" as const;

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const id = `console_${randomBytes(8).toString("hex")}`;
    console.log(`[email:console] to=${params.to} subject="${params.subject}" id=${id}`);
    return { providerMessageId: id };
  }
}
