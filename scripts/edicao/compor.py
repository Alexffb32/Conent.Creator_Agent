# Gera a composição HyperFrames (index.html) do short: vídeo, legendas, painéis, CTA e frame final, com os tokens do sistema de design.
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


# ---------- enquadramento: zoom só nos momentos-chave ----------
# Entre momentos-chave o enquadramento não muda (os jump cuts ficam no mesmo plano).
TAKES = cfg["takes"]
take_of = lambda out_t: "A" if out_t < cfg["corte_take"] else "B"
CARDS = cfg["cartoes_janelas"]  # [ini, fim, fundo_px]
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
keys = cfg["zoom_chave"] + [{"t": TOTAL_VIDEO, "mult": None}]
sections = []
for k in range(len(keys) - 1):
    a, b = keys[k]["t"], keys[k + 1]["t"]
    take = take_of(a + 0.01)
    base = TAKES[take]["base"]; bottom = card_bottom(a, b)
    m = keys[k]["mult"]
    for mm in [m, (m + 1) / 2, 1.0]:
        fr, ok = frame_for(base * mm, take, bottom)
        if ok: break
    sections.append({"t": a, "dur": keys[k].get("dur", 0), **fr, "take": take, "mult": mm})

# ---------- HTML ----------
E = html.escape
def acc_html(text):  # *palavra* -> cor de acento (mesma fonte)
    return re.sub(r"\*(.+?)\*", lambda m: f'<span class="acc">{E(m.group(1))}</span>', E(text))

cap_html = []
for k, c in enumerate(chunks):
    first_in_phrase = k == 0 or chunks[k - 1]["f"] != c["f"]
    spans = [f'<span class="{"w acc" if w.get("kw") else "w"}">{E(cap_word(w, first_in_phrase and n == 0))}</span>' for n, w in enumerate(c["words"])]
    cap_html.append(f'<div class="cap clip" id="cap{k}" data-start="{c["s"]:.3f}" data-duration="{c["e"] - c["s"]:.3f}">{" ".join(spans)}</div>')

g = cfg["graficos"]
ICON_X = '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>'
ICON_OK = '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
ICON_SEARCH = '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>'
ICON_SEND = '<svg viewBox="0 0 24 24"><path d="M21 3L10 14M21 3l-7 18-4-7-7-4z"/></svg>'

hook = g["gancho"]; lt = g["lower_third"]; g1 = g["lista"]; g3 = g["pesquisa"]; g4 = g["remate"]; cta = g["cta"]
g1_items = "".join(f'<div class="row" id="g1i{n}"><span class="ico x">{ICON_X}</span><span>{E(it["texto"])}</span></div>' for n, it in enumerate(g1["itens"]))
_chip = lambda n, ch: f'<span class="chip" id="g3c{n}"><span class="ico ok">{ICON_OK}</span>{E(ch["texto"])}</span>'
_res = list(enumerate(g3["resultados"])); _cut = g3.get("linha2", 3)
g3_chips = ('<div class="chips">' + "".join(_chip(n, ch) for n, ch in _res[:_cut]) + '</div>'
            '<div class="chips">' + "".join(_chip(n, ch) for n, ch in _res[_cut:]) + '</div>')
g3_letters = "".join(f'<span class="ch" id="g3l{n}">{E(ch)}</span>' for n, ch in enumerate(g3["pesquisa"]))
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
@font-face {{ font-family: "Instrument Serif"; font-style: italic; font-weight: 400; src: url(assets/fonts/instrument-serif-latin-400-italic.woff2) format("woff2"); font-display: block; }}
:root {{
  --bg: {T["bg"]}; --surface: {T["surface"]}; --ink: {T["ink"]}; --muted: {T["muted"]}; --line: {T["line"]};
  --accent: {T["accent"]}; --accent-top: {T["accent_top"]}; --accent-bottom: {T["accent_bottom"]}; --accent-10: {T["accent_10"]};
  --s4: 4px; --s8: 8px; --s12: 12px; --s16: 16px; --s24: 24px; --s32: 32px; --s48: 48px; --s64: 64px; --s96: 96px;
  --r-badge: 8px; --r-card: 16px; --r-panel: 24px;
  --shadow-md: 0 8px 24px rgba(0,0,0,.14); --rim-top: 1px solid rgba(255,255,255,.5);
  --margin: 72px; /* ≥ 6 % de 1080 */
}}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: 1080px; height: 1920px; overflow: hidden; background: var(--bg); }}
#root {{ position: relative; width: 1080px; height: 1920px; overflow: hidden; font-family: "InterV", sans-serif; color: var(--ink);
  font-variation-settings: "opsz" 32; -webkit-font-smoothing: antialiased; }}
#vid, #freeze {{ position: absolute; left: 0; top: 0; width: {VID_W}px; height: 1920px; transform-origin: 0 0; object-fit: fill; }}
#endshade {{ position: absolute; inset: 0; background: rgba(0,0,0,.80); }}
.acc {{ color: var(--accent); }}
.serif {{ font-family: "Instrument Serif", serif; font-style: italic; font-weight: 400; letter-spacing: 0; color: var(--accent); }}
/* legendas: bloco inteiro, só opacidade */
.cap {{ position: absolute; left: 110px; width: 860px; top: {cfg["legenda_topo"]}px; text-align: center; font-weight: 800; font-size: 76px; line-height: 1.08;
  letter-spacing: -0.02em; opacity: 0; }}
.cap .w {{ display: inline-block; -webkit-text-stroke: 14px #000; paint-order: stroke fill; filter: drop-shadow(0 8px 12px rgba(0,0,0,.14)); }}
/* superfícies */
.panel {{ position: absolute; left: var(--margin); width: calc(1080px - 2 * var(--margin)); background: var(--surface); border-radius: var(--r-panel);
  border-top: var(--rim-top); box-shadow: var(--shadow-md); padding: var(--s32); overflow: hidden; }}
.line {{ height: 4px; background: var(--accent); border-radius: 2px; }}
.ico {{ display: inline-flex; flex: 0 0 auto; }}
.ico svg {{ width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }}
#hook {{ top: 296px; }}
#hook h1 {{ font-size: 72px; font-weight: 800; line-height: 1.08; letter-spacing: -0.02em; }}
#hook .line {{ width: 128px; margin-top: var(--s24); }}
#lt {{ position: absolute; top: 1384px; left: 0; width: 1080px; display: flex; justify-content: center; }}
#ltpill {{ display: flex; flex-direction: column; justify-content: center; height: 112px; padding: 0 var(--s48); border-radius: 56px; background: var(--surface);
  border-top: var(--rim-top); box-shadow: var(--shadow-md); white-space: nowrap; text-align: center; }}
#ltpill .name {{ font-size: 40px; font-weight: 800; letter-spacing: -0.015em; line-height: 1.1; }}
#ltpill .handle {{ font-size: 32px; font-weight: 500; color: var(--muted); line-height: 1.2; }}
#g1 {{ top: 296px; }}
#g1 .row {{ display: flex; align-items: center; height: 56px; gap: 10px; font-size: 46px; font-weight: 600; letter-spacing: -0.01em; }}
#g1 .row + .row {{ margin-top: var(--s16); }}
#g1 .ico {{ width: 32px; height: 32px; color: var(--accent); margin-right: var(--s8); }}
#g3 {{ top: 296px; }}
#g3 .bar {{ display: flex; align-items: center; gap: 10px; height: 96px; padding: 0 var(--s32); border-radius: 48px; background: #2B2B2B; border-top: 1px solid rgba(255,255,255,.18); }}
#g3 .bar .ico {{ width: 32px; height: 32px; color: var(--muted); }}
#g3 .q {{ font-size: 44px; font-weight: 600; letter-spacing: -0.01em; margin-left: var(--s8); }}
#g3 .q .ch {{ opacity: 0; }}
#g3 .caret {{ width: 3px; height: 48px; background: var(--ink); margin-left: 2px; }}
#g3 .chips {{ display: flex; gap: var(--s12); margin-top: var(--s24); }}
#g3 .chips + .chips {{ margin-top: var(--s12); }}
#g3 .chip {{ display: inline-flex; align-items: center; gap: 10px; height: 64px; padding: 0 var(--s24) 0 var(--s16); border-radius: 32px; background: var(--accent-10);
  color: var(--accent); font-size: 32px; font-weight: 600; opacity: 0; }}
#g3 .chip .ico {{ width: 28px; height: 28px; }}
#g4 {{ top: 296px; text-align: center; }}
#g4 .a {{ font-size: 64px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; }}
#g4 .b {{ font-size: 112px; line-height: 1.0; margin-top: var(--s4); }}
#g4 .line {{ width: 128px; margin: var(--s24) auto 0; }}
.cta {{ display: inline-flex; align-items: center; gap: 10px; height: 112px; padding: 0 var(--s48) 0 var(--s32); border-radius: 56px;
  background: linear-gradient(180deg, var(--accent-top), var(--accent-bottom)); border: 1px solid rgba(255,255,255,.18); border-top: var(--rim-top);
  box-shadow: var(--shadow-md); color: #000000; font-size: 48px; font-weight: 800; letter-spacing: -0.015em; white-space: nowrap; }}
.cta .ico {{ width: 36px; height: 36px; margin-right: var(--s4); }}
#ctawrap {{ position: absolute; top: 1384px; left: 0; width: 1080px; text-align: center; }}
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
  <div id="endwrap" class="clip" {dur(TOTAL_VIDEO, TOTAL)}>
    <img id="freeze" src="assets/ultimo.png" alt="" />
    <div id="endshade"></div>
    <div id="end">
      <img src="assets/logo.png" alt="alexffb" id="endlogo" />
      <div class="cta" id="endpill"><span class="ico">{ICON_SEND}</span>{E(cta["texto"])}</div>
      <div class="handle" id="endhandle">{E(cta["handle"])}</div>
    </div>
  </div>
  {"".join(cap_html)}
  <div id="hook" class="panel clip" {dur(hook["ini"], hook["fim"])}><h1>{acc_html(hook["texto"])}</h1><div class="line"></div></div>
  <div id="lt" class="clip" {dur(lt["ini"], lt["fim"])}><div id="ltpill"><span class="name">{E(lt["nome"])}</span><span class="handle">{E(lt["handle"])}</span></div></div>
  <div id="g1" class="panel clip" {dur(g1["ini"], g1["fim"])}>{g1_items}</div>
  <div id="g3" class="panel clip" {dur(g3["ini"], g3["fim"])}><div class="bar"><span class="ico">{ICON_SEARCH}</span><span class="q">{g3_letters}</span><span class="caret" id="g3caret"></span></div>{g3_chips}</div>
  <div id="g4" class="panel clip" {dur(g4["ini"], g4["fim"])}><div class="a">{E(g4["a"])}</div><div class="b serif">{E(g4["b"])}</div><div class="line"></div></div>
  <div id="ctawrap" class="clip" {dur(cta["ini"], TOTAL_VIDEO)}><div class="cta" id="ctapill"><span class="ico">{ICON_SEND}</span>{E(cta["texto"])}</div><br /><div class="sub" id="ctasub">{E(cta["sub"])}</div></div>
  <div id="prog" class="clip" {dur(0, TOTAL)}><div class="fill" id="progfill"></div></div>
</div>
<script>
gsap.registerPlugin(CustomEase);
CustomEase.create("hf", "M0,0 C0.2,0.8 0.2,1 1,1");
const tl = gsap.timeline({{ paused: true }});
// tokens de movimento: fast .1, base .2, slow .3; entradas ease out, saídas ease in
function reveal(sel, t) {{ tl.fromTo(sel, {{ opacity: 0, y: 8 }}, {{ opacity: 1, y: 0, ease: "hf", duration: 0.3 }}, t); }}
function hide(sel, t) {{ tl.to(sel, {{ opacity: 0, ease: "power2.in", duration: 0.2 }}, t); }}
'''
js = []
s0 = sections[0]
js.append(f'tl.set("#vid", {{ x: {s0["x"]}, y: {s0["y"]}, scale: {s0["scale"]} }}, 0);')
for sc in sections[1:]:
    if sc["dur"] > 0:
        js.append(f'tl.to("#vid", {{ x: {sc["x"]}, y: {sc["y"]}, scale: {sc["scale"]}, ease: "hf", duration: {sc["dur"]} }}, {sc["t"]});')
    else:
        js.append(f'tl.set("#vid", {{ x: {sc["x"]}, y: {sc["y"]}, scale: {sc["scale"]} }}, {sc["t"]});')
last = sections[-1]
js.append(f'tl.set("#freeze", {{ x: {last["x"]}, y: {last["y"]}, scale: {last["scale"]} }}, 0);')
for k, c in enumerate(chunks):
    js.append(f'tl.fromTo("#cap{k}", {{ opacity: 0 }}, {{ opacity: 1, ease: "hf", duration: 0.2 }}, {c["s"]:.3f});')
js.append(f'reveal("#hook", {hook["ini"]:.3f}); hide("#hook", {hook["fim"] - 0.2:.3f});')
js.append(f'reveal("#lt", {lt["ini"]:.3f}); hide("#lt", {lt["fim"] - 0.2:.3f});')
H1 = lambda k: 64 + 56 * k + 16 * (k - 1)
js.append(f'tl.set("#g1", {{ height: {H1(1)} }}, 0); reveal("#g1", {g1["ini"]:.3f}); hide("#g1", {g1["fim"] - 0.2:.3f});')
for n, it in enumerate(g1["itens"]):
    js.append(f'reveal("#g1i{n}", {max(it["t"], g1["ini"] + 0.06 * n):.3f});')
    if n: js.append(f'tl.to("#g1", {{ height: {H1(n + 1)}, ease: "hf", duration: 0.3 }}, {it["t"] - 0.05:.3f});')
g3h = [64 + 96, 64 + 96 + 24 + 64, 64 + 96 + 24 + 64 + 12 + 64]
js.append(f'tl.set("#g3", {{ height: {g3h[0]} }}, 0); reveal("#g3", {g3["ini"]:.3f}); hide("#g3", {g3["fim"] - 0.2:.3f});')
for n, _ in enumerate(g3["pesquisa"]):
    js.append(f'tl.set("#g3l{n}", {{ opacity: 1 }}, {g3["escrever"] + n * 0.08:.3f});')
js.append(f'tl.set("#g3caret", {{ opacity: 0 }}, {g3["escrever"] + len(g3["pesquisa"]) * 0.08 + 0.4:.3f});')
js.append(f'tl.to("#g3", {{ height: {g3h[1]}, ease: "hf", duration: 0.3 }}, {g3["resultados"][0]["t"] - 0.05:.3f});')
js.append(f'tl.to("#g3", {{ height: {g3h[2]}, ease: "hf", duration: 0.3 }}, {g3["resultados"][_cut]["t"] - 0.05:.3f});')
for n, ch in enumerate(g3["resultados"]):
    js.append(f'reveal("#g3c{n}", {ch["t"]:.3f});')
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
json.dump({"chunks": [{"s": c["s"], "e": c["e"], "txt": " ".join(cap_word(w, False) for w in c["words"])} for c in chunks],
           "sections": sections, "total": TOTAL, "total_video": TOTAL_VIDEO}, open(work / "composicao_debug.json", "w"), ensure_ascii=False, indent=1)
print(f"{len(chunks)} blocos de legenda, {len(sections)} secções de enquadramento, total {TOTAL}s")
for sc in sections: print(f'  {sc["t"]:6.2f} take {sc["take"]} x{sc["mult"]:.3f} -> scale {sc["scale"]} ({"suave " + str(sc["dur"]) + " s" if sc["dur"] else "corte"})')
