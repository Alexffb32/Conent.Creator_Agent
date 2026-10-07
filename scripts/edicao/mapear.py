# Mapeia os tempos das palavras do original para a linha temporal cortada (pelos segmentos alinhados a fotogramas).
# Mantém todas as palavras: as que o Whisper pôs dentro de um silêncio cortado ficam no início do segmento seguinte.
import json, sys
segs = json.load(open(sys.argv[1]))["segments"]; trans = json.load(open(sys.argv[2]))
longos = [r for r in json.load(open(sys.argv[4]))["removed"] if r[1] - r[0] >= 0.8] if len(sys.argv) > 4 else []
def mapa(t):
    for s in segs:
        if t < s["src"]: return s["out"]
        if t <= s["src"] + s["dur"]: return s["out"] + (t - s["src"])
    return segs[-1]["out"] + segs[-1]["dur"]
out, prev = [], -1.0
for s in trans:
    ws = []
    for w in s["words"]:
        mid = (w["s"] + w["e"]) / 2
        if any(r[0] <= mid <= r[1] for r in longos): continue
        a, b = mapa(w["s"]), mapa(w["e"])
        a = max(a, prev + 0.06); b = max(b, a + 0.06); prev = a
        ws.append({"w": w["w"], "s": round(a, 3), "e": round(b, 3)})
    if not ws: continue
    out.append({"text": s["text"], "s": ws[0]["s"], "e": ws[-1]["e"], "words": ws})
json.dump(out, open(sys.argv[3], "w"), ensure_ascii=False, indent=1)
for s in out: print(f"{s['s']:6.2f}-{s['e']:6.2f} {s['text']}")
