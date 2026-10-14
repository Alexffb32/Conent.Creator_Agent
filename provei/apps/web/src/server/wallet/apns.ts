import 'server-only';
import { connect, constants } from 'node:http2';
import type { AppleCertificates } from './provider';

export interface ApnsResult {
  status: number;
  reason?: string;
}

/** Envio de um push de atualização de cartão: payload vazio `{}`, tópico = passTypeIdentifier. */
export interface ApnsTransport {
  readonly simulated: boolean;
  send(pushToken: string, topic: string): Promise<ApnsResult>;
  close(): void;
}

/** O APNs devolve token inválido: o registo deve ser apagado. */
export function isInvalidToken(r: ApnsResult): boolean {
  return r.status === 410 || (r.status === 400 && (r.reason === 'BadDeviceToken' || r.reason === 'DeviceTokenNotForTopic')) || r.reason === 'Unregistered';
}

/**
 * APNs real (HTTP/2, autenticação por certificado do Pass Type ID). Só produção: o push de atualização de cartões
 * não funciona no ambiente de sandbox.
 */
export class Http2ApnsTransport implements ApnsTransport {
  readonly simulated = false;
  private session: ReturnType<typeof connect> | null = null;
  constructor(private readonly certs: AppleCertificates, private readonly host = 'https://api.push.apple.com') {}

  private client() {
    if (!this.session || this.session.closed || this.session.destroyed) {
      this.session = connect(this.host, { cert: this.certs.signerCert, key: this.certs.signerKey, passphrase: this.certs.signerKeyPassphrase });
      this.session.on('error', () => {
        this.session = null;
      });
    }
    return this.session;
  }

  send(pushToken: string, topic: string): Promise<ApnsResult> {
    return new Promise((resolve) => {
      const req = this.client().request({
        [constants.HTTP2_HEADER_METHOD]: 'POST',
        [constants.HTTP2_HEADER_PATH]: `/3/device/${pushToken}`,
        'apns-topic': topic,
        'apns-push-type': 'background',
        'apns-priority': '5',
        'content-type': 'application/json',
      });
      let status = 0;
      let data = '';
      req.setEncoding('utf8');
      req.setTimeout(10_000, () => {
        req.close();
        resolve({ status: 0, reason: 'timeout' });
      });
      req.on('response', (h) => {
        status = Number(h[constants.HTTP2_HEADER_STATUS]);
      });
      req.on('data', (c: string) => {
        data += c;
      });
      req.on('end', () => {
        let reason: string | undefined;
        try {
          reason = data ? (JSON.parse(data) as { reason?: string }).reason : undefined;
        } catch {
          reason = undefined;
        }
        resolve({ status, reason });
      });
      req.on('error', (e) => resolve({ status: 0, reason: e.message.slice(0, 100) }));
      req.end('{}');
    });
  }

  close() {
    this.session?.close();
    this.session = null;
  }
}

/** Simulado (dev/testes): devolve respostas programadas por token; por omissão 200. */
export class SimulatedApnsTransport implements ApnsTransport {
  readonly simulated = true;
  readonly sent: { token: string; topic: string }[] = [];
  constructor(private readonly responses: Record<string, ApnsResult> = {}) {}
  async send(pushToken: string, topic: string) {
    this.sent.push({ token: pushToken, topic });
    return this.responses[pushToken] ?? { status: 200 };
  }
  close() {}
}
