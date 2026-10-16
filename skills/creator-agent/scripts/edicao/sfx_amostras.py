# SFX com sons reais (amostras) em vez de sons gerados: um som por tipo de animação, cortado,
# alinhado pelo impacto e normalizado para uma sonoridade leve (LUFS momentâneo máximo).
# Uso: sfx_amostras.py <duracao_s> <eventos.json> <mapa.json> <pasta_dos_sons> <saida.wav>
# eventos.json: [[tempo_s, tipo], ...] ou [[tempo_s, tipo, ajuste_dB], ...]
# mapa.json: {"tipo": {"ficheiro", "de", "ate", "impacto", "lufs", "fade", "pan", "semitons", "pans", "teclas", "dur", "pre"}}
import json, os, subprocess, sys, wave
import numpy as np
from scipy.signal import lfilter
SR = 48000
dur = float(sys.argv[1]); events = json.load(open(sys.argv[2])); mapa = json.load(open(sys.argv[3]))
pasta = sys.argv[4]; out = sys.argv[5]
N = int(dur * SR); buf = np.zeros((N, 2)); rng = np.random.default_rng(7)

def ler(nome):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(pasta, nome), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64).reshape(-1, 2)

def kpond(x):
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]; a1 = [1.0, -1.69065929318241, 0.73248077421585]
    b2 = [1.0, -2.0, 1.0]; a2 = [1.0, -1.99004745483398, 0.99007225036621]
    return lfilter(b2, a2, lfilter(b1, a1, x, axis=0), axis=0)

def lufs_m(x):
    y = kpond(np.vstack([np.zeros((int(0.4 * SR), 2)), x, np.zeros((int(0.4 * SR), 2))]))
    w = int(0.4 * SR); h = int(0.01 * SR); best = -120.0
    for i in range(0, len(y) - w + 1, h):
        p = np.mean(y[i:i + w] ** 2, axis=0).sum()
        if p > 0: best = max(best, -0.691 + 10 * np.log10(p))
    return best

def envolver(x, fade):
    n = len(x); e = np.ones(n)
    fi = min(n, int(0.003 * SR)); e[:fi] = np.linspace(0, 1, fi)
    fo = min(n, max(int(0.005 * SR), int(fade * SR)))
    e[n - fo:] *= np.cos(np.linspace(0, np.pi / 2, fo)) ** 2
    return x * e[:, None]

def cortar(c):
    x = ler(c["ficheiro"]); a = int(c.get("de", 0) * SR); b = int(c.get("ate", len(x) / SR) * SR)
    return envolver(x[a:b], c.get("fade", 0.02))

def tom(x, semitons):
    if not semitons: return x
    r = 2 ** (semitons / 12); n = int(len(x) / r); t = np.arange(n) * r
    return np.stack([np.interp(t, np.arange(len(x)), x[:, k]) for k in range(2)], axis=1)

def normalizar(x, alvo):
    return x * 10 ** ((alvo - lufs_m(x)) / 20)

def colocar(x, t, pan=0.5):
    i0 = int(round(t * SR)); s0 = 0
    if i0 < 0: s0 = -i0; i0 = 0
    i1 = min(N, i0 + len(x) - s0)
    if i1 <= i0: return
    g = np.array([np.sqrt(2 * (1 - pan)), np.sqrt(2 * pan)])
    buf[i0:i1] += x[s0:s0 + i1 - i0] * np.minimum(1.0, g)

cache = {}
def amostra(tipo):
    if tipo not in cache:
        c = mapa[tipo]
        if "teclas" in c:
            x = ler(c["ficheiro"]); pre = c.get("pre", 0.004); d = c.get("dur", 0.08)
            cache[tipo] = [normalizar(envolver(x[int((t - pre) * SR): int((t - pre + d) * SR)], 0.02), c["lufs"]) for t in c["teclas"]]
        else:
            cache[tipo] = normalizar(cortar(c), c["lufs"])
    return cache[tipo]

contagem = {}
for ev in events:
    t, tipo = ev[0], ev[1]; ajuste = ev[2] if len(ev) > 2 else 0.0
    if tipo not in mapa:
        print(f"AVISO sem som para '{tipo}' (t={t}); acrescenta-o ao mapa", file=sys.stderr); continue
    c = mapa[tipo]; k = contagem.get(tipo, 0); contagem[tipo] = k + 1
    g = 10 ** (ajuste / 20)
    if "teclas" in c:
        lista = amostra(tipo); x = lista[k % len(lista)] * 10 ** (rng.uniform(-1.5, 1.5) / 20)
        colocar(x * g, t - c.get("pre", 0.004), c.get("pan", 0.5))
        continue
    x = amostra(tipo)
    if "semitons" in c:
        st = c["semitons"][k % len(c["semitons"])]
        x = normalizar(tom(x, st), c["lufs"])
    pan = c["pans"][k % len(c["pans"])] if "pans" in c else c.get("pan", 0.5)
    colocar(x * g, t - c.get("impacto", 0.0), pan)

x = np.clip(buf, -1, 1)
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
print(len(events), "SFX em", out, "| pico", round(20 * np.log10(np.abs(x).max() + 1e-9), 1), "dBFS")
