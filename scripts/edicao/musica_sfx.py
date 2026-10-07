# Gera por código (sem amostras de terceiros) a música de fundo calma e os SFX (whoosh e pop).
# Uso: python3 musica_sfx.py <duracao_s> <saida_musica.wav> <saida_sfx.wav> '<json eventos [[t, "whoosh"|"pop"], ...]>'
import json, sys, wave
import numpy as np

SR = 48000
dur = float(sys.argv[1]); out_mus, out_sfx = sys.argv[2], sys.argv[3]
events = json.loads(sys.argv[4])
N = int(dur * SR)
t_all = np.arange(N) / SR
rng = np.random.default_rng(7)  # determinístico

def write(path, st):
    st = np.clip(st, -1, 1)
    data = (st * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(data.tobytes())

def onepole_lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc = (1 - a) * x[i] + a * acc; y[i] = acc
    return y

# ---------- música: 90 BPM, Am9 / Fmaj7 / Cmaj7 / G6 ----------
BPM = 90; beat = 60 / BPM; bar = 4 * beat
chords = [  # (baixo, notas do pad)
    (110.00, [220.00, 261.63, 329.63, 392.00, 493.88]),
    (87.31, [174.61, 220.00, 261.63, 329.63]),
    (130.81, [261.63, 329.63, 392.00, 493.88]),
    (98.00, [196.00, 246.94, 293.66, 329.63]),
]
L = np.zeros(N); R = np.zeros(N)
nbars = int(np.ceil(dur / bar)) + 1
for b in range(nbars):
    t0 = b * bar
    root, notes = chords[b % 4]
    # pad: harmónicos suaves, desafinação ligeira entre canais, ataque e libertação longos
    s0, s1 = int(max(0, t0 - 0.3) * SR), int(min(dur, t0 + bar + 0.9) * SR)
    if s0 >= N: break
    tt = t_all[s0:s1] - (t0 - 0.3)
    span = bar + 1.2
    env = np.minimum(1, tt / 0.9) * np.minimum(1, np.maximum(0, (span - tt) / 0.9))
    for f in notes:
        for ch, det in ((L, -0.0018), (R, 0.0018)):
            ff = f * (1 + det)
            sig = sum((0.6 / h ** 1.6) * np.sin(2 * np.pi * ff * h * tt + h) for h in (1, 2, 3, 4))
            ch[s0:s1] += 0.045 * env * sig
    # baixo: tempos 1 e 3
    for k in (0, 2):
        tb = t0 + k * beat
        a0, a1 = int(tb * SR), int(min(dur, tb + beat * 1.8) * SR)
        if a0 >= N: continue
        tt = t_all[a0:a1] - tb
        e = np.minimum(1, tt / 0.02) * np.exp(-tt / 0.7)
        sb = 0.16 * e * (np.sin(2 * np.pi * root * tt) + 0.25 * np.sin(2 * np.pi * root * 2 * tt))
        L[a0:a1] += sb; R[a0:a1] += sb
    # bombo suave: tempos 1 e 3
    for k in (0, 2):
        tb = t0 + k * beat
        a0, a1 = int(tb * SR), int(min(dur, tb + 0.35) * SR)
        if a0 >= N: continue
        tt = t_all[a0:a1] - tb
        f = 45 + 40 * np.exp(-tt / 0.03)
        ph = 2 * np.pi * np.cumsum(f) / SR
        sk = 0.30 * np.exp(-tt / 0.11) * np.sin(ph)
        L[a0:a1] += sk; R[a0:a1] += sk
    # shaker em colcheias, muito baixo
    for k in range(8):
        tb = t0 + k * beat / 2
        a0, a1 = int(tb * SR), int(min(dur, tb + 0.09) * SR)
        if a0 >= N or a1 <= a0: continue
        tt = t_all[a0:a1] - tb
        n = rng.standard_normal(a1 - a0)
        n = n - onepole_lp(n, 3500)  # passa-alto simples
        g = (0.020 if k % 2 else 0.012) * np.exp(-tt / 0.03)
        pan = 0.6 if k % 2 else 0.4
        L[a0:a1] += g * n * (1 - pan); R[a0:a1] += g * n * pan
    # sino em arpejo, notas do acorde em colcheias, discreto
    arp = notes[1:] + notes[1:-1][::-1]
    for k in range(8):
        tb = t0 + k * beat / 2
        a0, a1 = int(tb * SR), int(min(dur, tb + 1.2) * SR)
        if a0 >= N: continue
        tt = t_all[a0:a1] - tb
        f = arp[k % len(arp)] * 2
        e = np.minimum(1, tt / 0.005) * np.exp(-tt / 0.35)
        sbell = 0.022 * e * (np.sin(2 * np.pi * f * tt) + 0.3 * np.sin(2 * np.pi * f * 2.76 * tt) * np.exp(-tt / 0.1))
        pan = 0.3 + 0.4 * ((k * 3) % 8) / 7
        L[a0:a1] += sbell * (1 - pan); R[a0:a1] += sbell * pan

# espaço: atraso estéreo com realimentação (meio tempo)
def delay(x, d, fb, mix):
    n = int(d * SR); y = x.copy()
    for i in range(n, len(x)): y[i] += fb * y[i - n]
    return (1 - mix) * x + mix * y
L, R = delay(L, beat / 2, 0.35, 0.25), delay(R, beat * 0.75, 0.35, 0.25)
fade = np.minimum(1, t_all / 1.0) * np.minimum(1, np.maximum(0, (dur - t_all) / 1.8))
mus = np.stack([L * fade, R * fade], axis=1)
mus /= np.max(np.abs(mus)) / 0.7
write(out_mus, mus)

# ---------- SFX ----------
sfx = np.zeros((N, 2))
def whoosh(t):
    pre, post = 0.38, 0.22
    a0 = int((t - pre) * SR); a1 = int((t + post) * SR)
    a0 = max(0, a0); a1 = min(N, a1)
    tt = (np.arange(a1 - a0) / SR) - (t - pre - a0 / SR) - pre  # 0 no impacto
    n = rng.standard_normal(a1 - a0)
    # filtro passa-banda que sobe até ao impacto e desce depois
    out = np.empty_like(n); lp1 = 0.0; lp2 = 0.0
    fc = np.where(tt < 0, 400 + 3600 * (1 + tt / pre) ** 2, 4000 * np.exp(-tt / 0.08) + 500)
    for i in range(len(n)):
        a = np.exp(-2 * np.pi * fc[i] / SR)
        lp1 = (1 - a) * n[i] + a * lp1
        a2 = np.exp(-2 * np.pi * (fc[i] * 0.25) / SR)
        lp2 = (1 - a2) * n[i] + a2 * lp2
        out[i] = lp1 - lp2
    env = np.where(tt < 0, (1 + tt / pre) ** 2.5, np.exp(-tt / 0.07))
    sig = out * env
    sig /= np.max(np.abs(sig)) + 1e-9
    pan = np.clip((tt + pre) / (pre + post), 0, 1)
    sfx[a0:a1, 0] += 0.13 * sig * (1 - 0.6 * pan)
    sfx[a0:a1, 1] += 0.13 * sig * (0.4 + 0.6 * pan)
def pop(t):
    a0, a1 = int(t * SR), min(N, int((t + 0.12) * SR))
    tt = np.arange(a1 - a0) / SR
    f = 600 + 700 * np.exp(-tt / 0.012)
    ph = 2 * np.pi * np.cumsum(f) / SR
    sig = np.minimum(1, tt / 0.002) * np.exp(-tt / 0.03) * np.sin(ph)
    sig += 0.15 * np.exp(-tt / 0.004) * rng.standard_normal(len(tt))
    sfx[a0:a1, 0] += 0.16 * sig; sfx[a0:a1, 1] += 0.16 * sig
last = -9
for t, kind in sorted(events):
    if t - last < 3.0:
        print(f"SFX ignorado a {t}s (menos de 3 s do anterior)"); continue
    (whoosh if kind == "whoosh" else pop)(t); last = t
write(out_sfx, sfx)
print("música e SFX gerados", dur, "s")
