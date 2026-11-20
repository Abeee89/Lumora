/**
 * Public interface of the Notifications module. M02 ships the email port adapter only
 * (MILESTONES M02: "email adapter behind the notification port"); reminders and push
 * belong to M15.
 *
 * Without a provider (U-A2) the message is written to a local directory instead of being
 * logged: the reset link is a one-time secret and NFR-063 keeps it out of the log.
 */
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { Logger } from "pino";

import { randomToken } from "../../kernel/crypto";
import type { EmailMessage, MessageSender } from "../auth/public";

export interface LocalEmailSinkOptions {
  directory: string;
  logger: Logger;
}

export function createLocalEmailSink(options: LocalEmailSinkOptions): MessageSender {
  return {
    async send(message: EmailMessage): Promise<void> {
      await mkdir(options.directory, { recursive: true });
      const file = join(options.directory, `${Date.now()}-${randomToken(6)}.json`);
      await writeFile(
        file,
        JSON.stringify({ to: message.to, subject: message.subject, text: message.text }, null, 2),
        "utf8",
      );
      options.logger.info({ to: message.to, file }, "email.sink_written");
    },
  };
}