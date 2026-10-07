# Gera a composição HyperFrames (index.html) do short: vídeo com zooms, legendas, cartões, CTA e frame final.
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

# ---------- legendas: blocos de 1 a 3 palavras ----------
FUNC = {"sobre", "com", "das", "dos", "nas", "na", "ao", "à", "a", "o", "as", "os", "de", "da", "do", "em", "que", "e", "ou", "um", "se", "nos", "te", "eu", "tu", "no", "na", "por", "para", "nem", "é"}
chunks = []
by_f = {}
for w in words: by_f.setdefault(w["f"], []).append(w)
for fi, ws in sorted(by_f.items()):
    kw = [k.lower() for k in cfg["destaques"][fi].split()] if cfg["destaques"][fi] else []
    cur = []
    def flush(carry_ok=True):
        if not cur: return
        carry = []
        content = [i for i, x in enumerate(cur) if norm(x["t"]) not in FUNC]
        if carry_ok and content and content[-1] < len(cur) - 1 and not re.search(r"[,.?!]$", cur[-1]["t"]):
            carry = cur[content[-1] + 1:]; del cur[content[-1] + 1:]
        chunks.append({"f": fi, "words": list(cur)}); cur.clear()
        cur.extend(carry)
    j = 0
    while j < len(ws):
        w = ws[j]
        clean = norm(w["t"])
        is_kw_start = kw and clean == norm(kw[0]) and all(j + k < len(ws) and norm(ws[j + k]["t"]) == norm(kw[k]) for k in range(len(kw)))
        if is_kw_start:
            group = ws[j:j + len(kw)]
            if len(cur) + len(group) > 3: flush()
            for g in group: g["kw"] = True
            cur.extend(group); j += len(kw)
            if len(group) >= 2 and not re.search(r"[,.?!]$", cur[-1]["t"]): flush(False); continue
        else:
            chars = sum(len(x["t"]) for x in cur) + len(w["t"])
            if len(cur) >= 3 or chars > 18: flush()
            cur.append(w); j += 1
        last = cur[-1]["t"] if cur else ""
        if re.search(r"[,.?!]$", last):
            # não deixa uma palavra funcional sozinha no fim do bloco
            flush()
        elif len(cur) == 3:
            flush(j < len(ws))
    flush(False)
for k, c in enumerate(chunks):
    c["s"] = max(0.0, c["words"][0]["s"] - 0.04)
    nxt = chunks[k + 1]["words"][0]["s"] - 0.04 if k + 1 < len(chunks) else TOTAL_VIDEO
    c["e"] = min(nxt, c["words"][-1]["e"] + 0.6)
    c["e"] = max(c["e"], c["s"] + 0.3)

def cap_word(w, first):
    t = re.sub(r"[,.!]+$", "", w["t"])
    t = t.replace(",", "")
    if first: t = t[:1].upper() + t[1:]
    return t

# ---------- enquadramento e zoom ----------
take_of = lambda out_t: "A" if out_t < cfg["corte_take"] else "B"
TAKES = cfg["takes"]
CARDS = cfg["cartoes_janelas"]  # [ini, fim, fundo_px]
def card_bottom(a, b):
    return max([c[2] for c in CARDS if c[0] < b and c[1] > a] or [0])
def frame_for(Z, take, bottom):
    t = TAKES[take]
    face = t["fw"] * VID_W * Z
    eye_t = 0.35 * H
    if bottom: eye_t = max(eye_t, bottom + 20 + 0.75 * face)
    eye_max = cfg["legenda_topo"] - 0.6 * face
    ty = eye_t - t["eye"] * H * Z
    ty = min(0, max(H - H * Z, ty))
    tx = W / 2 - t["cx"] * VID_W * Z
    tx = min(0, max(W - VID_W * Z, tx))
    eye = ty + t["eye"] * H * Z
    ok = (not bottom or eye - 0.75 * face >= bottom + 10) and eye <= eye_max
    return {"x": round(tx, 1), "y": round(ty, 1), "scale": round(Z, 4)}, ok
cycle = cfg["zoom_ciclo"]
frames = []
for i, s in enumerate(segs):
    a, b = s["out"], s["out"] + s["dur"]
    take = take_of(a + 0.01)
    base = TAKES[take]["base"]
    bottom = card_bottom(a, b)
    tries = [cycle[i % len(cycle)]] + [m for m in sorted(set(cycle), reverse=True) if m < cycle[i % len(cycle)]]
    for m in tries:
        fr, ok = frame_for(base * m, take, bottom)
        if ok: break
    frames.append({"t": round(a, 3), **fr, "take": take, "mult": m})
punch = cfg["punch"]
pf, _ = frame_for(TAKES[take_of(punch["t"])]["base"] * punch["zoom"], take_of(punch["t"]), card_bottom(punch["t"], punch["t"] + 1))

# ---------- HTML ----------
E = html.escape
def kw_html(text):  # *palavra* -> destaque
    return re.sub(r"\*(.+?)\*", lambda m: f'<span class="k">{E(m.group(1))}</span>', E(text))

cap_html = []
for k, c in enumerate(chunks):
    first_in_phrase = k == 0 or chunks[k - 1]["f"] != c["f"]
    spans = []
    for n, w in enumerate(c["words"]):
        cls = "w k" if w.get("kw") else "w"
        spans.append(f'<span class="{cls}" id="c{k}w{n}">{E(cap_word(w, first_in_phrase and n == 0))}</span>')
    cap_html.append(f'<div class="cap clip" id="cap{k}" data-start="{c["s"]:.3f}" data-duration="{c["e"] - c["s"]:.3f}">{" ".join(spans)}</div>')

g = cfg["graficos"]
ICON_X = '<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg>'
ICON_OK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
ICON_SEARCH = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>'
ICON_SEND = '<svg viewBox="0 0 24 24"><path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/></svg>'

hook = g["gancho"]; lt = g["lower_third"]; g1 = g["lista"]; g2 = g["palavra"]; g3 = g["pesquisa"]; g4 = g["remate"]; cta = g["cta"]
g1_items = "".join(f'<div class="row" id="g1i{n}"><span class="ico x">{ICON_X}</span><span>{E(it["texto"])}</span></div>' for n, it in enumerate(g1["itens"]))
_chip = lambda n, ch: f'<span class="chip" id="g3c{n}"><span class="ico ok">{ICON_OK}</span>{E(ch["texto"])}</span>'
_res = list(enumerate(g3["resultados"])); _cut = g3.get("linha2", 3)
g3_chips = '<div class="chips">' + "".join(_chip(n, ch) for n, ch in _res[:_cut]) + '</div><div class="chips">' + "".join(_chip(n, ch) for n, ch in _res[_cut:]) + '</div>'
g3_letters = "".join(f'<span class="ch" id="g3l{n}">{E(ch)}</span>' for n, ch in enumerate(g3["pesquisa"]))

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
@font-face {{ font-family: "Instrument Serif"; font-style: italic; font-weight: 400; src: url(assets/fonts/instrument-serif-latin-400-italic.woff2) format("woff2"); font-display: block; }}
:root {{ --bg: #000000; --surface: #222222; --panel: #4F4F4F; --ink: #FFFFFF; --muted: #B3B3B3; --accent: #FF2E00;
  --ease: cubic-bezier(.2,.8,.2,1); --r-badge: 8px; --r-card: 16px; --r-panel: 24px; }}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: 1080px; height: 1920px; overflow: hidden; background: var(--bg); }}
#root {{ position: relative; width: 1080px; height: 1920px; overflow: hidden; font-family: "InterV", sans-serif; color: var(--ink);
  font-variation-settings: "opsz" 32; -webkit-font-smoothing: antialiased; }}
#vid, #freeze {{ position: absolute; left: 0; top: 0; width: {VID_W}px; height: 1920px; transform-origin: 0 0; object-fit: fill; }}
#endshade {{ position: absolute; inset: 0; background: rgba(0,0,0,.80); }}
.k {{ font-family: "Instrument Serif", serif; font-style: italic; font-weight: 400; color: var(--accent); letter-spacing: 0; }}
/* legendas */
.cap {{ position: absolute; left: 110px; width: 860px; top: {cfg["legenda_topo"]}px; text-align: center; font-weight: 800; font-size: 76px; line-height: 1.08;
  letter-spacing: -0.02em; }}
.cap .w {{ display: inline-block; opacity: 0; -webkit-text-stroke: 14px #000; paint-order: stroke fill; filter: drop-shadow(0 8px 14px rgba(0,0,0,.35)); }}
.cap .w.k {{ font-size: 96px; -webkit-text-stroke: 14px #000; }}
/* cartões */
.card {{ position: absolute; left: 80px; width: 920px; background: rgba(18,18,18,.94); border-radius: var(--r-panel);
  border-top: 1px solid rgba(255,255,255,.5); box-shadow: 0 8px 24px rgba(0,0,0,.14); }}
.line {{ height: 4px; background: var(--accent); border-radius: 2px; transform-origin: 0 50%; }}
.ico svg {{ width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }}
#hook {{ top: 300px; padding: 36px 48px 40px; }}
#hook h1 {{ font-size: 72px; font-weight: 800; line-height: 1.04; letter-spacing: -0.025em; font-variation-settings: "opsz" 32; }}
#hook h1 .k {{ font-size: 92px; }}
#hook .line {{ width: 140px; margin-top: 24px; }}
#lt {{ position: absolute; top: 1384px; left: 0; width: 1080px; display: flex; justify-content: center; }}
#ltpill {{ position: relative; display: flex; align-items: center; gap: 20px; height: 104px;
  padding: 0 40px 0 24px; border-radius: 52px; background: rgba(34,34,34,.95); border-top: 1px solid rgba(255,255,255,.5); box-shadow: 0 8px 24px rgba(0,0,0,.14); white-space: nowrap; }}
#ltpill img {{ height: 72px; }}
#ltpill .who {{ display: flex; flex-direction: column; }}
#ltpill .name {{ font-size: 36px; font-weight: 800; letter-spacing: -0.015em; line-height: 1.05; }}
#ltpill .handle {{ font-size: 28px; font-weight: 500; color: var(--muted); line-height: 1.1; }}
#ltpill .line {{ position: absolute; left: 52px; right: 52px; bottom: -14px; height: 3px; }}
#g1 {{ top: 290px; padding: 36px 44px; overflow: hidden; }}
#g1 .row {{ display: flex; align-items: center; height: 56px; gap: 24px; font-size: 46px; font-weight: 700; letter-spacing: -0.015em; line-height: 1.15; }}
#g1 .row + .row {{ margin-top: 22px; }}
.ico {{ display: inline-flex; flex: 0 0 auto; }}
.ico.x {{ width: 56px; height: 56px; padding: 10px; border-radius: 28px; border: 2px solid var(--accent); color: var(--accent); }}
.ico.ok {{ width: 36px; height: 36px; color: var(--accent); }}
#g2 {{ top: 300px; padding: 40px 48px 44px; text-align: center; }}
#g2 .big {{ font-size: 104px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.0; }}
#g2 .big .k {{ font-size: 128px; }}
#g2 .line {{ width: 180px; margin: 26px auto 0; }}
#g3 {{ top: 290px; padding: 32px 36px 36px; overflow: hidden; }}
#g3 .bar {{ display: flex; align-items: center; gap: 18px; height: 100px; padding: 0 30px; border-radius: 50px; background: #2b2b2b; border: 2px solid #3a3a3a; }}
#g3 .bar .ico {{ width: 44px; height: 44px; color: var(--muted); }}
#g3 .q {{ font-size: 46px; font-weight: 700; letter-spacing: -0.01em; }}
#g3 .q .ch {{ opacity: 0; }}
#g3 .caret {{ width: 3px; height: 50px; background: var(--ink); margin-left: 2px; }}
#g3 .chips {{ display: flex; gap: 16px; margin-top: 26px; }}
#g3 .chips + .chips {{ margin-top: 16px; }}
#g3 .chip {{ display: inline-flex; align-items: center; gap: 12px; height: 76px; padding: 0 26px 0 20px; border-radius: var(--r-badge); background: #2b2b2b;
  font-size: 38px; font-weight: 700; letter-spacing: -0.01em; opacity: 0; }}
#g4 {{ top: 300px; padding: 36px 48px 42px; text-align: center; }}
#g4 .a {{ font-size: 64px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; }}
#g4 .b {{ font-size: 112px; line-height: 1.0; margin-top: 6px; }}
#g4 .line {{ width: 180px; margin: 22px auto 0; }}
.pill {{ display: inline-flex; align-items: center; gap: 18px; height: 108px; padding: 0 44px 0 36px; border-radius: 54px; background: rgba(0,0,0,.92);
  border: 3px solid var(--accent); box-shadow: 0 8px 24px rgba(0,0,0,.14); font-size: 48px; font-weight: 800; letter-spacing: -0.015em; white-space: nowrap; }}
.pill .ico {{ width: 44px; height: 44px; color: var(--ink); }}
#cta {{ position: absolute; top: 1380px; left: 0; width: 1080px; text-align: center; }}
#cta .sub {{ display: inline-block; margin-top: 16px; padding: 8px 20px; border-radius: var(--r-badge); background: rgba(0,0,0,.78); font-size: 32px; font-weight: 600; color: var(--ink); opacity: 0; }}
#end {{ position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; }}
#end img {{ width: 600px; margin-top: 560px; }}
#end .pill {{ margin-top: 96px; }}
#end .handle {{ margin-top: 30px; font-size: 36px; font-weight: 600; color: var(--muted); }}
#prog {{ position: absolute; top: 240px; left: 64px; width: 952px; height: 6px; border-radius: 3px; background: rgba(0,0,0,.28); overflow: hidden; }}
#prog .fill {{ width: 100%; height: 100%; background: var(--accent); transform-origin: 0 50%; transform: scaleX(0); }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL:.3f}" data-width="1080" data-height="1920" data-fps="30">
  <video id="vid" class="clip" {dur(0, TOTAL_VIDEO)} src="assets/base.mp4" muted playsinline></video>
  <div id="endwrap" class="clip" {dur(TOTAL_VIDEO, TOTAL)}>
    <img id="freeze" src="assets/ultimo.png" alt="" />
    <div id="endshade"></div>
    <div id="end">
      <img src="assets/logo.png" alt="alexffb" id="endlogo" />
      <div class="pill" id="endpill"><span class="ico">{ICON_SEND}</span>{E(cta["texto"])}</div>
      <div class="handle" id="endhandle">{E(cta["handle"])}</div>
    </div>
  </div>
  {"".join(cap_html)}
  <div id="hook" class="card clip" {dur(hook["ini"], hook["fim"])}><h1>{kw_html(hook["texto"])}</h1><div class="line" id="hookline"></div></div>
  <div id="lt" class="clip" {dur(lt["ini"], lt["fim"])}><div id="ltpill"><img src="assets/logo.png" alt="" /><div class="who"><span class="name">{E(lt["nome"])}</span><span class="handle">{E(lt["handle"])}</span></div><div class="line" id="ltline"></div></div></div>
  <div id="g1" class="card clip" {dur(g1["ini"], g1["fim"])}>{g1_items}</div>
  <div id="g2" class="card clip" {dur(g2["ini"], g2["fim"])}><div class="big">{kw_html(g2["texto"])}</div><div class="line" id="g2line"></div></div>
  <div id="g3" class="card clip" {dur(g3["ini"], g3["fim"])}><div class="bar"><span class="ico">{ICON_SEARCH}</span><span class="q">{g3_letters}</span><span class="caret" id="g3caret"></span></div>{g3_chips}</div>
  <div id="g4" class="card clip" {dur(g4["ini"], g4["fim"])}><div class="a">{E(g4["a"])}</div><div class="b k">{E(g4["b"])}</div><div class="line" id="g4line"></div></div>
  <div id="cta" class="clip" {dur(cta["ini"], TOTAL_VIDEO)}><div class="pill" id="ctapill"><span class="ico">{ICON_SEND}</span>{E(cta["texto"])}</div><br /><div class="sub" id="ctasub">{E(cta["sub"])}</div></div>
  <div id="prog" class="clip" {dur(0, TOTAL)}><div class="fill" id="progfill"></div></div>
</div>
<script>
gsap.registerPlugin(CustomEase);
CustomEase.create("hf", "M0,0 C0.2,0.8 0.2,1 1,1");
const tl = gsap.timeline({{ paused: true }});
const IN = {{ ease: "hf", duration: 0.3 }}, OUT = {{ ease: "power2.in", duration: 0.2 }};
function reveal(sel, t, d) {{ tl.fromTo(sel, {{ opacity: 0, y: 8 }}, {{ opacity: 1, y: 0, ease: "hf", duration: d || 0.3 }}, t); }}
function hide(sel, t) {{ tl.to(sel, {{ opacity: 0, y: -8, ...OUT }}, t); }}
'''
js = []
# vídeo: zoom por segmento
f0 = frames[0]
js.append(f'tl.set("#vid", {{ x: {f0["x"]}, y: {f0["y"]}, scale: {f0["scale"]} }}, 0);')
for fr in frames[1:]:
    js.append(f'tl.to("#vid", {{ x: {fr["x"]}, y: {fr["y"]}, scale: {fr["scale"]}, ease: "hf", duration: 0.25 }}, {fr["t"]});')
js.append(f'tl.to("#vid", {{ x: {pf["x"]}, y: {pf["y"]}, scale: {pf["scale"]}, ease: "hf", duration: 0.25 }}, {punch["t"]});')
last = frames[-1] if frames[-1]["t"] > punch["t"] else {**pf}
js.append(f'tl.set("#freeze", {{ x: {last["x"]}, y: {last["y"]}, scale: {last["scale"]} }}, 0);')
# legendas
for k, c in enumerate(chunks):
    for n, w in enumerate(c["words"]):
        js.append(f'tl.fromTo("#c{k}w{n}", {{ opacity: 0, y: 8 }}, {{ opacity: 1, y: 0, ease: "hf", duration: 0.2 }}, {max(c["s"], w["s"] - 0.03):.3f});')
# gancho
js.append(f'reveal("#hook", {hook["ini"]:.3f}); tl.fromTo("#hookline", {{ scaleX: 0 }}, {{ scaleX: 1, ease: "hf", duration: 0.3 }}, {hook["ini"] + 0.12:.3f}); hide("#hook", {hook["fim"] - 0.2:.3f});')
# lower third
js.append(f'tl.fromTo("#lt", {{ opacity: 0, y: 8 }}, {{ opacity: 1, y: 0, ease: "hf", duration: 0.3 }}, {lt["ini"]:.3f}); tl.fromTo("#ltline", {{ scaleX: 0 }}, {{ scaleX: 1, ease: "hf", duration: 0.3 }}, {lt["ini"] + 0.12:.3f}); tl.to("#lt", {{ opacity: 0, y: 8, ...OUT }}, {lt["fim"] - 0.2:.3f});')
# lista
js.append(f'reveal("#g1", {g1["ini"]:.3f}); hide("#g1", {g1["fim"] - 0.2:.3f});')
H1 = lambda k: 72 + 56 * k + 22 * (k - 1)
js.append(f'tl.set("#g1", {{ height: {H1(1)} }}, 0);')
for n, it in enumerate(g1["itens"]):
    js.append(f'reveal("#g1i{n}", {it["t"]:.3f});')
    if n: js.append(f'tl.to("#g1", {{ height: {H1(n + 1)}, ease: "hf", duration: 0.25 }}, {it["t"] - 0.05:.3f});')
# palavra
js.append(f'tl.fromTo("#g2", {{ opacity: 0, y: 8, scale: 0.98 }}, {{ opacity: 1, y: 0, scale: 1, ease: "hf", duration: 0.3 }}, {g2["ini"]:.3f}); tl.fromTo("#g2line", {{ scaleX: 0 }}, {{ scaleX: 1, ease: "hf", duration: 0.3 }}, {g2["ini"] + 0.15:.3f}); hide("#g2", {g2["fim"] - 0.2:.3f});')
# pesquisa
js.append(f'reveal("#g3", {g3["ini"]:.3f}); hide("#g3", {g3["fim"] - 0.2:.3f});')
for n, _ in enumerate(g3["pesquisa"]):
    js.append(f'tl.set("#g3l{n}", {{ opacity: 1 }}, {g3["escrever"] + n * 0.08:.3f});')
for n, ch in enumerate(g3["resultados"]):
    js.append(f'tl.fromTo("#g3c{n}", {{ opacity: 0, y: 8, scale: 0.96 }}, {{ opacity: 1, y: 0, scale: 1, ease: "hf", duration: 0.2 }}, {ch["t"]:.3f});')
js.append(f'tl.set("#g3", {{ height: 168 }}, 0);')
js.append(f'tl.to("#g3", {{ height: 270, ease: "hf", duration: 0.25 }}, {g3["resultados"][0]["t"] - 0.05:.3f});')
js.append(f'tl.to("#g3", {{ height: 362, ease: "hf", duration: 0.25 }}, {g3["resultados"][g3.get("linha2", 3)]["t"] - 0.05:.3f});')
js.append(f'tl.set("#g3caret", {{ opacity: 0 }}, {g3["escrever"] + len(g3["pesquisa"]) * 0.08 + 0.4:.3f});')
# remate
js.append(f'tl.fromTo("#g4", {{ opacity: 0, y: 8, scale: 0.98 }}, {{ opacity: 1, y: 0, scale: 1, ease: "hf", duration: 0.3 }}, {g4["ini"]:.3f}); tl.fromTo("#g4line", {{ scaleX: 0 }}, {{ scaleX: 1, ease: "hf", duration: 0.3 }}, {g4["ini"] + 0.15:.3f}); hide("#g4", {g4["fim"] - 0.2:.3f});')
# CTA
js.append(f'tl.fromTo("#ctapill", {{ opacity: 0, y: 8 }}, {{ opacity: 1, y: 0, ease: "hf", duration: 0.3 }}, {cta["ini"]:.3f}); tl.fromTo("#ctasub", {{ opacity: 0, y: 8 }}, {{ opacity: 1, y: 0, ease: "hf", duration: 0.3 }}, {cta["sub_t"]:.3f}); tl.to("#cta", {{ opacity: 0, ...OUT }}, {TOTAL_VIDEO - 0.2:.3f});')
# frame final
js.append(f'tl.fromTo("#endshade", {{ opacity: 0 }}, {{ opacity: 1, ease: "hf", duration: 0.3 }}, {TOTAL_VIDEO:.3f});')
js.append(f'reveal("#endlogo", {TOTAL_VIDEO + 0.06:.3f}); reveal("#endpill", {TOTAL_VIDEO + 0.12:.3f}); reveal("#endhandle", {TOTAL_VIDEO + 0.18:.3f});')
# progresso
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
json.dump({"chunks": [{"s": c["s"], "e": c["e"], "txt": " ".join(cap_word(w, False) for w in c["words"])} for c in chunks],
           "frames": frames, "punch": pf, "total": TOTAL, "total_video": TOTAL_VIDEO,
           "words": words}, open(work / "composicao_debug.json", "w"), ensure_ascii=False, indent=1)
print(f"{len(chunks)} blocos de legenda, {len(frames)} segmentos, total {TOTAL}s")
for fr in frames: print(f'  {fr["t"]:6.2f} take {fr["take"]} x{fr["mult"]:.2f} -> scale {fr["scale"]}')
