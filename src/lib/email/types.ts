export type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
};

export type SendEmailResult = {
  providerMessageId: string;
};

export interface EmailProvider {
  name: "CONSOLE" | "RESEND";
  send(params: SendEmailParams): Promise<SendEmailResult>;
}
