import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));

describe('critério 4: o servidor nunca recebe a localização do cliente', () => {
  it('nenhuma rota da Wallet nem o serviço web lê localização do pedido', () => {
    const files = [...walk(join(__dirname, '../../src/app/api/wallet')), join(__dirname, '../../src/server/wallet/webservice.ts')];
    expect(files.length).toBeGreaterThan(4);
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/latitude|longitude|geolocation|\blat\b|\blng\b|coords/i);
    }
  });
});
