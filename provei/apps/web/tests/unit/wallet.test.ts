import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildStorePassJson } from '@provei/domain';
import { ApplePassKitProvider, SimulatedAppleProvider, passBundleFiles } from '@/server/wallet/provider';
import { authTokenFor, memberTokenFor, safeEqualHex, sha256Hex, signDownload, verifyDownload } from '@/server/wallet/tokens';

const pass = buildStorePassJson({
  passTypeIdentifier: 'pass.pt.provei.teste',
  teamIdentifier: 'TESTE12345',
  serialNumber: 'f'.repeat(32),
  authenticationToken: authTokenFor('f'.repeat(32)),
  webServiceURL: 'https://provei.example/api/wallet/apple',
  memberToken: memberTokenFor('f'.repeat(32), 1),
  restaurant: { name: 'Café Teste', locations: [] },
  points: 40,
  level: 'Convidado',
  progress: '1 de 8 carimbos',
  withLocations: false,
  links: { terms: 'https://provei.example/legal/termos', privacy: 'https://provei.example/legal/privacidade' },
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe('assinatura do .pkpass (certificados de teste gerados aqui, nunca reais)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pv-wallet-'));
  let certs: { signerCert: string; signerKey: string; wwdr: string };
  beforeAll(() => {
    const ossl = (...a: string[]) => execFileSync('openssl', a, { cwd: dir, stdio: 'pipe' });
    ossl('req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'ca.key', '-out', 'ca.pem', '-days', '2', '-subj', '/CN=Teste WWDR');
    ossl('req', '-newkey', 'rsa:2048', '-nodes', '-keyout', 'signer.key', '-out', 'signer.csr', '-subj', '/CN=Pass Type ID: pass.pt.provei.teste');
    ossl('x509', '-req', '-in', 'signer.csr', '-CA', 'ca.pem', '-CAkey', 'ca.key', '-CAcreateserial', '-out', 'signer.pem', '-days', '2');
    certs = { signerCert: readFileSync(join(dir, 'signer.pem'), 'utf8'), signerKey: readFileSync(join(dir, 'signer.key'), 'utf8'), wwdr: readFileSync(join(dir, 'ca.pem'), 'utf8') };
  });

  it('o manifesto cobre todos os ficheiros e a assinatura PKCS#7 verifica contra a cadeia', async () => {
    const out = await new ApplePassKitProvider(certs).render(pass);
    expect(out.contentType).toBe('application/vnd.apple.pkpass');
    const zip = join(dir, 'p.pkpass');
    writeFileSync(zip, out.body);
    const ex = join(dir, 'x');
    execFileSync('unzip', ['-q', '-o', zip, '-d', ex]);
    const files = walk(ex).map((p) => relative(ex, p)).sort();
    expect(files).toEqual(expect.arrayContaining(['pass.json', 'manifest.json', 'signature', 'icon.png', 'icon@2x.png', 'logo.png', 'strip.png', 'pt.lproj/pass.strings']));
    const manifest = JSON.parse(readFileSync(join(ex, 'manifest.json'), 'utf8')) as Record<string, string>;
    for (const f of files.filter((f) => f !== 'manifest.json' && f !== 'signature')) {
      expect(manifest[f], f).toBe(createHash('sha1').update(readFileSync(join(ex, f))).digest('hex'));
    }
    const signed = JSON.parse(readFileSync(join(ex, 'pass.json'), 'utf8'));
    expect(signed).toMatchObject({ serialNumber: 'f'.repeat(32), sharingProhibited: true, storeCard: { headerFields: [{ key: 'points', value: 40 }] } });
    // verificação independente da assinatura destacada sobre o manifesto
    execFileSync('openssl', ['smime', '-verify', '-binary', '-inform', 'DER', '-in', join(ex, 'signature'), '-content', join(ex, 'manifest.json'), '-CAfile', join(dir, 'ca.pem'), '-purpose', 'any', '-out', '/dev/null'], { stdio: 'pipe' });
    // um manifesto adulterado já não verifica
    writeFileSync(join(ex, 'manifest.json'), JSON.stringify({ ...manifest, 'pass.json': '0'.repeat(40) }));
    expect(() =>
      execFileSync('openssl', ['smime', '-verify', '-binary', '-inform', 'DER', '-in', join(ex, 'signature'), '-content', join(ex, 'manifest.json'), '-CAfile', join(dir, 'ca.pem'), '-purpose', 'any', '-out', '/dev/null'], { stdio: 'pipe' }),
    ).toThrow();
  });

  it('o pacote tem a localização pt-PT e as imagens obrigatórias', () => {
    const files = passBundleFiles(pass);
    expect(Object.keys(files)).toEqual(expect.arrayContaining(['pass.json', 'icon.png', 'pt.lproj/pass.strings']));
    expect(files['pt.lproj/pass.strings']!.toString()).toContain('"Pontos" = "Pontos";');
  });

  it('sem certificados o fornecedor real não está configurado; o simulado devolve o pass.json', async () => {
    expect(new ApplePassKitProvider(null).isConfigured()).toBe(false);
    const sim = await new SimulatedAppleProvider().render(pass);
    expect(JSON.parse(sim.body.toString())).toMatchObject({ serialNumber: 'f'.repeat(32) });
  });
});

describe('tokens da Wallet', () => {
  it('authenticationToken: ≥ 32 bytes, determinístico por número de série; token do QR roda com a versão', () => {
    const a = authTokenFor('a'.repeat(32));
    expect(Buffer.from(a, 'base64url').length).toBe(32);
    expect(authTokenFor('a'.repeat(32))).toBe(a);
    expect(authTokenFor('b'.repeat(32))).not.toBe(a);
    expect(memberTokenFor('a'.repeat(32), 1)).not.toBe(memberTokenFor('a'.repeat(32), 2));
  });
  it('comparação segura de hashes', () => {
    const h = sha256Hex('x');
    expect(safeEqualHex(h, sha256Hex('x'))).toBe(true);
    expect(safeEqualHex(h, sha256Hex('y'))).toBe(false);
    expect(safeEqualHex(h, 'abc')).toBe(false);
  });
  it('URL de descarga assinado expira e não aceita adulteração', () => {
    const id = '11111111-2222-3333-4444-555555555555';
    const t = signDownload(id, 300, 1_700_000_000_000);
    expect(verifyDownload(t, 1_700_000_100_000)).toBe(id);
    expect(verifyDownload(t, 1_700_000_400_000)).toBeNull();
    expect(verifyDownload(t.replace(id, '11111111-2222-3333-4444-555555555556'), 1_700_000_100_000)).toBeNull();
    expect(verifyDownload('lixo')).toBeNull();
  });
});
