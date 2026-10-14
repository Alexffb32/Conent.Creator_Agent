import 'server-only';
import { X509Certificate } from 'node:crypto';
import { PKPass } from 'passkit-generator';
import { passStringsPt, type StorePassJson } from '@provei/domain';
import { serverEnv } from '@/lib/env';
import { WALLET_IMAGES } from './assets';

export interface RenderedPass {
  body: Buffer;
  contentType: string;
  filename: string;
}

/** Fornecedor de cartões Wallet. Adaptadores: Apple (PassKit), Google (W4) e simulados para dev/testes. */
export interface WalletProvider {
  readonly platform: 'apple' | 'google';
  /** Simulado: nunca servido em produção. */
  readonly simulated: boolean;
  isConfigured(): boolean;
}

export interface AppleProvider extends WalletProvider {
  readonly platform: 'apple';
  render(pass: StorePassJson): Promise<RenderedPass>;
}

export interface AppleCertificates {
  signerCert: string;
  signerKey: string;
  signerKeyPassphrase?: string;
  wwdr: string;
}

const fromB64 = (s: string) => Buffer.from(s, 'base64').toString('utf8');

export function appleCertificatesFromEnv(): AppleCertificates | null {
  const w = serverEnv.wallet;
  if (!w.appleTypeId || !w.appleTeamId || !w.appleSignerCertB64 || !w.appleSignerKeyB64 || !w.appleWwdrB64) return null;
  return {
    signerCert: fromB64(w.appleSignerCertB64),
    signerKey: fromB64(w.appleSignerKeyB64),
    signerKeyPassphrase: w.appleSignerKeyPassphrase || undefined,
    wwdr: fromB64(w.appleWwdrB64),
  };
}

/** Ficheiros do cartão (imagens + localização pt-PT), além do pass.json. */
export function passBundleFiles(pass: StorePassJson): Record<string, Buffer> {
  const files: Record<string, Buffer> = { 'pass.json': Buffer.from(JSON.stringify(pass)) };
  for (const [name, b64] of Object.entries(WALLET_IMAGES)) files[name] = Buffer.from(b64, 'base64');
  files['pt.lproj/pass.strings'] = Buffer.from(passStringsPt(), 'utf8');
  return files;
}

/** Apple Wallet real: gera e assina o .pkpass (manifesto SHA-1 + assinatura PKCS#7 com o certificado do Pass Type ID). */
export class ApplePassKitProvider implements AppleProvider {
  readonly platform = 'apple' as const;
  readonly simulated = false;
  constructor(
    private readonly certs: AppleCertificates | null = appleCertificatesFromEnv(),
    private readonly now: () => Date = () => new Date(),
  ) {}
  isConfigured() {
    return this.certs !== null;
  }
  async render(pass: StorePassJson): Promise<RenderedPass> {
    if (!this.certs) throw new Error('Certificados Apple Wallet em falta');
    // certificado expirado: o iPhone recusa o cartão; falhar aqui com uma mensagem clara (alerta no admin a 60/30 dias)
    if (new Date(new X509Certificate(this.certs.signerCert).validTo) < this.now()) throw new Error('Certificado do Pass Type ID expirado: renovar (docs/runbooks/wallet-cert-renewal.md)');
    const pk = new PKPass(passBundleFiles(pass), this.certs);
    return { body: pk.getAsBuffer(), contentType: 'application/vnd.apple.pkpass', filename: 'provei.pkpass' };
  }
}

/** Simulado (dev/testes): devolve o pass.json sem assinatura, para inspeção. Nunca em produção. */
export class SimulatedAppleProvider implements AppleProvider {
  readonly platform = 'apple' as const;
  readonly simulated = true;
  isConfigured() {
    return process.env.NODE_ENV !== 'production';
  }
  async render(pass: StorePassJson): Promise<RenderedPass> {
    if (process.env.NODE_ENV === 'production') throw new Error('Fornecedor simulado não pode servir em produção');
    return { body: Buffer.from(JSON.stringify(pass, null, 2)), contentType: 'application/json; charset=utf-8', filename: 'pass.simulado.json' };
  }
}

/** Real se houver certificados; senão o simulado (só fora de produção). */
export function getAppleProvider(): AppleProvider {
  const real = new ApplePassKitProvider();
  return real.isConfigured() ? real : new SimulatedAppleProvider();
}
