# Calcula os segmentos a manter: corta silêncios >= MIN_GAP, deixando PAD de respiração de cada lado.
import json, sys, numpy as np, wave
MIN_GAP, PAD = 0.25, 0.06
w = wave.open(sys.argv[1]); sr = w.getframerate()
x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
hop = int(sr * 0.01); n = len(x) // hop
rms = np.sqrt(np.mean(x[:n*hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
db = 20 * np.log10(rms)
fala = np.percentile(db, 90)
thr = float(sys.argv[3]) if len(sys.argv) > 3 else -40.0
loud = db > thr
# ignora picos curtos (< 50 ms) no meio de silêncio
i = 0
while i < n:
    if loud[i]:
        j = i
        while j < n and loud[j]: j += 1
        if j - i < 5 and i > 0 and j < n: loud[i:j] = False
        i = j
    else: i += 1
i = 0
sil = []
while i < n:
    if not loud[i]:
        j = i
        while j < n and not loud[j]: j += 1
        sil.append((i * 0.01, j * 0.01)); i = j
    else: i += 1
dur = len(x) / sr
remove = []
for a, b in sil:
    if b - a >= MIN_GAP:
        ra, rb = (a + PAD if a > 0 else 0), (b - PAD if b < dur - 0.01 else dur)
        if rb > ra: remove.append([round(ra, 3), round(rb, 3)])
# cortes manuais (frases sem ideia nova)
for a, b in json.loads(sys.argv[2]) if len(sys.argv) > 2 else []:
    remove.append([a, b])
remove.sort()
merged = []
for a, b in remove:
    if merged and a <= merged[-1][1] + 0.02: merged[-1][1] = max(merged[-1][1], b)
    else: merged.append([a, b])
keep, t = [], 0.0
for a, b in merged:
    if a > t: keep.append([round(t, 3), round(a, 3)])
    t = b
if t < dur: keep.append([round(t, 3), round(dur, 3)])
total = sum(b - a for a, b in keep)
print(f"limiar {thr:.1f} dB (fala p90 {fala:.1f}); {len(merged)} cortes; {dur:.2f}s -> {total:.2f}s ({100*(1-total/dur):.1f}% cortado)", file=sys.stderr)
for a, b in merged: print(f"  corta {a:6.2f}-{b:6.2f} ({b-a:.2f}s)", file=sys.stderr)
json.dump({"keep": keep, "removed": merged, "dur_in": dur, "dur_out": total}, sys.stdout, indent=1)
