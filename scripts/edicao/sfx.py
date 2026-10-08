# SFX leves gerados por código, um por tipo de animação: pop, whoosh, notif, type, click, tick, shimmer.
# Uso: sfx.py <duracao_s> <eventos.json> <saida.wav>
import json, sys, wave
import numpy as np
SR = 48000
dur = float(sys.argv[1]); events = json.load(open(sys.argv[2])); out = sys.argv[3]
N = int(dur * SR); buf = np.zeros((N, 2)); rng = np.random.default_rng(11)
def t_(sec): return np.arange(int(sec * SR)) / SR
def lp(x, fc):
    a = np.exp(-2 * np.pi * fc / SR); y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc = (1 - a) * x[i] + a * acc; y[i] = acc
    return y
def place(sig, t, gain, pan=0.5):
    i0 = int(t * SR); i1 = min(N, i0 + len(sig))
    if i0 >= N or i1 <= i0: return
    s = sig[: i1 - i0] / (np.max(np.abs(sig)) + 1e-9) * gain
    buf[i0:i1, 0] += s * np.sqrt(1 - pan); buf[i0:i1, 1] += s * np.sqrt(pan)
def pop():
    tt = t_(0.12); f = 380 + 420 * (1 - np.exp(-tt / 0.02))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.035) * np.minimum(1, tt / 0.002)
def whoosh():
    pre, post = 0.32, 0.25; tt = t_(pre + post) - pre
    n = rng.standard_normal(len(tt)); out = np.empty_like(n); l1 = l2 = 0.0
    fc = np.where(tt < 0, 300 + 2600 * (1 + tt / pre) ** 2, 2900 * np.exp(-tt / 0.09) + 350)
    for i in range(len(n)):
        a = np.exp(-2 * np.pi * fc[i] / SR); l1 = (1 - a) * n[i] + a * l1
        a2 = np.exp(-2 * np.pi * fc[i] * 0.3 / SR); l2 = (1 - a2) * n[i] + a2 * l2
        out[i] = l1 - l2
    return out * np.where(tt < 0, (1 + tt / pre) ** 2.2, np.exp(-tt / 0.08)), pre
def notif():
    tt = t_(0.7); s = np.zeros_like(tt)
    for f0, d in ((1046.5, 0.0), (1568.0, 0.085)):
        m = tt >= d; x = tt[m] - d
        s[m] += (np.sin(2 * np.pi * f0 * x) + 0.25 * np.sin(2 * np.pi * 2 * f0 * x) * np.exp(-x / 0.05)) * np.exp(-x / 0.22) * np.minimum(1, x / 0.003)
    return s
def type_():
    tt = t_(0.03); n = rng.standard_normal(len(tt))
    n = n - lp(n, 1800); n = lp(n, 6000)
    return n * np.exp(-tt / 0.006) + 0.3 * np.sin(2 * np.pi * (2600 + rng.integers(-300, 300)) * tt) * np.exp(-tt / 0.004)
def click():
    s = np.zeros(int(0.08 * SR))
    for d, g in ((0.0, 1.0), (0.045, 0.7)):
        tt = t_(0.02); n = rng.standard_normal(len(tt)); n = n - lp(n, 1500)
        c = (n * np.exp(-tt / 0.003) + 0.5 * np.sin(2 * np.pi * 3200 * tt) * np.exp(-tt / 0.003)) * g
        i = int(d * SR); s[i:i + len(c)] += c
    return s
def tick():
    tt = t_(0.06)
    return np.sin(2 * np.pi * 1850 * tt) * np.exp(-tt / 0.012) + 0.4 * np.sin(2 * np.pi * 3700 * tt) * np.exp(-tt / 0.006)
def shimmer():
    tt = t_(1.2); s = np.zeros_like(tt)
    for k, f0 in enumerate((1318.5, 1568.0, 1975.5, 2637.0)):
        d = k * 0.055; m = tt >= d; x = tt[m] - d
        s[m] += np.sin(2 * np.pi * f0 * x * (1 + 0.002 * np.sin(2 * np.pi * 6 * x))) * np.exp(-x / 0.35) * np.minimum(1, x / 0.004) * (0.9 ** k)
    air = rng.standard_normal(len(tt)); air = air - lp(air, 5000)
    s += 0.08 * air * np.exp(-((tt - 0.25) / 0.2) ** 2)
    return s
GAIN = {"pop": 0.11, "whoosh": 0.10, "notif": 0.085, "type": 0.045, "click": 0.075, "tick": 0.065, "shimmer": 0.07}
pans = {"type": 0.55, "click": 0.6, "tick": 0.5}
for t, kind in events:
    if kind == "whoosh":
        s, pre = whoosh(); place(s, max(0, t - pre), GAIN[kind], 0.5)
    else:
        s = {"pop": pop, "notif": notif, "type": type_, "click": click, "tick": tick, "shimmer": shimmer}[kind]()
        place(s, t, GAIN[kind], pans.get(kind, 0.5))
x = np.clip(buf, -1, 1)
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
print(len(events), "SFX em", out)
