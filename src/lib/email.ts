import "server-only";

import { createTransport } from "nodemailer";

type TemporaryPasswordEmail = {
  name: string;
  email: string;
  password: string;
};

export function createSmtpTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;

  if (
    !host ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    !user ||
    !password ||
    !process.env.SMTP_FROM
  ) {
    throw new Error(
      "SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and SMTP_FROM.",
    );
  }

  return createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass: password },
  });
}

export async function sendTemporaryPasswordEmail(
  transport: ReturnType<typeof createSmtpTransport>,
  { name, email, password }: TemporaryPasswordEmail,
) {
  const from = process.env.SMTP_FROM;
  if (!from) {
    throw new Error("SMTP_FROM is not configured.");
  }

  await transport.sendMail({
    from,
    to: email,
    subject: "Your Camelot temporary password",
    text: [
      `Hello ${name},`,
      "",
      "Use these credentials to sign in to your Camelot account:",
      `Email address: ${email}`,
      "",
      `Temporary password: ${password}`,
      "",
      `Sign in at ${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/login`,
      "You will be asked to choose a new password after signing in.",
      "",
      "If you did not request this change, contact Camelot support.",
    ].join("\n"),
  });
}
