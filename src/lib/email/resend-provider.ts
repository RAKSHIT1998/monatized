import "server-only";
import type { EmailProvider, SendEmailParams, SendEmailResult } from "./types";

// Talks to Resend's REST API directly over fetch rather than adding their SDK
// as a dependency — the API surface we need is a single POST.
export class ResendEmailProvider implements EmailProvider {
  name = "RESEND" as const;
  private apiKey: string;
  private from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is required for EMAIL_PROVIDER=resend.");
    this.apiKey = apiKey;
    this.from = process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev";
  }

  async send(params: SendEmailParams): Promise<SendEmailResult> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.from,
        to: params.to,
        subject: params.subject,
        text: params.text,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Resend send failed (${response.status}): ${body}`);
    }

    const data = (await response.json()) as { id: string };
    return { providerMessageId: data.id };
  }
}
