import { describe, expect, it } from 'vitest';
import { SimulatedApnsTransport } from '@/server/wallet/apns';
import { pushPendingUpdates, type PushStore } from '@/server/wallet/push';
import { authTokenFor, sha256Hex } from '@/server/wallet/tokens';
import { wsGetPass, wsListUpdated, wsLog, wsRegister, wsUnregister, type WebServiceStore } from '@/server/wallet/webservice';

const TYPE = 'pass.pt.provei.teste';

/** Base de dados em memória com a mesma regra da migração: etiqueta GLOBAL e monotónica. */
function memoryDb() {
  let seq = 0;
  const passes = new Map<string, { id: string; serial: string; restaurantId: string; tag: number; pushed: number; updatedAt: Date; voided: boolean }>();
  const regs = new Map<string, { device: string; passId: string; token: string }>();
  const events: { passId: string; status: string; reason?: string }[] = [];
  const add = (serial: string, restaurantId = 'rA') => {
    const p = { id: `id-${serial.slice(0, 4)}`, serial, restaurantId, tag: ++seq, pushed: 0, updatedAt: new Date('2026-10-01T10:00:00Z'), voided: false };
    passes.set(p.id, p);
    return p;
  };
  const touch = (id: string, patch: Partial<{ voided: boolean }> = {}) => {
    const p = passes.get(id)!;
    Object.assign(p, patch, { tag: ++seq, updatedAt: new Date(p.updatedAt.getTime() + 60_000) });
  };
  const ws: WebServiceStore = {
    passTypeIdentifier: () => TYPE,
    async findPass(serial) {
      const p = [...passes.values()].find((x) => x.serial === serial);
      return p ? { id: p.id, serialNumber: p.serial, authTokenHash: sha256Hex(authTokenFor(p.serial)), updateTag: p.tag, updatedAt: p.updatedAt, voided: p.voided } : null;
    },
    async register(device, passId, token) {
      const k = `${device}|${passId}`;
      const isNew = !regs.has(k);
      regs.set(k, { device, passId, token });
      for (const r of regs.values()) if (r.device === device) r.token = token; // só o último token do dispositivo
      return isNew;
    },
    async unregister(device, passId) {
      regs.delete(`${device}|${passId}`);
    },
    async updatedSince(device, since) {
      return [...regs.values()]
        .filter((r) => r.device === device)
        .map((r) => passes.get(r.passId)!)
        .filter((p) => since == null || p.tag > since)
        .map((p) => ({ serialNumber: p.serial, updateTag: p.tag }));
    },
    async renderPass(passId) {
      return { body: Buffer.from(`pkpass:${passId}:${passes.get(passId)!.tag}`), contentType: 'application/vnd.apple.pkpass' };
    },
  };
  const enabled = new Set(['rA']);
  const push: PushStore = {
    async pending(ids) {
      return [...passes.values()].filter((p) => p.tag > p.pushed && (!ids || ids.includes(p.id))).map((p) => ({ id: p.id, restaurantId: p.restaurantId, updateTag: p.tag, voided: p.voided }));
    },
    async updatesEnabled(rid) {
      return enabled.has(rid);
    },
    async registrations(passId) {
      return [...regs.values()].filter((r) => r.passId === passId).map((r) => ({ deviceId: r.device, pushToken: r.token }));
    },
    async deleteRegistration(device, passId) {
      regs.delete(`${device}|${passId}`);
    },
    async deleteAllRegistrations(passId) {
      for (const [k, r] of regs) if (r.passId === passId) regs.delete(k);
    },
    async markPushed(passId, tag) {
      const p = passes.get(passId)!;
      if (p.tag === tag) p.pushed = tag;
    },
    async logEvent(e) {
      events.push(e);
    },
  };
  return { passes, regs, events, add, touch, ws, push, enabled };
}

/** Dispositivo simulado (o que o iPhone faz ao falar com o serviço web). */
function device(db: ReturnType<typeof memoryDb>, id: string, pushToken: string) {
  let lastUpdated: string | null = null;
  return {
    register: (serial: string, auth = `ApplePass ${authTokenFor(serial)}`) => wsRegister(db.ws, { device: id, passType: TYPE, serial, auth, body: { pushToken } }),
    unregister: (serial: string) => wsUnregister(db.ws, { device: id, passType: TYPE, serial, auth: `ApplePass ${authTokenFor(serial)}` }),
    async sync() {
      const r = await wsListUpdated(db.ws, { device: id, passType: TYPE, since: lastUpdated });
      if (r.status === 200) lastUpdated = (r.json as { lastUpdated: string }).lastUpdated;
      return r;
    },
  };
}

const serialA = 'a'.repeat(32);
const serialB = 'b'.repeat(32);

describe('serviço web PassKit (dispositivo simulado)', () => {
  it('registo: 201 novo, 200 repetido (idempotente), 401 com token errado ou tipo errado, 400 sem pushToken', async () => {
    const db = memoryDb();
    db.add(serialA);
    const iphone = device(db, 'dev-1', 'tok1');
    expect((await iphone.register(serialA)).status).toBe(201);
    expect((await iphone.register(serialA)).status).toBe(200);
    expect(db.regs.size).toBe(1);
    expect((await iphone.register(serialA, `ApplePass ${authTokenFor(serialB)}`)).status).toBe(401);
    expect((await iphone.register(serialA, 'Bearer x')).status).toBe(401);
    expect((await wsRegister(db.ws, { device: 'dev-1', passType: 'pass.outro', serial: serialA, auth: `ApplePass ${authTokenFor(serialA)}`, body: { pushToken: 't' } })).status).toBe(401);
    expect((await wsRegister(db.ws, { device: 'dev-1', passType: TYPE, serial: serialA, auth: `ApplePass ${authTokenFor(serialA)}`, body: {} })).status).toBe(400);
  });

  it('a etiqueta é global: o dispositivo não perde a atualização de outro cartão com etiqueta antiga', async () => {
    const db = memoryDb();
    const a = db.add(serialA);
    const b = db.add(serialB, 'rB');
    const iphone = device(db, 'dev-1', 'tok1');
    await iphone.register(serialA);
    await iphone.register(serialB);
    const first = await iphone.sync();
    expect(first.status).toBe(200);
    expect((first.json as { serialNumbers: string[] }).serialNumbers.sort()).toEqual([serialA, serialB]);
    expect((await iphone.sync()).status).toBe(204); // nada mudou
    db.touch(a.id);
    db.touch(a.id);
    db.touch(b.id); // B muda depois de A já ter avançado duas vezes
    const r = await iphone.sync();
    expect((r.json as { serialNumbers: string[] }).serialNumbers.sort()).toEqual([serialA, serialB]);
    expect(Number((r.json as { lastUpdated: string }).lastUpdated)).toBe(db.passes.get(b.id)!.tag);
  });

  it('só fica o último push token por dispositivo; desregistar remove', async () => {
    const db = memoryDb();
    db.add(serialA);
    db.add(serialB);
    await device(db, 'dev-1', 'velho').register(serialA);
    const iphone = device(db, 'dev-1', 'novo');
    await iphone.register(serialB);
    expect([...db.regs.values()].map((r) => r.token)).toEqual(['novo', 'novo']);
    expect((await iphone.unregister(serialB)).status).toBe(200);
    expect(db.regs.size).toBe(1);
  });

  it('cartão: 200 com Last-Modified; 304 se não mudou; 401 sem autorização', async () => {
    const db = memoryDb();
    const a = db.add(serialA);
    const ok = await wsGetPass(db.ws, { passType: TYPE, serial: serialA, auth: `ApplePass ${authTokenFor(serialA)}`, ifModifiedSince: null });
    expect(ok.status).toBe(200);
    expect(ok.headers!['Content-Type']).toBe('application/vnd.apple.pkpass');
    const lm = ok.headers!['Last-Modified']!;
    expect((await wsGetPass(db.ws, { passType: TYPE, serial: serialA, auth: `ApplePass ${authTokenFor(serialA)}`, ifModifiedSince: lm })).status).toBe(304);
    db.touch(a.id);
    expect((await wsGetPass(db.ws, { passType: TYPE, serial: serialA, auth: `ApplePass ${authTokenFor(serialA)}`, ifModifiedSince: lm })).status).toBe(200);
    expect((await wsGetPass(db.ws, { passType: TYPE, serial: serialA, auth: null, ifModifiedSince: null })).status).toBe(401);
  });

  it('log do dispositivo: limitado e só texto', () => {
    const r = wsLog({ logs: ['x'.repeat(1000), 42, ...Array.from({ length: 50 }, () => 'y')] });
    expect(r.status).toBe(200);
    expect(r.lines).toHaveLength(20);
    expect(r.lines[0]).toHaveLength(300);
  });
});

describe('push de atualização (APNs simulado)', () => {
  it('payload por dispositivo com o tópico = passTypeIdentifier; marca enviado e não repete', async () => {
    const db = memoryDb();
    const a = db.add(serialA);
    await device(db, 'dev-1', 'tok1').register(serialA);
    await device(db, 'dev-2', 'tok2').register(serialA);
    const apns = new SimulatedApnsTransport();
    const r1 = await pushPendingUpdates(db.push, apns, TYPE);
    expect(r1.sent).toBe(2);
    expect(apns.sent.every((s) => s.topic === TYPE)).toBe(true);
    expect((await pushPendingUpdates(db.push, apns, TYPE)).sent).toBe(0); // nada pendente
    db.touch(a.id);
    expect((await pushPendingUpdates(db.push, apns, TYPE)).sent).toBe(2);
  });

  it('token inválido (410 / BadDeviceToken) apaga o registo; outros erros deixam o envio pendente', async () => {
    const db = memoryDb();
    const a = db.add(serialA);
    await device(db, 'dev-1', 'morto').register(serialA);
    await device(db, 'dev-2', 'falha').register(serialA);
    const apns = new SimulatedApnsTransport({ morto: { status: 410, reason: 'Unregistered' }, falha: { status: 500, reason: 'InternalServerError' } });
    const r = await pushPendingUpdates(db.push, apns, TYPE);
    expect(r).toMatchObject({ invalidRemoved: 1, errors: 1 });
    expect([...db.regs.values()].map((x) => x.device)).toEqual(['dev-2']);
    expect(db.passes.get(a.id)!.pushed).toBe(0); // vai voltar a tentar
    const ok = await pushPendingUpdates(db.push, new SimulatedApnsTransport(), TYPE);
    expect(ok.sent).toBe(1);
    expect(db.passes.get(a.id)!.pushed).toBe(db.passes.get(a.id)!.tag);
  });

  it('sem a flag wallet_updates no restaurante não envia; cartão anulado: push e depois remove registos', async () => {
    const db = memoryDb();
    db.add(serialB, 'rB');
    const a = db.add(serialA);
    await device(db, 'dev-1', 't').register(serialA);
    await device(db, 'dev-1', 't').register(serialB);
    const apns = new SimulatedApnsTransport();
    const r = await pushPendingUpdates(db.push, apns, TYPE);
    expect(r.skippedFlagOff).toBe(1);
    db.touch(a.id, { voided: true });
    await pushPendingUpdates(db.push, apns, TYPE);
    expect([...db.regs.values()].some((x) => x.passId === a.id)).toBe(false);
  });

  it('envio simulado não conta como envio real na saúde do APNs', async () => {
    const db = memoryDb();
    db.add(serialA);
    await device(db, 'dev-1', 't').register(serialA);
    await pushPendingUpdates(db.push, new SimulatedApnsTransport(), TYPE);
    expect(db.events).toEqual([{ passId: 'id-aaaa', status: 'skipped', reason: 'simulado' }]);
  });
});
