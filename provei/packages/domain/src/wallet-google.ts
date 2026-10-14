/**
 * Google Wallet (cartão de fidelização) — construção pura da classe (por restaurante) e do objeto (por cliente).
 * Referência: developers.google.com/wallet/retail/loyalty-cards (consultada em 2026-10-14):
 *  - `notifyPreference: "notifyOnUpdate"` no pedido de atualização dispara aviso se o campo for suportado
 *    (objeto: `loyaltyPoints.balance`, `secondaryLoyaltyPoints.balance`); é transitório, vai em cada pedido.
 *  - mensagens: `TEXT` (sem aviso) ou `TEXT_AND_NOTIFY`; avisos limitados a 3 por cartão em 24 h
 *    (acima disso: `QuotaExceededException` → voltar a `TEXT`).
 *  - `merchantLocations` (até 10): a Google decide distância, permanência e texto.
 */
import { MAX_PASS_LOCATIONS, type PassLocation } from './wallet';

export const GOOGLE_BRAND_HEX = '#2D7F1A';
export const GOOGLE_NOTIFY_LIMIT_PER_DAY = 3;

/** Ids da Google: `issuerId.sufixo`, sufixo só com letras, números, `.`, `_` e `-`. */
export const googleClassId = (issuerId: string, restaurantId: string) => `${issuerId}.provei_r_${restaurantId.replace(/[^A-Za-z0-9]/g, '')}`;
export const googleObjectId = (issuerId: string, serial: string) => `${issuerId}.${serial}`;

export interface GoogleClassInput {
  issuerId: string;
  restaurantId: string;
  restaurantName: string;
  logoUrl: string;
  locations: PassLocation[];
  withLocations: boolean;
}

export function buildGoogleLoyaltyClass(i: GoogleClassInput) {
  return {
    id: googleClassId(i.issuerId, i.restaurantId),
    issuerName: 'Provei',
    programName: i.restaurantName.slice(0, 40),
    programLogo: { sourceUri: { uri: i.logoUrl }, contentDescription: { defaultValue: { language: 'pt-PT', value: 'Provei' } } },
    hexBackgroundColor: GOOGLE_BRAND_HEX,
    countryCode: 'PT',
    reviewStatus: 'UNDER_REVIEW',
    ...(i.withLocations && i.locations.length ? { merchantLocations: i.locations.slice(0, MAX_PASS_LOCATIONS).map((l) => ({ latitude: l.latitude, longitude: l.longitude })) } : {}),
  };
}

export interface GoogleObjectInput {
  issuerId: string;
  restaurantId: string;
  serialNumber: string;
  memberToken: string;
  points: number;
  progress: string;
  level: string;
  offer?: string | null;
  holderFirstName?: string | null;
  voided?: boolean;
  locations: PassLocation[];
  withLocations: boolean;
  links: { terms: string; privacy: string };
}

export function buildGoogleLoyaltyObject(i: GoogleObjectInput) {
  if (!/^[A-Za-z0-9_-]{16,}$/.test(i.memberToken)) throw new Error('memberToken inválido');
  const text = [
    { id: 'progress', header: 'Próxima recompensa', body: i.progress },
    { id: 'level', header: 'Nível', body: i.level },
    ...(i.offer ? [{ id: 'offer', header: 'Oferta', body: i.offer }] : []),
    { id: 'terms', header: 'Termos do programa', body: 'Os pontos são atribuídos pelo restaurante quando a equipa lê este cartão. Não têm valor em dinheiro.' },
    { id: 'notifications', header: 'Como desligar os avisos', body: 'Na Google Wallet: abre o cartão › Detalhes do cartão › desliga as notificações. Também podes desligar os avisos de pontos na app Provei, em Perfil › Definições.' },
  ];
  return {
    id: googleObjectId(i.issuerId, i.serialNumber),
    classId: googleClassId(i.issuerId, i.restaurantId),
    state: i.voided ? 'INACTIVE' : 'ACTIVE',
    ...(i.holderFirstName && !i.voided ? { accountName: i.holderFirstName.slice(0, 30) } : {}),
    loyaltyPoints: { label: 'Pontos', balance: { int: i.points } },
    barcode: { type: 'QR_CODE', value: `provei:w:${i.memberToken}` },
    textModulesData: text,
    linksModuleData: {
      uris: [
        { id: 'terms', uri: i.links.terms, description: 'Termos' },
        { id: 'privacy', uri: i.links.privacy, description: 'Privacidade' },
      ],
    },
    ...(i.withLocations && i.locations.length ? { merchantLocations: i.locations.slice(0, MAX_PASS_LOCATIONS).map((l) => ({ latitude: l.latitude, longitude: l.longitude })) } : {}),
  };
}

/** Corpo do PATCH de pontos. `notify` só com o interruptor "avisos de pontos" ligado. */
export function googlePointsPatch(points: number, notify: boolean) {
  return { loyaltyPoints: { label: 'Pontos', balance: { int: points } }, ...(notify ? { notifyPreference: 'notifyOnUpdate' } : {}) };
}

/** Corpo do addMessage. `notify` = TEXT_AND_NOTIFY (só com consentimento próprio); senão TEXT. */
export function googleMessage(id: string, header: string, body: string, notify: boolean) {
  return { message: { id: id.slice(0, 60), header: header.slice(0, 60), body: body.slice(0, 500), messageType: notify ? 'TEXT_AND_NOTIFY' : 'TEXT' } };
}
