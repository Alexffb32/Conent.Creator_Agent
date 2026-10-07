# Gera a composição HyperFrames (index.html) do short no estilo Iman Gadzhi, com os tokens do sistema de design alexffb.
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

# ---------- HTML ----------
E = html.escape
def acc_html(text):
    return re.sub(r"\*(.+?)\*", lambda m: f'<span class="acc">{E(m.group(1))}</span>', E(text))
cap_html = []
for k, c in enumerate(chunks):
    spans = [f'<span class="w"><span class="l">{E(cap_word(w))}</span><span class="b" id="c{k}b{n}">{E(cap_word(w))}</span></span>' for n, w in enumerate(c["words"])]
    cap_html.append(f'<div class="cap clip" id="cap{k}" data-start="{c["s"]:.3f}" data-duration="{c["e"] - c["s"]:.3f}">{" ".join(spans)}</div>')

g = cfg["graficos"]
ICON_X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
ICON_OK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
ICON_SEARCH = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>'
ICON_SEND = '<svg viewBox="0 0 24 24"><path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/></svg>'
hook = g["gancho"]; lt = g["lower_third"]; s1 = g["cena_lista"]; s2 = g["cena_pesquisa"]; chips = g["chips"]; g4 = g["remate"]; cta = g["cta"]
s1_items = "".join(f'<div class="row" id="s1i{n}"><span class="ico x">{ICON_X}</span><span>{E(it["texto"])}</span></div>' for n, it in enumerate(s1["itens"]))
s2_letters = "".join(f'<span class="ch" id="s2l{n}">{E(ch)}</span>' for n, ch in enumerate(s2["pesquisa"]))
s2_results = "".join(f'<div class="res" id="s2r{n}"><span class="ico ok">{ICON_OK}</span><div><div class="rt">{E(r["titulo"])}</div><div class="rd">{E(r["desc"])}</div></div></div>' for n, r in enumerate(s2["resultados"]))
chip_html = "".join(f'<span class="chip" id="ch{n}"><span class="ico ok">{ICON_OK}</span>{E(ch["texto"])}</span>' for n, ch in enumerate(chips["itens"]))
T = cfg["tokens"]
dur = lambda a, b: f'data-start="{a:.3f}" data-duration="{b - a:.3f}"'
doc = f'''<!doctype html>
<html lang="pt-PT" data-resolution="portrait">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=1080, height=1920" />
<script src="assets/js/gsap.min.js"></script>
<script src="assets/js/CustomEase.min.js"></script>
<style>
@font-face {{ font-family: "InterV"; src: url(assets/fonts/inter-latin-opsz-normal.woff2) format("woff2"); font-weight: 100 900; font-display: block; unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }}
@font-face {{ font-family: "InterV"; src: url(assets/fonts/inter-latin-ext-opsz-normal.woff2) format("woff2"); font-weight: 100 900; font-display: block; unicode-range: U+0100-02AF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF; }}
@font-face {{ font-family: "MontV"; src: url(assets/fonts/montserrat-latin-wght-normal.woff2) format("woff2"); font-weight: 100 900; font-display: block; unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }}
@font-face {{ font-family: "MontV"; src: url(assets/fonts/montserrat-latin-ext-wght-normal.woff2) format("woff2"); font-weight: 100 900; font-display: block; unicode-range: U+0100-02AF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF; }}
@font-face {{ font-family: "Instrument Serif"; font-style: italic; font-weight: 400; src: url(assets/fonts/instrument-serif-latin-400-italic.woff2) format("woff2"); font-display: block; }}
:root {{
  --bg: {T["bg"]}; --surface: {T["surface"]}; --ink: {T["ink"]}; --muted: {T["muted"]}; --line: {T["line"]};
  --accent: {T["accent"]}; --accent-top: {T["accent_top"]}; --accent-bottom: {T["accent_bottom"]}; --accent-10: {T["accent_10"]};
  --s4: 4px; --s8: 8px; --s12: 12px; --s16: 16px; --s24: 24px; --s32: 32px; --s48: 48px; --s64: 64px; --s96: 96px;
  --r-badge: 8px; --r-card: 16px; --r-panel: 24px;
  --shadow-md: 0 8px 24px rgba(0,0,0,.14); --rim-top: 1px solid rgba(255,255,255,.5); --margin: 72px;
}}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: 1080px; height: 1920px; overflow: hidden; background: var(--bg); }}
#root {{ position: relative; width: 1080px; height: 1920px; overflow: hidden; font-family: "InterV", sans-serif; color: var(--ink);
  font-variation-settings: "opsz" 32; -webkit-font-smoothing: antialiased; }}
#vid, #freeze {{ position: absolute; left: 0; top: 0; width: {VID_W}px; height: 1920px; transform-origin: 0 0; object-fit: fill; }}
#endshade {{ position: absolute; inset: 0; background: rgba(0,0,0,.80); }}
.acc {{ color: var(--accent); }}
.serif {{ font-family: "Instrument Serif", serif; font-style: italic; font-weight: 400; letter-spacing: 0; color: var(--accent); }}
.ico {{ display: inline-flex; flex: 0 0 auto; }}
.ico svg {{ width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }}
/* legendas: Montserrat, minúsculas, branco; cada palavra passa de light a bold quando é dita (largura reservada, sem saltos) */
.cap {{ position: absolute; left: 90px; width: 900px; top: {cfg["legenda_topo"]}px; text-align: center; font-family: "MontV", sans-serif;
  font-size: {cfg["legendas"]["tamanho"]}px; line-height: 1.15; letter-spacing: -0.01em; color: #fff; text-shadow: 0 0 18px rgba(0,0,0,.55), 0 2px 6px rgba(0,0,0,.75), 0 1px 2px rgba(0,0,0,.8); }}
#scrim {{ position: absolute; left: 0; right: 0; top: {cfg["legenda_topo"] - 260}px; height: 640px; pointer-events: none;
  background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.38) 40%, rgba(0,0,0,.38) 62%, rgba(0,0,0,0) 100%); }}
.cap .w {{ display: inline-grid; justify-items: center; }}
.cap .l, .cap .b {{ grid-area: 1 / 1; }}
.cap .l {{ font-weight: 300; }}
.cap .b {{ font-weight: 700; opacity: 0; }}
/* cenas de grelha (cutaways em ecrã inteiro) */
.scene {{ position: absolute; inset: 0; background: radial-gradient(1200px 900px at 50% 38%, #141414 0%, #070707 60%, #000 100%); overflow: hidden; }}
.scene .grid {{ position: absolute; inset: -2px; background-image: linear-gradient(rgba(255,255,255,.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.09) 1px, transparent 1px);
  background-size: 72px 72px; background-position: 36px 36px; -webkit-mask-image: radial-gradient(900px 1100px at 50% 40%, #000 30%, transparent 85%); }}
.scene .content {{ position: absolute; left: var(--margin); right: var(--margin); top: 360px; }}
.scene .eyebrow {{ font-size: 32px; font-weight: 600; color: var(--muted); letter-spacing: 0.02em; margin-bottom: var(--s32); }}
#s1 .row {{ display: flex; align-items: center; gap: 10px; height: 120px; padding: 0 var(--s32); margin-bottom: var(--s16); border-radius: var(--r-card);
  background: rgba(34,34,34,.92); border-top: var(--rim-top); box-shadow: var(--shadow-md); font-size: 52px; font-weight: 700; letter-spacing: -0.015em; opacity: 0; }}
#s1 .row .ico {{ width: 40px; height: 40px; color: var(--accent); margin-right: var(--s12); }}
#s2 .bar {{ display: flex; align-items: center; gap: 10px; height: 112px; padding: 0 var(--s32); border-radius: 56px; background: #1C1C1C; border-top: 1px solid rgba(255,255,255,.25);
  box-shadow: var(--shadow-md); }}
#s2 .bar .ico {{ width: 40px; height: 40px; color: var(--muted); }}
#s2 .q {{ font-size: 52px; font-weight: 600; margin-left: var(--s8); }}
#s2 .q .ch {{ opacity: 0; }}
#s2 .caret {{ width: 3px; height: 56px; background: var(--ink); margin-left: 2px; }}
#s2 .res {{ display: flex; align-items: flex-start; gap: 10px; margin-top: var(--s24); padding: var(--s24) var(--s32); border-radius: var(--r-card); background: rgba(34,34,34,.92);
  border-top: var(--rim-top); opacity: 0; }}
#s2 .res .ico {{ width: 40px; height: 40px; color: var(--accent); margin: 6px var(--s12) 0 0; }}
#s2 .rt {{ font-size: 48px; font-weight: 700; letter-spacing: -0.015em; }}
#s2 .rd {{ font-size: 32px; font-weight: 500; color: var(--muted); margin-top: var(--s4); }}
/* painéis sobre o vídeo */
.panel {{ position: absolute; left: var(--margin); width: calc(1080px - 2 * var(--margin)); background: var(--surface); border-radius: var(--r-panel);
  border-top: var(--rim-top); box-shadow: var(--shadow-md); padding: var(--s32); overflow: hidden; }}
.line {{ height: 4px; background: var(--accent); border-radius: 2px; }}
#hook {{ top: 296px; }}
#hook h1 {{ font-size: 72px; font-weight: 800; line-height: 1.08; letter-spacing: -0.02em; }}
#hook .line {{ width: 128px; margin-top: var(--s24); }}
#chips {{ position: absolute; top: 300px; left: var(--margin); right: var(--margin); display: flex; flex-wrap: wrap; justify-content: flex-start; gap: var(--s12); }}
#chips .chip {{ display: inline-flex; align-items: center; gap: 10px; height: 64px; padding: 0 var(--s24) 0 var(--s16); border-radius: 32px; background: var(--accent-10);
  color: var(--accent); font-size: 32px; font-weight: 600; opacity: 0; border-top: 1px solid rgba(255,255,255,.35); box-shadow: var(--shadow-md); }}
#chips .chip .ico {{ width: 28px; height: 28px; }}
#lt {{ position: absolute; top: 1400px; left: 0; width: 1080px; display: flex; justify-content: center; }}
#ltpill {{ display: flex; flex-direction: column; justify-content: center; height: 112px; padding: 0 var(--s48); border-radius: 56px; background: var(--surface);
  border-top: var(--rim-top); box-shadow: var(--shadow-md); white-space: nowrap; text-align: center; }}
#ltpill .name {{ font-size: 40px; font-weight: 800; letter-spacing: -0.015em; line-height: 1.1; }}
#ltpill .handle {{ font-size: 32px; font-weight: 500; color: var(--muted); line-height: 1.2; }}
#g4 {{ top: 296px; text-align: center; }}
#g4 .a {{ font-size: 64px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; }}
#g4 .b {{ font-size: 112px; line-height: 1.0; margin-top: var(--s4); }}
#g4 .line {{ width: 128px; margin: var(--s24) auto 0; }}
.cta {{ display: inline-flex; align-items: center; gap: 10px; height: 112px; padding: 0 var(--s48) 0 var(--s32); border-radius: 56px;
  background: linear-gradient(180deg, var(--accent-top), var(--accent-bottom)); border: 1px solid rgba(255,255,255,.18); border-top: var(--rim-top);
  box-shadow: var(--shadow-md); color: #000000; font-size: 48px; font-weight: 800; letter-spacing: -0.015em; white-space: nowrap; }}
.cta .ico {{ width: 36px; height: 36px; margin-right: var(--s4); }}
#ctawrap {{ position: absolute; top: 1400px; left: 0; width: 1080px; text-align: center; }}
#ctawrap .sub {{ display: inline-block; margin-top: var(--s16); padding: var(--s8) var(--s24); border-radius: 26px; background: rgba(0,0,0,.78);
  font-size: 32px; font-weight: 600; color: var(--ink); }}
#end {{ position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; }}
#end img {{ width: 560px; margin-top: 560px; }}
#end .cta {{ margin-top: var(--s96); }}
#end .handle {{ margin-top: var(--s32); font-size: 36px; font-weight: 600; color: var(--muted); }}
#prog {{ position: absolute; top: 240px; left: var(--margin); width: calc(1080px - 2 * var(--margin)); height: 6px; border-radius: 3px; background: rgba(0,0,0,.28); overflow: hidden; }}
#prog .fill {{ width: 100%; height: 100%; background: var(--accent); transform-origin: 0 50%; transform: scaleX(0); }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL:.3f}" data-width="1080" data-height="1920" data-fps="30">
  <video id="vid" class="clip" {dur(0, TOTAL_VIDEO)} src="assets/base.mp4" muted playsinline></video>
  <div id="s1" class="scene clip" {dur(s1["ini"], s1["fim"])}><div class="grid"></div><div class="content"><div class="eyebrow">{E(s1["titulo"])}</div>{s1_items}</div></div>
  <div id="s2" class="scene clip" {dur(s2["ini"], s2["fim"])}><div class="grid"></div><div class="content"><div class="eyebrow">{E(s2["titulo"])}</div><div class="bar"><span class="ico">{ICON_SEARCH}</span><span class="q">{s2_letters}</span><span class="caret" id="s2caret"></span></div>{s2_results}</div></div>
  <div id="endwrap" class="clip" {dur(TOTAL_VIDEO, TOTAL)}>
    <img id="freeze" src="assets/ultimo.png" alt="" />
    <div id="endshade"></div>
    <div id="end">
      <img src="assets/logo.png" alt="alexffb" id="endlogo" />
      <div class="cta" id="endpill"><span class="ico">{ICON_SEND}</span>{E(cta["texto"])}</div>
      <div class="handle" id="endhandle">{E(cta["handle"])}</div>
    </div>
  </div>
  <div id="scrim" class="clip" {dur(0, TOTAL_VIDEO)}></div>
  {"".join(cap_html)}
  <div id="hook" class="panel clip" {dur(hook["ini"], hook["fim"])}><h1>{acc_html(hook["texto"])}</h1><div class="line"></div></div>
  <div id="chips" class="clip" {dur(chips["ini"], chips["fim"])}>{chip_html}</div>
  <div id="lt" class="clip" {dur(lt["ini"], lt["fim"])}><div id="ltpill"><span class="name">{E(lt["nome"])}</span><span class="handle">{E(lt["handle"])}</span></div></div>
  <div id="g4" class="panel clip" {dur(g4["ini"], g4["fim"])}><div class="a">{E(g4["a"])}</div><div class="b serif">{E(g4["b"])}</div><div class="line"></div></div>
  <div id="ctawrap" class="clip" {dur(cta["ini"], TOTAL_VIDEO)}><div class="cta" id="ctapill"><span class="ico">{ICON_SEND}</span>{E(cta["texto"])}</div><br /><div class="sub" id="ctasub">{E(cta["sub"])}</div></div>
  <div id="prog" class="clip" {dur(0, TOTAL)}><div class="fill" id="progfill"></div></div>
</div>
<script>
gsap.registerPlugin(CustomEase);
CustomEase.create("hf", "M0,0 C0.2,0.8 0.2,1 1,1");
const tl = gsap.timeline({{ paused: true }});
function reveal(sel, t) {{ tl.fromTo(sel, {{ opacity: 0, y: 8 }}, {{ opacity: 1, y: 0, ease: "hf", duration: 0.3 }}, t); }}
function hide(sel, t) {{ tl.to(sel, {{ opacity: 0, ease: "power2.in", duration: 0.2 }}, t); }}
'''
js = []
for mv in moves:
    if "set" in mv:
        f = mv["set"]; js.append(f'tl.set("#vid", {{ x: {f["x"]}, y: {f["y"]}, scale: {f["scale"]} }}, {mv["t"]});')
    else:
        a, b = mv["from"], mv["to"]
        js.append(f'tl.fromTo("#vid", {{ x: {a["x"]}, y: {a["y"]}, scale: {a["scale"]} }}, {{ x: {b["x"]}, y: {b["y"]}, scale: {b["scale"]}, ease: "{mv["ease"]}", duration: {mv["push"]}, immediateRender: false }}, {mv["t"]});')
lastf = moves[-1].get("set") or moves[-1]["to"]
js.append(f'tl.set("#freeze", {{ x: {lastf["x"]}, y: {lastf["y"]}, scale: {lastf["scale"]} }}, 0);')
for k, c in enumerate(chunks):
    for n, w in enumerate(c["words"]):
        t = max(c["s"], w["s"] - 0.02)
        js.append(f'tl.fromTo("#c{k}b{n}", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.08, ease: "none" }}, {t:.3f});')
js.append(f'reveal("#hook", {hook["ini"]:.3f}); hide("#hook", {hook["fim"] - 0.2:.3f});')
for n, it in enumerate(s1["itens"]):
    js.append(f'reveal("#s1i{n}", {it["t"]:.3f});')
for n, ch in enumerate(s2["pesquisa"]):
    js.append(f'tl.set("#s2l{n}", {{ opacity: 1 }}, {s2["escrever"] + n * 0.08:.3f});')
js.append(f'tl.set("#s2caret", {{ opacity: 0 }}, {s2["escrever"] + len(s2["pesquisa"]) * 0.08 + 0.4:.3f});')
for n, r in enumerate(s2["resultados"]):
    js.append(f'reveal("#s2r{n}", {r["t"]:.3f});')
js.append(f'hide("#chips", {chips["fim"] - 0.2:.3f});')
for n, ch in enumerate(chips["itens"]):
    js.append(f'reveal("#ch{n}", {max(ch["t"], chips["ini"] + 0.06 * n):.3f});')
js.append(f'reveal("#lt", {lt["ini"]:.3f}); hide("#lt", {lt["fim"] - 0.2:.3f});')
js.append(f'reveal("#g4", {g4["ini"]:.3f}); hide("#g4", {g4["fim"] - 0.2:.3f});')
js.append(f'reveal("#ctapill", {cta["ini"]:.3f}); reveal("#ctasub", {cta["sub_t"]:.3f}); hide("#ctawrap", {TOTAL_VIDEO - 0.2:.3f});')
js.append(f'tl.fromTo("#endshade", {{ opacity: 0 }}, {{ opacity: 1, ease: "hf", duration: 0.3 }}, {TOTAL_VIDEO:.3f});')
js.append(f'reveal("#endlogo", {TOTAL_VIDEO:.3f}); reveal("#endpill", {TOTAL_VIDEO + 0.06:.3f}); reveal("#endhandle", {TOTAL_VIDEO + 0.12:.3f});')
js.append(f'tl.fromTo("#progfill", {{ scaleX: 0 }}, {{ scaleX: 1, ease: "none", duration: {TOTAL:.3f} }}, 0);')
doc += "\n".join(js) + '''
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body>
</html>
'''
(work / "hf" / "index.html").write_text(doc)
json.dump({"chunks": [{"s": round(c["s"], 3), "e": round(c["e"], 3), "txt": " ".join(cap_word(w) for w in c["words"])} for c in chunks],
           "moves": moves, "total": TOTAL, "total_video": TOTAL_VIDEO}, open(work / "composicao_debug.json", "w"), ensure_ascii=False, indent=1)
ov = [k for k, (a, b) in enumerate(zip(chunks, chunks[1:])) if a["e"] > b["s"] + 1e-6]
print(f"{len(chunks)} linhas de legenda (sobreposições: {len(ov)}), {len(moves)} chaves de enquadramento, total {TOTAL}s")
for mv in moves:
    print(f'  {mv["t"]:6.2f} take {mv["take"]} ' + (f'corte -> {mv["set"]["scale"]}' if "set" in mv else f'push {mv["push"]} s {mv["from"]["scale"]} -> {mv["to"]["scale"]}'))
