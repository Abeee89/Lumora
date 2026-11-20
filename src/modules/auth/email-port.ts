/**
 * The notification port owned by Authentication (MODULE-BOUNDARIES section 2: "uses the
 * notifications port for reset email through an interface it defines"). The Notifications
 * module implements it; nothing here knows the provider.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface MessageSender {
  send(message: EmailMessage): Promise<void>;
}