# Alinha os segmentos a manter com os fotogramas reais, para áudio, vídeo e legendas usarem a mesma linha temporal.
import json, sys
cortes = json.load(open(sys.argv[1])); pts = sorted(float(l.strip().strip(",")) for l in open(sys.argv[2]) if l.strip().strip(","))
segs, out = [], 0.0
for a, b in cortes["keep"]:
    fr = [t for t in pts if a <= t < b - 0.001]
    if not fr: continue
    n = len(fr); d = n / 30
    segs.append({"src": round(fr[0], 4), "n": n, "out": round(out, 4), "dur": round(d, 4)})
    out += d
json.dump({"segments": segs, "total": round(out, 4)}, open(sys.argv[3], "w"), indent=1)
print(len(segs), "segmentos, total", round(out, 3), "s, fotogramas", sum(s["n"] for s in segs))
