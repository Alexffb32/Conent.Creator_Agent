import 'server-only';
import { X509Certificate } from 'node:crypto';
import { certAlertLevel } from '@provei/domain';
import { appleCertificatesFromEnv } from './provider';

/** Data de expiração do certificado do Pass Type ID (e do WWDR) lida dos próprios certificados. */
export function walletCertificates(now = new Date()) {
  const c = appleCertificatesFromEnv();
  if (!c) return null;
  const read = (pem: string) => {
    try {
      const x = new X509Certificate(pem);
      const notAfter = new Date(x.validTo);
      return { subject: x.subject.split('\n').find((l) => l.startsWith('CN='))?.slice(3) ?? '', notAfter, ...certAlertLevel(notAfter, now) };
    } catch {
      return null;
    }
  };
  return { signer: read(c.signerCert), wwdr: read(c.wwdr) };
}
