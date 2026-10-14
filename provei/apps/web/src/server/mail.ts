import 'server-only';
import { serverEnv } from '@/lib/env';

export interface Mailer {
  send(msg: { to: string; subject: string; html: string; text: string }): Promise<void>;
}

class ConsoleMailer implements Mailer {
  async send(msg: { to: string; subject: string; text: string }) {
    console.info(`[mail:console] para=${msg.to} assunto="${msg.subject}"\n${msg.text}`);
  }
}

class ResendMailer implements Mailer {
  async send(msg: { to: string; subject: string; html: string; text: string }) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serverEnv.resendApiKey}` },
      body: JSON.stringify({ from: serverEnv.mailFrom, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}`);
  }
}

export function getMailer(): Mailer {
  return serverEnv.resendApiKey ? new ResendMailer() : new ConsoleMailer();
}

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
