import 'server-only';
import { safeEqualHex, sha256Hex } from './tokens';

/**
 * Serviço web PassKit (referência Apple "Wallet Passes › Adding a web service to update passes", confirmada em 2026-10-14):
 *  POST   v1/devices/{device}/registrations/{passType}/{serial}   (Authorization: ApplePass <token>) → 201 novo, 200 já registado, 401
 *  DELETE v1/devices/{device}/registrations/{passType}/{serial}   (Authorization)                   → 200, 401
 *  GET    v1/devices/{device}/registrations/{passType}?passesUpdatedSince=tag (sem Authorization:
 *         o segredo é o device library id)                                                          → 200 {serialNumbers,lastUpdated}, 204
 *  GET    v1/passes/{passType}/{serial}                           (Authorization)                   → 200 .pkpass, 304, 401
 *  POST   v1/log                                                                                    → 200
 * Os handlers são puros sobre uma `WebServiceStore`, para testar com um dispositivo simulado.
 */

export interface WsPass {
  id: string;
  serialNumber: string;
  authTokenHash: string;
  updateTag: number;
  updatedAt: Date;
  voided: boolean;
}

export interface WebServiceStore {
  passTypeIdentifier(): string;
  findPass(serial: string): Promise<WsPass | null>;
  /** true se a registo era novo. Guarda sempre o push token mais recente do dispositivo em todos os seus registos. */
  register(deviceId: string, passId: string, pushToken: string): Promise<boolean>;
  unregister(deviceId: string, passId: string): Promise<void>;
  /** Cartões registados neste dispositivo com etiqueta > since (ou todos se since for null). */
  updatedSince(deviceId: string, since: number | null): Promise<{ serialNumber: string; updateTag: number }[]>;
  renderPass(passId: string): Promise<{ body: Buffer; contentType: string } | null>;
}

export interface WsResponse {
  status: number;
  json?: unknown;
  body?: Buffer;
  headers?: Record<string, string>;
}

const DEVICE_RE = /^[A-Za-z0-9._-]{1,128}$/;
const SERIAL_RE = /^[a-f0-9]{32}$/;
const PUSH_RE = /^[A-Za-z0-9]{1,256}$/;

function authorized(header: string | null, pass: WsPass): boolean {
  const m = /^ApplePass ([A-Za-z0-9_-]{32,128})$/.exec(header ?? '');
  return Boolean(m) && safeEqualHex(sha256Hex(m![1]!), pass.authTokenHash);
}

async function authPass(store: WebServiceStore, passType: string, serial: string, auth: string | null): Promise<WsPass | null> {
  if (passType !== store.passTypeIdentifier() || !SERIAL_RE.test(serial)) return null;
  const pass = await store.findPass(serial);
  if (!pass || !authorized(auth, pass)) return null;
  return pass;
}

export async function wsRegister(store: WebServiceStore, p: { device: string; passType: string; serial: string; auth: string | null; body: unknown }): Promise<WsResponse> {
  if (!DEVICE_RE.test(p.device)) return { status: 400 };
  const pass = await authPass(store, p.passType, p.serial, p.auth);
  if (!pass) return { status: 401 };
  const token = (p.body as { pushToken?: unknown } | null)?.pushToken;
  if (typeof token !== 'string' || !PUSH_RE.test(token)) return { status: 400 };
  const created = await store.register(p.device, pass.id, token);
  return { status: created ? 201 : 200 };
}

export async function wsUnregister(store: WebServiceStore, p: { device: string; passType: string; serial: string; auth: string | null }): Promise<WsResponse> {
  if (!DEVICE_RE.test(p.device)) return { status: 400 };
  const pass = await authPass(store, p.passType, p.serial, p.auth);
  if (!pass) return { status: 401 };
  await store.unregister(p.device, pass.id);
  return { status: 200 };
}

export async function wsListUpdated(store: WebServiceStore, p: { device: string; passType: string; since: string | null }): Promise<WsResponse> {
  if (!DEVICE_RE.test(p.device) || p.passType !== store.passTypeIdentifier()) return { status: 204 };
  const since = p.since && /^\d{1,19}$/.test(p.since) ? Number(p.since) : null;
  const rows = await store.updatedSince(p.device, since);
  if (!rows.length) return { status: 204 };
  const last = Math.max(...rows.map((r) => r.updateTag));
  return { status: 200, json: { serialNumbers: rows.map((r) => r.serialNumber), lastUpdated: String(last) } };
}

export async function wsGetPass(store: WebServiceStore, p: { passType: string; serial: string; auth: string | null; ifModifiedSince: string | null }): Promise<WsResponse> {
  const pass = await authPass(store, p.passType, p.serial, p.auth);
  if (!pass) return { status: 401 };
  const lastModified = new Date(Math.floor(pass.updatedAt.getTime() / 1000) * 1000);
  if (p.ifModifiedSince) {
    const since = new Date(p.ifModifiedSince);
    if (!Number.isNaN(since.getTime()) && lastModified.getTime() <= since.getTime()) return { status: 304 };
  }
  const out = await store.renderPass(pass.id);
  if (!out) return { status: 404 };
  return { status: 200, body: out.body, headers: { 'Content-Type': out.contentType, 'Last-Modified': lastModified.toUTCString(), 'Cache-Control': 'no-store' } };
}

/** Registos do dispositivo: só tamanho limitado e sem dados pessoais (vão para os logs do servidor). */
export function wsLog(body: unknown): { status: number; lines: string[] } {
  const logs = (body as { logs?: unknown } | null)?.logs;
  const lines = Array.isArray(logs) ? logs.filter((l): l is string => typeof l === 'string').slice(0, 20).map((l) => l.replace(/[\u0000-\u001f\u007f]+/g, ' ').slice(0, 300)) : [];
  return { status: 200, lines };
}
