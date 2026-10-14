/**
 * Cartão de fidelidade para a Apple Wallet (tipo storeCard) — construção pura do pass.json.
 * Sem Node, sem assinatura: a assinatura é feita no servidor (apps/web/src/server/wallet/).
 * Regras: nenhum dado pessoal no código de barras (só um token opaco), sem e-mail nem telefone do cliente,
 * nome próprio só se o cliente quiser, `sharingProhibited`.
 */

export const WALLET_COLORS = {
  background: 'rgb(45, 127, 26)', // #2D7F1A
  foreground: 'rgb(255, 255, 255)', // #FFFFFF
  label: 'rgb(244, 249, 238)', // #F4F9EE
} as const;

export const MAX_PASS_LOCATIONS = 10;
export const CONTROL_GROUP_PERCENT = 10;

export interface PassLocation {
  latitude: number;
  longitude: number;
}

export interface StorePassInput {
  passTypeIdentifier: string;
  teamIdentifier: string;
  serialNumber: string;
  authenticationToken: string;
  webServiceURL: string;
  memberToken: string;
  restaurant: { name: string; phone?: string | null; locations: PassLocation[] };
  points: number;
  level: string;
  /** Progresso para a próxima recompensa, já em texto (ex.: "3 de 8 carimbos"). */
  progress: string;
  /** Oferta ativa (campo `offer`); vazio por omissão. */
  offer?: string | null;
  /** Nome próprio, só com escolha do cliente. */
  holderFirstName?: string | null;
  /** Flag `wallet_location` e cartão fora do grupo de controlo. */
  withLocations: boolean;
  relevantText?: string;
  /** Interruptor "avisos de pontos" do cliente: desligado, o campo muda sem aviso (sem changeMessage). */
  pointsAlerts?: boolean;
  voided?: boolean;
  links: { terms: string; privacy: string };
}

export interface PassField {
  key: string;
  label?: string;
  value: string | number;
  changeMessage?: string;
  textAlignment?: string;
}

export interface StorePassJson {
  formatVersion: 1;
  passTypeIdentifier: string;
  teamIdentifier: string;
  organizationName: string;
  description: string;
  serialNumber: string;
  authenticationToken: string;
  webServiceURL: string;
  backgroundColor: string;
  foregroundColor: string;
  labelColor: string;
  logoText: string;
  sharingProhibited: true;
  voided?: true;
  barcodes: { format: 'PKBarcodeFormatQR'; message: string; messageEncoding: 'iso-8859-1' }[];
  locations?: (PassLocation & { relevantText?: string })[];
  storeCard: {
    headerFields: PassField[];
    primaryFields: PassField[];
    secondaryFields: PassField[];
    auxiliaryFields: PassField[];
    backFields: PassField[];
  };
}

/** Mensagem do aviso de pontos (o iOS substitui %@ pelo novo valor; só dispara quando o valor muda). */
export const pointsChangeMessage = (restaurantName: string) => `Tens %@ pontos no ${restaurantName.replace(/%/g, '%%')}`;

export function buildStorePassJson(i: StorePassInput): StorePassJson {
  if (i.authenticationToken.length < 32) throw new Error('authenticationToken tem de ter pelo menos 32 caracteres');
  if (!i.webServiceURL.startsWith('https://')) throw new Error('webServiceURL tem de ser HTTPS');
  if (!/^[A-Za-z0-9_-]{16,}$/.test(i.memberToken)) throw new Error('memberToken inválido');

  const secondary: PassField[] = [{ key: 'level', label: 'Nível', value: i.level }];
  if (i.holderFirstName) secondary.push({ key: 'holder', label: 'Cliente', value: i.holderFirstName.slice(0, 30), textAlignment: 'PKTextAlignmentRight' });

  const back: PassField[] = [
    {
      key: 'terms',
      label: 'Termos do programa',
      value: `Os pontos são atribuídos pelo restaurante quando a equipa lê este cartão. Não têm valor em dinheiro. Termos: ${i.links.terms}`,
    },
    { key: 'privacy', label: 'Privacidade', value: `Este cartão não guarda o teu e-mail nem o teu telefone. Política de privacidade: ${i.links.privacy}` },
    {
      key: 'notifications',
      label: 'Como desligar os avisos',
      value: 'No iPhone: abre o cartão, toca em ⋯ › Detalhes do cartão e desliga "Notificações". Também podes desligar os avisos de pontos na app Provei, em Perfil › Definições.',
    },
  ];
  if (i.restaurant.phone) back.push({ key: 'contact', label: `Contacto · ${i.restaurant.name}`, value: i.restaurant.phone });

  const pass: StorePassJson = {
    formatVersion: 1,
    passTypeIdentifier: i.passTypeIdentifier,
    teamIdentifier: i.teamIdentifier,
    organizationName: 'Provei',
    description: `Cartão de fidelidade ${i.restaurant.name}`,
    serialNumber: i.serialNumber,
    authenticationToken: i.authenticationToken,
    webServiceURL: i.webServiceURL,
    backgroundColor: WALLET_COLORS.background,
    foregroundColor: WALLET_COLORS.foreground,
    labelColor: WALLET_COLORS.label,
    logoText: i.restaurant.name,
    sharingProhibited: true,
    barcodes: [{ format: 'PKBarcodeFormatQR', message: `provei:w:${i.memberToken}`, messageEncoding: 'iso-8859-1' }],
    storeCard: {
      headerFields: [
        i.pointsAlerts === false
          ? { key: 'points', label: 'Pontos', value: i.points }
          : { key: 'points', label: 'Pontos', value: i.points, changeMessage: pointsChangeMessage(i.restaurant.name) },
      ],
      primaryFields: [{ key: 'progress', label: 'Próxima recompensa', value: i.progress }],
      secondaryFields: secondary,
      auxiliaryFields: [{ key: 'offer', label: 'Oferta', value: i.offer ?? '', changeMessage: '%@' }],
      backFields: back,
    },
  };
  if (i.voided) pass.voided = true;
  if (i.withLocations && i.restaurant.locations.length) {
    pass.locations = i.restaurant.locations.slice(0, MAX_PASS_LOCATIONS).map((l) => ({
      latitude: l.latitude,
      longitude: l.longitude,
      ...(i.relevantText ? { relevantText: i.relevantText.slice(0, 60) } : {}),
    }));
  }
  return pass;
}

/** Textos do cartão em pt-PT (pt.lproj/pass.strings). Os rótulos do pass.json já estão em pt-PT. */
export function passStringsPt(): string {
  const pairs: [string, string][] = [
    ['Pontos', 'Pontos'],
    ['Próxima recompensa', 'Próxima recompensa'],
    ['Nível', 'Nível'],
    ['Oferta', 'Oferta'],
    ['Cliente', 'Cliente'],
    ['Termos do programa', 'Termos do programa'],
    ['Privacidade', 'Privacidade'],
    ['Como desligar os avisos', 'Como desligar os avisos'],
  ];
  return pairs.map(([k, v]) => `"${k}" = "${v}";`).join('\n') + '\n';
}

/** FNV-1a 32 bits: determinístico e sem dependências (não é criptográfico, só para repartir grupos). */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** 10% dos cartões ficam sem `locations` (grupo de controlo). Determinístico pelo número de série. */
export function isLocationControl(serialNumber: string, percent = CONTROL_GROUP_PERCENT): boolean {
  return fnv1a(`loc-control:${serialNumber}`) % 100 < percent;
}

/** Texto de progresso a partir dos carimbos. */
export function passProgressText(stamps: number, required: number): string {
  if (required <= 0) return '—';
  const s = Math.min(stamps, required);
  return s >= required ? 'Recompensa pronta a trocar' : `${s} de ${required} carimbos`;
}

/** Alerta de expiração do certificado do Pass Type ID: 60 e 30 dias antes. */
export type CertAlert = 'ok' | 'warn_60' | 'warn_30' | 'expired';
export function certAlertLevel(notAfter: Date, now = new Date()): { level: CertAlert; daysLeft: number } {
  const daysLeft = Math.floor((notAfter.getTime() - now.getTime()) / 86_400_000);
  const level: CertAlert = daysLeft < 0 ? 'expired' : daysLeft <= 30 ? 'warn_30' : daysLeft <= 60 ? 'warn_60' : 'ok';
  return { level, daysLeft };
}

/** Mínimo de cartões por grupo para o relatório arriscar uma conclusão. */
export const MIN_CARDS_PER_GROUP = 30;

export interface GroupStats {
  cards: number;
  mean: number;
}

export type EffectVerdict = 'insufficient_data' | 'no_effect' | 'positive' | 'negative';

export interface LocationEffectReport {
  treated: GroupStats;
  control: GroupStats;
  /** Diferença de médias (tratados − controlo), em visitas por cartão no período. */
  diff: number;
  /** Intervalo de confiança a 95% (aproximação normal, variâncias separadas — Welch). */
  ci95: [number, number] | null;
  verdict: EffectVerdict;
  message: string;
}

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const variance = (xs: readonly number[], m: number) => (xs.length > 1 ? xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1) : 0);

/**
 * Compara visitas por cartão entre cartões COM localizações (tratados) e SEM (controlo, 10%).
 * Diz explicitamente quando não há efeito detetável (o intervalo inclui zero) ou quando ainda há poucos dados.
 * Limitação: não há contagem de vezes que a sugestão apareceu no ecrã de bloqueio (o iOS não a dá).
 */
export function compareLocationGroups(treatedVisits: readonly number[], controlVisits: readonly number[], minPerGroup = MIN_CARDS_PER_GROUP): LocationEffectReport {
  const mt = mean(treatedVisits);
  const mc = mean(controlVisits);
  const treated = { cards: treatedVisits.length, mean: mt };
  const control = { cards: controlVisits.length, mean: mc };
  const diff = mt - mc;
  if (treatedVisits.length < minPerGroup || controlVisits.length < minPerGroup) {
    return {
      treated,
      control,
      diff,
      ci95: null,
      verdict: 'insufficient_data',
      message: `Ainda poucos cartões para medir (mínimo ${minPerGroup} em cada grupo; há ${treatedVisits.length} com localização e ${controlVisits.length} sem). Nenhuma conclusão.`,
    };
  }
  const se = Math.sqrt(variance(treatedVisits, mt) / treatedVisits.length + variance(controlVisits, mc) / controlVisits.length);
  const ci95: [number, number] = [diff - 1.96 * se, diff + 1.96 * se];
  if (ci95[0] <= 0 && ci95[1] >= 0) {
    return { treated, control, diff, ci95, verdict: 'no_effect', message: 'Sem efeito detetável: a diferença entre os grupos está dentro do que o acaso explica. O efeito pode ser zero.' };
  }
  return diff > 0
    ? { treated, control, diff, ci95, verdict: 'positive', message: 'Os cartões com aviso de proximidade tiveram mais visitas do que o grupo de controlo.' }
    : { treated, control, diff, ci95, verdict: 'negative', message: 'Os cartões com aviso de proximidade tiveram menos visitas do que o grupo de controlo.' };
}
