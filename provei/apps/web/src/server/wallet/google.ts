import 'server-only';
import { createSign } from 'node:crypto';
import { googleMessage, googlePointsPatch } from '@provei/domain';
import { serverEnv } from '@/lib/env';

const API = 'https://walletobjects.googleapis.com/walletobjects/v1';
const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url');

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

export interface GoogleResponse {
  status: number;
  json: unknown;
}

/** Transporte para a API Google Wallet (real ou simulado, para testes). */
export interface GoogleTransport {
  readonly simulated: boolean;
  request(method: 'GET' | 'POST' | 'PATCH' | 'PUT', path: string, body?: unknown): Promise<GoogleResponse>;
}

function serviceAccount(): ServiceAccount | null {
  const raw = serverEnv.wallet.googleServiceAccountJson;
  if (!raw || !serverEnv.wallet.googleIssuerId) return null;
  try {
    const sa = JSON.parse(raw) as ServiceAccount;
    return sa.client_email && sa.private_key ? sa : null;
  } catch {
    return null;
  }
}

function signJwt(sa: ServiceAccount, payload: Record<string, unknown>): string {
  const head = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64u(JSON.stringify(payload));
  const sig = createSign('RSA-SHA256').update(`${head}.${body}`).sign(sa.private_key);
  return `${head}.${body}.${b64u(sig)}`;
}

/** API real: token OAuth da service account (escopo wallet_object.issuer), guardado até expirar. */
export class GoogleApiTransport implements GoogleTransport {
  readonly simulated = false;
  private token: { value: string; exp: number } | null = null;
  constructor(private readonly sa: ServiceAccount) {}

  private async accessToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    if (this.token && this.token.exp - 60 > now) return this.token.value;
    const assertion = signJwt(this.sa, { iss: this.sa.client_email, scope: 'https://www.googleapis.com/auth/wallet_object.issuer', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 });
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    });
    const j = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!res.ok || !j.access_token) throw new Error(`Google OAuth falhou (${res.status})`);
    this.token = { value: j.access_token, exp: now + (j.expires_in ?? 3600) };
    return j.access_token;
  }

  async request(method: 'GET' | 'POST' | 'PATCH' | 'PUT', path: string, body?: unknown): Promise<GoogleResponse> {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${await this.accessToken()}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }
    return { status: res.status, json };
  }
}

/** Simulado: guarda os pedidos e responde com o que for programado (por caminho), 200 por omissão. */
export class SimulatedGoogleTransport implements GoogleTransport {
  readonly simulated = true;
  readonly calls: { method: string; path: string; body?: unknown }[] = [];
  readonly store = new Map<string, unknown>();
  constructor(private readonly responder?: (method: string, path: string, body: unknown, n: number) => GoogleResponse | undefined) {}
  async request(method: 'GET' | 'POST' | 'PATCH' | 'PUT', path: string, body?: unknown): Promise<GoogleResponse> {
    this.calls.push({ method, path, body });
    const programmed = this.responder?.(method, path, body, this.calls.length);
    if (programmed) return programmed;
    if (method === 'GET') return this.store.has(path) ? { status: 200, json: this.store.get(path) } : { status: 404, json: null };
    if (method === 'POST' && !path.endsWith('/addMessage')) this.store.set(`${path}/${encodeURIComponent((body as { id: string }).id)}`, body);
    return { status: 200, json: body ?? null };
  }
}

/** A Google recusa avisos acima de 3 por cartão em 24 h (QuotaExceededException). */
export function isQuotaExceeded(r: GoogleResponse): boolean {
  if (r.status === 429) return true;
  const msg = JSON.stringify(r.json ?? '');
  return /QuotaExceeded/i.test(msg);
}

const enc = encodeURIComponent;

export type NotifyOutcome = 'notified' | 'silent' | 'quota_fallback';

export class GoogleWalletProvider {
  readonly platform = 'google' as const;
  constructor(private readonly t: GoogleTransport, readonly issuerId: string) {}
  get simulated() {
    return this.t.simulated;
  }

  /** Cria a classe ou atualiza-a (localizações, nome). */
  async upsertClass(cls: { id: string } & Record<string, unknown>) {
    const got = await this.t.request('GET', `/loyaltyClass/${enc(cls.id)}`);
    const r = got.status === 404 ? await this.t.request('POST', '/loyaltyClass', cls) : await this.t.request('PATCH', `/loyaltyClass/${enc(cls.id)}`, cls);
    if (r.status >= 400) throw new Error(`Google Wallet: classe (${r.status})`);
  }

  async upsertObject(obj: { id: string } & Record<string, unknown>) {
    const got = await this.t.request('GET', `/loyaltyObject/${enc(obj.id)}`);
    const r = got.status === 404 ? await this.t.request('POST', '/loyaltyObject', obj) : await this.t.request('PATCH', `/loyaltyObject/${enc(obj.id)}`, obj);
    if (r.status >= 400) throw new Error(`Google Wallet: objeto (${r.status})`);
  }

  /** Atualiza o saldo; com aviso se pedido. Acima da quota repete sem aviso. */
  async updatePoints(objectId: string, points: number, notify: boolean): Promise<NotifyOutcome> {
    const r = await this.t.request('PATCH', `/loyaltyObject/${enc(objectId)}`, googlePointsPatch(points, notify));
    if (notify && isQuotaExceeded(r)) {
      const again = await this.t.request('PATCH', `/loyaltyObject/${enc(objectId)}`, googlePointsPatch(points, false));
      if (again.status >= 400) throw new Error(`Google Wallet: pontos (${again.status})`);
      return 'quota_fallback';
    }
    if (r.status >= 400) throw new Error(`Google Wallet: pontos (${r.status})`);
    return notify ? 'notified' : 'silent';
  }

  /** Mensagem no cartão: TEXT_AND_NOTIFY só com consentimento; acima da quota volta a TEXT. */
  async addMessage(objectId: string, id: string, header: string, body: string, notify: boolean): Promise<NotifyOutcome> {
    const path = `/loyaltyObject/${enc(objectId)}/addMessage`;
    const r = await this.t.request('POST', path, googleMessage(id, header, body, notify));
    if (notify && isQuotaExceeded(r)) {
      const again = await this.t.request('POST', path, googleMessage(id, header, body, false));
      if (again.status >= 400) throw new Error(`Google Wallet: mensagem (${again.status})`);
      return 'quota_fallback';
    }
    if (r.status >= 400) throw new Error(`Google Wallet: mensagem (${r.status})`);
    return notify ? 'notified' : 'silent';
  }

  async setState(objectId: string, state: 'ACTIVE' | 'INACTIVE') {
    const r = await this.t.request('PATCH', `/loyaltyObject/${enc(objectId)}`, { state });
    if (r.status >= 400) throw new Error(`Google Wallet: estado (${r.status})`);
  }
}

/** Ligação "Adicionar à Google Wallet": JWT assinado que só referencia o objeto já criado pela API. */
export function googleSaveUrl(objectId: string, classId: string): string | null {
  const sa = serviceAccount();
  if (!sa) return null;
  const jwt = signJwt(sa, {
    iss: sa.client_email,
    aud: 'google',
    typ: 'savetowallet',
    iat: Math.floor(Date.now() / 1000),
    origins: [process.env.NEXT_PUBLIC_SITE_URL ?? ''],
    payload: { loyaltyObjects: [{ id: objectId, classId }] },
  });
  return `https://pay.google.com/gtw/save/${jwt}`;
}

/** Real com credenciais; simulado fora de produção; nada em produção sem credenciais. */
export function getGoogleProvider(): GoogleWalletProvider | null {
  const sa = serviceAccount();
  if (sa) return new GoogleWalletProvider(new GoogleApiTransport(sa), serverEnv.wallet.googleIssuerId);
  if (process.env.NODE_ENV !== 'production') return new GoogleWalletProvider(new SimulatedGoogleTransport(), '3388000000000000000');
  return null;
}
