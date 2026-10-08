# Gera a composição HyperFrames (index.html) do short: legendas estilo Iman, zooms lentos e componentes UI (vidro, notificações, browser, mosaicos).
# Uso: python3 compor.py <work_dir> <config.json>
import json, re, sys, html
from pathlib import Path

W, H = 1080, 1920
VID_W = 1087  # 480x848 a cobrir 1080x1920
work = Path(sys.argv[1]); cfg = json.load(open(sys.argv[2]))
frases = json.load(open(work / "frases_cortadas.json"))
segs = json.load(open(work / "segmentos.json"))["segments"]
TOTAL_VIDEO = round(segs[-1]["out"] + segs[-1]["dur"], 3)
END_CARD = cfg["end_card"]
TOTAL = round(TOTAL_VIDEO + END_CARD, 3)

# ---------- transcrição corrigida ----------
words = []
for i, f in enumerate(frases):
    for w in f["words"]:
        words.append({"t": w["w"], "s": w["s"], "e": w["e"], "f": i})
# junta clíticos e "e-mail"
merged = []
for w in words:
    if w["t"].startswith("-") and merged and merged[-1]["f"] == w["f"]:
        prev = merged[-1]
        prev["t"] = "email" + w["t"][5:] if prev["t"] == "e" and w["t"].startswith("-mail") else prev["t"] + w["t"]
        prev["e"] = w["e"]
    else:
        merged.append(dict(w))
words = merged
def norm(t): return re.sub(r"[^\wÀ-ÿ-]", "", t.lower())
for fix in cfg["correcoes"]:
    find, repl, fi = fix["de"], fix["para"], fix.get("frase")
    for i in range(len(words) - len(find) + 1):
        win = words[i:i + len(find)]
        if [norm(x["t"]) for x in win] == [norm(x) for x in find] and (fi is None or win[0]["f"] == fi):
            s0, e0, f0 = win[0]["s"], win[-1]["e"], win[0]["f"]
            punct = re.findall(r"[,.?!]+$", win[-1]["t"])
            step = (e0 - s0) / len(repl)
            new = [{"t": r, "s": round(s0 + k * step, 3), "e": round(s0 + (k + 1) * step, 3), "f": f0} for k, r in enumerate(repl)]
            if punct: new[-1]["t"] += punct[0]
            words[i:i + len(find)] = new
            break
    else:
        print("AVISO correção não aplicada:", fix, file=sys.stderr)


# ---------- legendas estilo Iman: linhas curtas, minúsculas, light -> bold à medida que fala ----------
FUNC = {"sobre", "com", "das", "dos", "nas", "na", "ao", "à", "a", "o", "as", "os", "de", "da", "do", "em", "que", "e", "ou", "um",
        "se", "nos", "te", "eu", "tu", "no", "por", "para", "nem", "é"}
MAXW, MAXC = cfg["legendas"]["max_palavras"], cfg["legendas"]["max_caracteres"]
def chars(ws): return sum(len(x["t"]) for x in ws) + max(0, len(ws) - 1)
chunks = []
PAIRS = {tuple(norm(x) for x in d.split()) for d in cfg["destaques"] if d and len(d.split()) == 2}
def line_cost(ws, last):
    c = chars(ws); d = ws[-1]["e"] - ws[0]["s"]
    cost = 0.03 * (c - 16) ** 2
    if c > MAXC: cost += 100 * (c - MAXC)
    if len(ws) > MAXW + 1: cost += 50
    if not last and norm(ws[-1]["t"]) in FUNC: cost += 25
    if d < 0.3: cost += 30
    elif d < 0.45: cost += 15
    if len(ws) == 1 and len(ws[0]["t"]) < 9: cost += 12
    return cost
def split_clause(ws):
    """Divide uma oração em linhas com o menor custo (comprimento equilibrado, sem palavra funcional no fim,
    sem separar pares-chave, sem linhas curtas demais)."""
    n = len(ws); best = [0.0] + [float("inf")] * n; cut = [0] * (n + 1)
    for j in range(1, n + 1):
        for i in range(max(0, j - (MAXW + 2)), j):
            c = best[i] + line_cost(ws[i:j], j == n)
            if 0 < i < n and (norm(ws[i - 1]["t"]), norm(ws[i]["t"])) in PAIRS: c += 20
            if c < best[j]: best[j], cut[j] = c, i
    lines, j = [], n
    while j > 0: lines.insert(0, ws[cut[j]:j]); j = cut[j]
    return lines
by_f = {}
for w in words: by_f.setdefault(w["f"], []).append(w)
for fi, ws in sorted(by_f.items()):
    clause = []
    for w in ws:
        clause.append(w)
        if re.search(r"[,.?!]$", w["t"]):
            for l in split_clause(clause): chunks.append({"f": fi, "words": l})
            clause = []
    if clause:
        for l in split_clause(clause): chunks.append({"f": fi, "words": l})
# junta linhas demasiado curtas (< 0.4 s) à seguinte da mesma frase, se couber numa linha
def dur_of(c): return c["words"][-1]["e"] - c["words"][0]["s"]
changed = True
while changed:
    changed = False
    for k, c in enumerate(chunks[:-1]):
        nx = chunks[k + 1]
        if (dur_of(c) < 0.3 or dur_of(nx) < 0.3) and c["f"] == nx["f"] and chars(c["words"] + nx["words"]) <= MAXC + 6:
            c["words"] = c["words"] + nx["words"]; chunks.remove(nx); changed = True; break
# tempos: sem sobreposição; cada bloco acaba quando o seguinte começa (ou 0.5 s depois da última palavra numa pausa)
for k, c in enumerate(chunks):
    c["s"] = c["words"][0]["s"] - 0.04
    if k: c["s"] = max(c["s"], chunks[k - 1]["s"] + 0.1)
for k, c in enumerate(chunks):
    nxt = chunks[k + 1]["s"] if k + 1 < len(chunks) else TOTAL_VIDEO
    c["e"] = min(nxt, c["words"][-1]["e"] + 0.5)
    assert c["e"] > c["s"], c
def cap_word(w):
    t = re.sub(r"[,.!]+$", "", w["t"]).replace(",", "")
    return t if re.fullmatch(r"[A-Z]{2,}s?", t) else t.lower()

# ---------- enquadramento: zoom de entrada e zooms lentos só nos momentos-chave ----------
TAKES = cfg["takes"]
take_of = lambda out_t: "A" if out_t < cfg["corte_take"] else "B"
CARDS = cfg["cartoes_janelas"]
def card_bottom(a, b):
    return max([c[2] for c in CARDS if c[0] < b and c[1] > a] or [0])
def frame_for(Z, take, bottom):
    t = TAKES[take]
    face = t["fw"] * VID_W * Z
    eye_t = 0.35 * H
    if bottom: eye_t = max(eye_t, bottom + 20 + 0.75 * face)
    eye_max = cfg["legenda_topo"] - 0.6 * face
    ty = min(0, max(H - H * Z, eye_t - t["eye"] * H * Z))
    tx = min(0, max(W - VID_W * Z, W / 2 - t["cx"] * VID_W * Z))
    eye = ty + t["eye"] * H * Z
    ok = (not bottom or eye - 0.75 * face >= bottom + 10) and eye <= eye_max
    return {"x": round(tx, 1), "y": round(ty, 1), "scale": round(Z, 4)}, ok
def best_frame(mult, take, bottom):
    for mm in [mult, (mult + 1) / 2, 1.0]:
        fr, ok = frame_for(TAKES[take]["base"] * mm, take, bottom)
        if ok: return fr, mm
    return fr, mm
moves = []  # cada chave: corte (set) ou push lento (tween de 'de' para 'para')
for kf in cfg["zoom_chave"]:
    take = take_of(kf["t"] + 0.01)
    if kf.get("push"):
        end_t = kf["t"] + kf["push"]
        fr0, m0 = best_frame(kf["de"], take, card_bottom(kf["t"], kf["t"] + 0.1))
        fr1, m1 = best_frame(kf["para"], take, card_bottom(kf["t"], end_t))
        moves.append({"t": kf["t"], "push": kf["push"], "from": fr0, "to": fr1, "take": take, "m": (m0, m1), "ease": kf.get("ease", "sine.inOut")})
    else:
        fr, m = best_frame(kf["mult"], take, card_bottom(kf["t"], kf.get("ate", kf["t"] + 1)))
        moves.append({"t": kf["t"], "set": fr, "take": take, "m": (m,)})


# ---------- HTML v4: componentes ao estilo Iman Gadzhi / UI Apple (vidro fosco, notificações, browser, mosaicos) ----------
E = html.escape
g = cfg["graficos"]
SVG = {
    "x": '<path d="M6 6l12 12M18 6L6 18"/>',
    "ok": '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    "mail": '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3.5 7l8.5 6.5L20.5 7"/>',
    "phone": '<path d="M6.5 3.5h3l1.5 4.5-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
    "chat": '<path d="M4 5.5h16v10H9l-5 4z"/>',
    "send": '<path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/>',
    "search": '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
    "globe": '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>',
    "funnel": '<path d="M4 5h16l-6 7.5V19l-4 1.5v-8z"/>',
    "user": '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5"/>',
    "camera": '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r=".6"/>',
    "brief": '<rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><path d="M9 7.5V5.5h6v2M3.5 12.5h17"/>',
    "play": '<rect x="2.5" y="5" width="19" height="14" rx="4"/><path d="M10.5 9.5l4.5 2.5-4.5 2.5z"/>',
}
def icon(name, cls="ico"):
    return f'<span class="{cls}"><svg viewBox="0 0 24 24">{SVG[name]}</svg></span>'
def appicon(name): return f'<span class="appicon">{icon(name, "ico")}</span>'
def words_html(text, cls="wd"):
    out = []
    for i, part in enumerate(re.split(r"(\*[^*]+\*)", text)):
        if not part: continue
        acc = part.startswith("*")
        for w in part.strip("*").split():
            out.append(f'<span class="{cls}{" acc" if acc else ""}">{E(w)}</span>')
    return " ".join(out)

hook, lt, s1, s2, tiles, g4, cta = g["gancho"], g["lower_third"], g["cena_lista"], g["cena_pesquisa"], g["mosaicos"], g["remate"], g["cta"]
s1_cards = "".join(
    f'<div class="notif glass" id="s1n{n}">{appicon(it["icone"])}<div class="nb"><div class="nh"><span>{E(it["app"])}</span><span>agora</span></div>'
    f'<div class="nt">{E(it["titulo"])}</div><div class="nd">{E(it["texto"])}</div></div></div>' for n, it in enumerate(s1["itens"]))
s2_letters = "".join(f'<span class="ch" id="s2l{n}">{E(ch)}</span>' for n, ch in enumerate(s2["pesquisa"]))
s2_results = "".join(
    f'<div class="res" id="s2r{n}"><span class="favi">{icon(r["icone"], "ico")}</span><div><div class="rt">{E(r["titulo"])}</div><div class="rd">{E(r["desc"])}</div></div><span class="hl"></span></div>'
    for n, r in enumerate(s2["resultados"]))
tile_html = "".join(f'<div class="tile glass dark" id="tl{n}">{appicon(t["icone"])}<span>{E(t["texto"])}</span></div>' for n, t in enumerate(tiles["itens"]))
cap_html = []
for k, c in enumerate(chunks):
    spans = [f'<span class="w"><span class="l">{E(cap_word(w))}</span><span class="b" id="c{k}b{n}">{E(cap_word(w))}</span></span>' for n, w in enumerate(c["words"])]
    cap_html.append(f'<div class="cap clip" id="cap{k}" data-start="{c["s"]:.3f}" data-duration="{c["e"] - c["s"]:.3f}">{" ".join(spans)}</div>')
T = cfg["tokens"]
dur = lambda a, b: f'data-start="{a:.3f}" data-duration="{b - a:.3f}"'
POINTER = '<svg viewBox="0 0 28 36"><path d="M3 2l20 19h-10l6 12-4 2-6-12-6 7z" fill="#fff" stroke="#000" stroke-width="2" stroke-linejoin="round"/></svg>'
doc = f'''<!doctype html>
<html lang="pt-PT" data-resolution="portrait">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<script src="assets/js/gsap.min.js"></script>
<style>
@font-face {{ font-family: "MontV"; src: url(assets/fonts/montserrat-latin-wght-normal.woff2) format("woff2"); font-weight: 100 900; font-display: block; unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }}
@font-face {{ font-family: "MontV"; src: url(assets/fonts/montserrat-latin-ext-wght-normal.woff2) format("woff2"); font-weight: 100 900; font-display: block; unicode-range: U+0100-02AF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF; }}
@font-face {{ font-family: "Instrument Serif"; font-style: italic; font-weight: 400; src: url(assets/fonts/instrument-serif-latin-400-italic.woff2) format("woff2"); font-display: block; }}
:root {{
  --ink: {T["ink"]}; --muted: {T["muted"]}; --accent: {T["accent"]}; --accent-light: {T["accent_light"]}; --accent-dark: {T["accent_dark"]};
  --accent-top: {T["accent_top"]}; --accent-bottom: {T["accent_bottom"]};
  --glow: 0 0 28px rgba(255,46,0,.55); --margin: 72px;
}}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: 1080px; height: 1920px; overflow: hidden; background: #000; }}
#root {{ position: relative; width: 1080px; height: 1920px; overflow: hidden; font-family: "MontV", sans-serif; color: var(--ink); -webkit-font-smoothing: antialiased; }}
#vid {{ position: absolute; left: 0; top: 0; width: {VID_W}px; height: 1920px; transform-origin: 0 0; object-fit: fill; }}
.ico {{ display: inline-flex; flex: 0 0 auto; }}
.ico svg {{ width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }}
.acc {{ color: var(--accent); text-shadow: var(--glow); }}
.serif {{ font-family: "Instrument Serif", serif; font-style: italic; font-weight: 400; letter-spacing: 0; color: var(--accent); text-shadow: 0 0 22px rgba(255,46,0,.42); }}
/* vidro fosco */
.glass {{ background: linear-gradient(180deg, rgba(48,48,48,.58), rgba(14,14,14,.66)); -webkit-backdrop-filter: blur(18px) saturate(160%); backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid rgba(255,255,255,.14); border-top-color: rgba(255,255,255,.42); box-shadow: 0 10px 30px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.06); }}
.appicon {{ display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 84px; height: 84px; border-radius: 22px;
  background: linear-gradient(180deg, var(--accent-light) 0%, var(--accent) 55%, var(--accent-bottom) 100%); color: #fff;
  box-shadow: 0 6px 16px rgba(255,46,0,.35), inset 0 1px 0 rgba(255,255,255,.4); }}
.appicon .ico {{ width: 44px; height: 44px; }}
.appicon .ico svg {{ stroke-width: 2.2; }}
/* legendas */
#scrim {{ position: absolute; left: 0; right: 0; top: {cfg["legenda_topo"] - 260}px; height: 640px; background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.38) 40%, rgba(0,0,0,.38) 62%, rgba(0,0,0,0) 100%); }}
.cap {{ position: absolute; left: 90px; width: 900px; top: {cfg["legenda_topo"]}px; text-align: center; font-size: {cfg["legendas"]["tamanho"]}px; line-height: 1.15;
  letter-spacing: -0.01em; color: #fff; text-shadow: 0 0 18px rgba(0,0,0,.55), 0 2px 6px rgba(0,0,0,.75), 0 1px 2px rgba(0,0,0,.8); }}
.cap .w {{ display: inline-grid; justify-items: center; }}
.cap .l, .cap .b {{ grid-area: 1 / 1; }}
.cap .l {{ font-weight: 300; }}
.cap .b {{ font-weight: 700; opacity: 0; }}
/* cenas (ecrã inteiro): preto e vermelho, grelha e brilho */
.scene {{ position: absolute; inset: 0; overflow: hidden; background: radial-gradient(1400px 1100px at 50% 45%, #140806 0%, #060606 65%, #000 100%); }}
.scene .glowblob {{ position: absolute; left: 140px; top: 280px; width: 800px; height: 800px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,46,0,.30) 0%, rgba(90,16,0,.16) 45%, rgba(0,0,0,0) 70%); filter: blur(30px); }}
.scene .grid {{ position: absolute; inset: -2px; background-image: linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px);
  background-size: 72px 72px; background-position: 36px 36px; -webkit-mask-image: radial-gradient(900px 1100px at 50% 40%, #000 25%, transparent 80%); }}
.scene .content {{ position: absolute; left: var(--margin); right: var(--margin); top: 320px; }}
#s2 .content {{ top: 430px; }}
.eyebrow {{ display: inline-flex; align-items: center; gap: 12px; font-size: 32px; font-weight: 600; color: var(--muted); letter-spacing: .01em; }}
.eyebrow .dot {{ width: 12px; height: 12px; border-radius: 6px; background: var(--accent); box-shadow: var(--glow); }}
.stitle {{ font-size: 66px; font-weight: 800; letter-spacing: -0.025em; line-height: 1.05; margin: 16px 0 40px; }}
/* notificações */
.notif {{ display: flex; gap: 24px; align-items: center; padding: 26px 30px; border-radius: 34px; margin-bottom: 20px; opacity: 0; }}
.notif .nb {{ flex: 1; min-width: 0; }}
.notif .nh {{ display: flex; justify-content: space-between; font-size: 32px; font-weight: 600; color: var(--muted); }}
.notif .nt {{ font-size: 42px; font-weight: 700; letter-spacing: -0.01em; margin-top: 2px; }}
.notif .nd {{ font-size: 34px; font-weight: 500; color: #D9D9D9; margin-top: 2px; }}
/* browser */
.browser {{ border-radius: 34px; padding: 26px 28px 30px; opacity: 0; overflow: hidden; }}
.browser .dots {{ display: flex; gap: 10px; margin: 0 0 20px 6px; }}
.browser .dots i {{ width: 16px; height: 16px; border-radius: 8px; background: rgba(255,255,255,.22); }}
.browser .bar {{ display: flex; align-items: center; gap: 10px; height: 100px; padding: 0 30px; border-radius: 50px; background: rgba(0,0,0,.42); border: 1px solid rgba(255,255,255,.12); }}
.browser .bar .ico {{ width: 40px; height: 40px; color: var(--muted); }}
.browser .q {{ font-size: 50px; font-weight: 600; margin-left: 8px; }}
.browser .q .ch {{ opacity: 0; }}
.browser .caret {{ width: 3px; height: 54px; background: var(--ink); margin-left: 2px; }}
.res {{ position: relative; display: flex; align-items: center; gap: 22px; margin-top: 18px; padding: 22px 24px; border-radius: 22px; opacity: 0; }}
.res .favi {{ display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 18px; background: rgba(255,46,0,.14); color: var(--accent-light); flex: 0 0 auto; }}
.res .favi .ico {{ width: 40px; height: 40px; }}
.res .rt {{ font-size: 46px; font-weight: 700; letter-spacing: -0.015em; }}
.res .rd {{ font-size: 32px; font-weight: 500; color: var(--muted); margin-top: 2px; }}
.res .hl {{ position: absolute; inset: 0; border-radius: 22px; background: rgba(255,255,255,.07); border: 1px solid rgba(255,46,0,.45); box-shadow: 0 0 24px rgba(255,46,0,.25); opacity: 0; }}
#pointer {{ position: absolute; width: 56px; height: 72px; left: 0; top: 0; opacity: 0; filter: drop-shadow(0 6px 10px rgba(0,0,0,.5)); }}
/* sobre o vídeo: vidro mais escuro para manter contraste sobre a parede clara */
.dark {{ background: linear-gradient(180deg, rgba(26,26,26,.80), rgba(8,8,8,.86)); }}
.panel {{ position: absolute; left: var(--margin); right: var(--margin); border-radius: 36px; padding: 36px 40px; opacity: 0; }}
#hook {{ top: 300px; }}
#hook h1 {{ font-size: 70px; font-weight: 800; line-height: 1.08; letter-spacing: -0.025em; }}
#hook .wd, #g4 .wd {{ display: inline-block; }}
#tiles {{ position: absolute; left: var(--margin); right: var(--margin); top: 300px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }}
.tile {{ display: flex; align-items: center; gap: 18px; padding: 18px 20px; border-radius: 28px; font-size: 36px; font-weight: 700; letter-spacing: -0.01em; opacity: 0; }}
.tile .appicon {{ width: 72px; height: 72px; border-radius: 19px; }}
.tile .appicon .ico {{ width: 38px; height: 38px; }}
#lt {{ position: absolute; top: 1400px; left: 0; width: 1080px; display: flex; justify-content: center; }}
#ltpill {{ display: flex; align-items: center; gap: 18px; height: 112px; padding: 0 44px 0 16px; border-radius: 56px; opacity: 0; }}
#ltpill .badge {{ width: 80px; height: 80px; border-radius: 40px; display: flex; align-items: center; justify-content: center; font-size: 64px; font-weight: 800; line-height: 1;
  background: linear-gradient(180deg, var(--accent-light), var(--accent) 60%, var(--accent-bottom)); color: #fff; box-shadow: 0 6px 16px rgba(255,46,0,.35); padding-top: 20px; }}
#ltpill .name {{ font-size: 40px; font-weight: 800; letter-spacing: -0.015em; line-height: 1.05; }}
#ltpill .handle {{ font-size: 32px; font-weight: 500; color: var(--muted); line-height: 1.15; }}
#g4 {{ top: 300px; text-align: center; padding: 34px 40px 40px; }}
#g4 .a {{ font-size: 60px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; }}
#g4 .b {{ font-size: 116px; line-height: 1.0; margin-top: 6px; }}
#ctan {{ position: absolute; left: var(--margin); right: var(--margin); top: 300px; margin: 0; box-shadow: 0 10px 30px rgba(0,0,0,.28), 0 0 0 1px rgba(255,46,0,.55), 0 0 44px rgba(255,46,0,.30); }}
.cta {{ display: inline-flex; align-items: center; gap: 12px; height: 112px; padding: 0 48px 0 34px; border-radius: 56px;
  background: linear-gradient(180deg, var(--accent-top), var(--accent-bottom)); border: 1px solid rgba(255,255,255,.18); border-top: 1px solid rgba(255,255,255,.55);
  box-shadow: 0 8px 24px rgba(0,0,0,.2), 0 0 40px rgba(255,46,0,.35); color: #000; font-size: 48px; font-weight: 800; letter-spacing: -0.015em; white-space: nowrap; }}
.cta .ico {{ width: 38px; height: 38px; }}
#end .content {{ top: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }}
#endlogo {{ width: 560px; }}
#endpill {{ margin-top: 88px; }}
#endhandle {{ margin-top: 30px; font-size: 36px; font-weight: 600; color: var(--muted); }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL:.3f}" data-width="1080" data-height="1920" data-fps="30">
  <video id="vid" class="clip" {dur(0, TOTAL_VIDEO)} src="assets/base.mp4" muted playsinline></video>
  <div id="s1" class="scene clip" {dur(s1["ini"], s1["fim"])}><div class="glowblob" id="s1glow"></div><div class="grid"></div>
    <div class="content"><div class="eyebrow" id="s1eb"><span class="dot"></span>{E(s1["eyebrow"])}</div><div class="stitle" id="s1t">{words_html(s1["titulo"])}</div>{s1_cards}</div></div>
  <div id="s2" class="scene clip" {dur(s2["ini"], s2["fim"])}><div class="glowblob" id="s2glow"></div><div class="grid"></div>
    <div class="content"><div class="eyebrow" id="s2eb"><span class="dot"></span>{E(s2["eyebrow"])}</div><div class="stitle" id="s2t">{words_html(s2["titulo"])}</div>
      <div class="browser glass" id="s2b"><div class="dots"><i></i><i></i><i></i></div><div class="bar">{icon("search")}<span class="q">{s2_letters}</span><span class="caret" id="s2caret"></span></div>{s2_results}</div>
      <div id="pointer">{POINTER}</div></div></div>
  <div id="end" class="scene clip" {dur(TOTAL_VIDEO, TOTAL)}><div class="glowblob" id="endglow"></div><div class="grid"></div>
    <div class="content"><img src="assets/logo.png" alt="alexffb" id="endlogo" /><div class="cta" id="endpill">{icon("send")}{E(cta["botao"])}</div><div id="endhandle">{E(cta["handle"])}</div></div></div>
  <div id="scrim" class="clip" {dur(0, TOTAL_VIDEO)}></div>
  {"".join(cap_html)}
  <div id="hook" class="panel glass dark clip" {dur(hook["ini"], hook["fim"])}><h1>{words_html(hook["texto"])}</h1></div>
  <div id="tiles" class="clip" {dur(tiles["ini"], tiles["fim"])}>{tile_html}</div>
  <div id="lt" class="clip" {dur(lt["ini"], lt["fim"])}><div id="ltpill" class="glass dark"><span class="badge">*</span><div><div class="name">{E(lt["nome"])}</div><div class="handle">{E(lt["handle"])}</div></div></div></div>
  <div id="g4" class="panel glass dark clip" {dur(g4["ini"], g4["fim"])}><div class="a">{words_html(g4["a"])}</div><div class="b serif" id="g4b">{E(g4["b"])}</div></div>
  <div id="ctawrap" class="clip" {dur(cta["ini"], TOTAL_VIDEO)}><div class="notif glass dark" id="ctan">{appicon("send")}<div class="nb"><div class="nh"><span>{E(cta["app"])}</span><span>agora</span></div><div class="nt">{E(cta["titulo"])}</div><div class="nd">{E(cta["texto"])}</div></div></div></div>
</div>
<script>
const tl = gsap.timeline({{ paused: true }});
const SPRING = "back.out(1.25)";
function pop(sel, t, o) {{ o = o || {{}}; tl.fromTo(sel, {{ opacity: 0, scale: o.s0 || 0.94, y: o.y0 === undefined ? 18 : o.y0, filter: "blur(10px)" }},
  {{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)", ease: SPRING, duration: o.d || 0.45 }}, t); }}
function words(sel, t) {{ tl.fromTo(sel, {{ opacity: 0, y: 14, filter: "blur(8px)" }}, {{ opacity: 1, y: 0, filter: "blur(0px)", ease: "power3.out", duration: 0.35, stagger: 0.06 }}, t); }}
function out(sel, t) {{ tl.to(sel, {{ opacity: 0, scale: 0.98, filter: "blur(6px)", ease: "power2.in", duration: 0.25 }}, t); }}
'''
js, sfx = [], []
def S(t, kind): sfx.append([round(t, 3), kind])
for mv in moves:
    if "set" in mv:
        f = mv["set"]; js.append(f'tl.set("#vid", {{ x: {f["x"]}, y: {f["y"]}, scale: {f["scale"]} }}, {mv["t"]});')
    else:
        a, b = mv["from"], mv["to"]
        js.append(f'tl.fromTo("#vid", {{ x: {a["x"]}, y: {a["y"]}, scale: {a["scale"]} }}, {{ x: {b["x"]}, y: {b["y"]}, scale: {b["scale"]}, ease: "{mv["ease"]}", duration: {mv["push"]}, immediateRender: false }}, {mv["t"]});')
for k, c in enumerate(chunks):
    for n, w in enumerate(c["words"]):
        js.append(f'tl.fromTo("#c{k}b{n}", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.08, ease: "none" }}, {max(c["s"], w["s"] - 0.02):.3f});')
# gancho
js.append(f'pop("#hook", {hook["ini"]:.3f}); words("#hook .wd", {hook["ini"] + 0.12:.3f}); out("#hook", {hook["fim"] - 0.25:.3f});')
S(hook["ini"], "pop")
# cena 1: notificações
js.append(f'tl.fromTo("#s1", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.15, ease: "none" }}, {s1["ini"]:.3f});')
js.append(f'tl.fromTo("#s1glow", {{ scale: 0.85, opacity: 0.6 }}, {{ scale: 1.1, opacity: 1, ease: "sine.inOut", duration: {s1["fim"] - s1["ini"]:.3f} }}, {s1["ini"]:.3f});')
js.append(f'words("#s1eb, #s1t .wd", {s1["ini"] + 0.05:.3f});')
S(s1["ini"], "whoosh")
for n, it in enumerate(s1["itens"]):
    js.append(f'pop("#s1n{n}", {it["t"]:.3f}, {{ y0: -30, s0: 0.92 }});'); S(it["t"], "notif")
# cena 2: browser, escrita, cursor e resultados
js.append(f'tl.fromTo("#s2", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.15, ease: "none" }}, {s2["ini"]:.3f});')
js.append(f'tl.fromTo("#s2glow", {{ scale: 0.85, opacity: 0.6 }}, {{ scale: 1.1, opacity: 1, ease: "sine.inOut", duration: {s2["fim"] - s2["ini"]:.3f} }}, {s2["ini"]:.3f});')
js.append(f'tl.set("#s2b", {{ height: 192 }}, 0); words("#s2eb, #s2t .wd", {s2["ini"] + 0.05:.3f}); pop("#s2b", {s2["ini"] + 0.1:.3f});')
for n, r in enumerate(s2["resultados"]):
    js.append(f'tl.to("#s2b", {{ height: {196 + 146 * (n + 1)}, ease: "power3.out", duration: 0.35 }}, {r["t"] - 0.05:.3f});')
S(s2["ini"], "whoosh")
for n, _ in enumerate(s2["pesquisa"]):
    t = s2["escrever"] + n * 0.09
    js.append(f'tl.set("#s2l{n}", {{ opacity: 1 }}, {t:.3f});'); S(t, "type")
js.append(f'tl.set("#s2caret", {{ opacity: 0 }}, {s2["escrever"] + len(s2["pesquisa"]) * 0.09 + 0.5:.3f});')
for n, r in enumerate(s2["resultados"]):
    js.append(f'pop("#s2r{n}", {r["t"]:.3f}, {{ y0: 12, s0: 0.97, d: 0.4 }});'); S(r["t"], "pop")
cur = s2["cursor"]
js.append(f'tl.fromTo("#pointer", {{ opacity: 0, x: {cur["x0"]}, y: {cur["y0"]} }}, {{ opacity: 1, duration: 0.2 }}, {cur["t"]:.3f});')
js.append(f'tl.to("#pointer", {{ x: {cur["x1"]}, y: {cur["y1"]}, ease: "power2.inOut", duration: 0.7 }}, {cur["t"] + 0.1:.3f});')
js.append(f'tl.to("#pointer", {{ scale: 0.85, duration: 0.08, yoyo: true, repeat: 1, ease: "power1.inOut" }}, {cur["t"] + 0.85:.3f});')
js.append(f'tl.fromTo("#s2r{cur["res"]} .hl", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.2 }}, {cur["t"] + 0.85:.3f});')
S(cur["t"] + 0.85, "click")
# mosaicos sobre o vídeo
for n, t in enumerate(tiles["itens"]):
    js.append(f'pop("#tl{n}", {t["t"]:.3f}, {{ s0: 0.9, y0: 10, d: 0.4 }});'); S(t["t"], "tick")
js.append(f'out("#tiles", {tiles["fim"] - 0.25:.3f});')
# lower third
js.append(f'tl.fromTo("#ltpill", {{ opacity: 0, x: -24, filter: "blur(8px)" }}, {{ opacity: 1, x: 0, filter: "blur(0px)", ease: SPRING, duration: 0.45 }}, {lt["ini"]:.3f}); out("#ltpill", {lt["fim"] - 0.25:.3f});')
S(lt["ini"], "pop")
# remate
js.append(f'pop("#g4", {g4["ini"]:.3f}); words("#g4 .wd", {g4["ini"] + 0.1:.3f});')
js.append(f'tl.fromTo("#g4b", {{ opacity: 0, y: 14, filter: "blur(10px)", textShadow: "0 0 0px rgba(255,46,0,0)" }}, {{ opacity: 1, y: 0, filter: "blur(0px)", textShadow: "0 0 22px rgba(255,46,0,.42)", ease: "power3.out", duration: 0.5 }}, {g4["ini"] + 0.3:.3f});')
js.append(f'out("#g4", {g4["fim"] - 0.25:.3f});')
S(g4["ini"], "shimmer")
# CTA: notificação que desce do topo
js.append(f'pop("#ctan", {cta["ini"]:.3f}, {{ y0: -60, s0: 0.95, d: 0.5 }}); out("#ctawrap", {TOTAL_VIDEO - 0.25:.3f});')
S(cta["ini"], "notif")
# frame final
js.append(f'tl.fromTo("#end", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.2, ease: "none" }}, {TOTAL_VIDEO:.3f});')
js.append(f'tl.fromTo("#endglow", {{ scale: 0.8, opacity: 0.5 }}, {{ scale: 1.1, opacity: 1, ease: "sine.out", duration: {TOTAL - TOTAL_VIDEO:.3f} }}, {TOTAL_VIDEO:.3f});')
js.append(f'pop("#endlogo", {TOTAL_VIDEO + 0.05:.3f}); pop("#endpill", {TOTAL_VIDEO + 0.2:.3f}); pop("#endhandle", {TOTAL_VIDEO + 0.3:.3f}, {{ s0: 1 }});')
S(TOTAL_VIDEO, "whoosh"); S(TOTAL_VIDEO + 0.2, "shimmer")
doc += "\n".join(js) + '''
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body>
</html>
'''
(work / "hf" / "index.html").write_text(doc)
json.dump(sorted(sfx), open(work / "sfx_eventos.json", "w"))
ov = [k for k, (a, b) in enumerate(zip(chunks, chunks[1:])) if a["e"] > b["s"] + 1e-6]
print(f"{len(chunks)} linhas de legenda (sobreposições: {len(ov)}), {len(moves)} chaves de enquadramento, {len(sfx)} SFX, total {TOTAL}s")
