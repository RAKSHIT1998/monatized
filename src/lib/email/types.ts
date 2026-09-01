export type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
  // Optional branded HTML alternative — most sends stay text-only. A
  // provider that doesn't support HTML can safely ignore it.
  html?: string;
};

export type SendEmailResult = {
  providerMessageId: string;
};

export interface EmailProvider {
  name: "CONSOLE" | "RESEND";
  send(params: SendEmailParams): Promise<SendEmailResult>;
}
