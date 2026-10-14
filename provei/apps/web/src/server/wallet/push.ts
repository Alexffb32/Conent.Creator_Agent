import 'server-only';
import { isInvalidToken, type ApnsTransport } from './apns';

export interface PendingPass {
  id: string;
  restaurantId: string;
  updateTag: number;
  voided: boolean;
}

export interface PushStore {
  /** Cartões Apple com update_tag > pushed_tag (opcionalmente só estes ids). */
  pending(passIds?: string[], limit?: number): Promise<PendingPass[]>;
  updatesEnabled(restaurantId: string): Promise<boolean>;
  registrations(passId: string): Promise<{ deviceId: string; pushToken: string }[]>;
  deleteRegistration(deviceId: string, passId: string): Promise<void>;
  deleteAllRegistrations(passId: string): Promise<void>;
  /** Marca como enviado SÓ se a etiqueta não mudou entretanto (senão fica pendente para o próximo envio). */
  markPushed(passId: string, updateTag: number): Promise<void>;
  logEvent(e: { passId: string; status: 'sent' | 'invalid_token' | 'error' | 'skipped'; reason?: string }): Promise<void>;
}

export interface PushReport {
  passes: number;
  sent: number;
  invalidRemoved: number;
  errors: number;
  skippedFlagOff: number;
}

/**
 * Envia o push de atualização (payload vazio) a cada dispositivo registado nos cartões com alterações.
 * Token inválido → apaga o registo. Cartão anulado → depois do push, remove os registos.
 * O aviso de pontos em si é a `changeMessage` do campo `points`: o iOS mostra-o quando o valor muda
 * e o utilizador tem as notificações do cartão ativas.
 */
export async function pushPendingUpdates(store: PushStore, apns: ApnsTransport, topic: string, opts: { passIds?: string[]; limit?: number } = {}): Promise<PushReport> {
  const report: PushReport = { passes: 0, sent: 0, invalidRemoved: 0, errors: 0, skippedFlagOff: 0 };
  const passes = await store.pending(opts.passIds, opts.limit ?? 200);
  const enabled = new Map<string, boolean>();
  for (const p of passes) {
    if (!enabled.has(p.restaurantId)) enabled.set(p.restaurantId, await store.updatesEnabled(p.restaurantId));
    // anulações (conta apagada) seguem sempre, mesmo com wallet_updates desligada
    if (!enabled.get(p.restaurantId) && !p.voided) {
      report.skippedFlagOff++;
      continue;
    }
    report.passes++;
    let failed = false;
    for (const reg of await store.registrations(p.id)) {
      const r = await apns.send(reg.pushToken, topic);
      if (r.status === 200) {
        report.sent++;
        // simulado (dev/testes): não conta como envio real na saúde do APNs
        await store.logEvent(apns.simulated ? { passId: p.id, status: 'skipped', reason: 'simulado' } : { passId: p.id, status: 'sent' });
      } else if (isInvalidToken(r)) {
        report.invalidRemoved++;
        await store.deleteRegistration(reg.deviceId, p.id);
        await store.logEvent({ passId: p.id, status: 'invalid_token', reason: r.reason ?? String(r.status) });
      } else {
        report.errors++;
        failed = true;
        await store.logEvent({ passId: p.id, status: 'error', reason: (r.reason ?? `HTTP ${r.status}`).slice(0, 120) });
      }
    }
    if (failed) continue; // fica pendente: volta a tentar no próximo envio
    if (p.voided) await store.deleteAllRegistrations(p.id);
    await store.markPushed(p.id, p.updateTag);
  }
  return report;
}
