# Gera a composição HyperFrames (hf/index.html) de um short 9:16: legendas palavra a palavra, zooms lentos nos
# momentos-chave e componentes de motion (vidro fosco, cenas, notificações, browser, mosaicos, listas, números, CTA).
# Uso: python3 compor.py <pasta_trabalho> <config.json>
# A pasta de trabalho tem frases_cortadas.json, segmentos.json e hf/assets/base.mp4. Escreve hf/index.html e sfx_eventos.json.
# Os componentes, parâmetros e exemplos estão em biblioteca/componentes.md. O formato antigo do config (graficos como dicionário,
# takes A/B com corte_take) continua a ser aceite.
import html, json, re, subprocess, sys
from pathlib import Path

W, H = 1080, 1920
work = Path(sys.argv[1]); cfg = json.load(open(sys.argv[2]))
frases = json.load(open(work / "frases_cortadas.json"))
segs = json.load(open(work / "segmentos.json"))["segments"]
TOTAL_VIDEO = round(segs[-1]["out"] + segs[-1]["dur"], 3)
END_CARD = float(cfg.get("end_card", 2.0))
TOTAL = round(TOTAL_VIDEO + END_CARD, 3)
E = html.escape

# ---------- tamanho do vídeo de origem (cobre 1080x1920) ----------
def dims():
    if "video" in cfg: return cfg["video"]["w"], cfg["video"]["h"]
    for p in (work / "hf" / "assets" / "base.mp4", work / "base.mp4"):
        if p.exists():
            o = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                                "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout.strip()
            if o: w, h = o.split(",")[:2]; return int(w), int(h)
    return 1080, 1920
SRC_W, SRC_H = dims()
COVER = max(W / SRC_W, H / SRC_H)
VID_W, VID_H = round(SRC_W * COVER), round(SRC_H * COVER)

# ---------- tokens da marca (só o acento é obrigatório; o resto deriva dele) ----------
def hex_rgb(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
def rgb_hex(c): return "#" + "".join(f"{max(0, min(255, round(v))):02X}" for v in c)
def mix(a, b, t): return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))
T = dict(cfg.get("tokens", {}))
ACC = hex_rgb(T.get("accent", "#FF2E00"))
T.setdefault("accent", rgb_hex(ACC))
T.setdefault("accent_light", rgb_hex(mix(ACC, (255, 255, 255), 0.32)))
T.setdefault("accent_dark", rgb_hex(mix(ACC, (0, 0, 0), 0.65)))
T.setdefault("accent_top", rgb_hex(mix(ACC, (255, 255, 255), 0.06)))
T.setdefault("accent_bottom", rgb_hex(mix(ACC, (0, 0, 0), 0.12)))
T.setdefault("ink", "#FFFFFF"); T.setdefault("muted", "#B3B3B3")
DARK = hex_rgb(T["accent_dark"])
A = ",".join(str(v) for v in ACC); AD = ",".join(str(v) for v in DARK)
SCENE_BG = rgb_hex(mix((6, 6, 6), ACC, 0.06))
def rel_lum(c):
    lin = [(v / 255) / 12.92 if v / 255 <= 0.03928 else ((v / 255 + 0.055) / 1.055) ** 2.4 for v in c]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]
L_CTA = rel_lum(mix(hex_rgb(T["accent_top"]), hex_rgb(T["accent_bottom"]), 0.5))
CTA_INK = "#000" if (L_CTA + 0.05) / 0.05 >= 1.05 / (L_CTA + 0.05) else "#fff"
MARCA = cfg.get("marca", {}).get("nome", "logo")

# ---------- formato antigo -> lista de componentes ----------
g = cfg["graficos"]
if isinstance(g, dict):
    nomes = {"cena_lista": "notificacoes", "cena_pesquisa": "pesquisa"}
    ordem = ["gancho", "cena_lista", "lower_third", "cena_pesquisa", "mosaicos", "remate", "cta"]
    if "lower_third" in g: g["lower_third"].setdefault("emblema", "*")
    g = [dict(g[k], tipo=nomes.get(k, k)) for k in ordem if k in g] + \
        [dict(v, tipo=nomes.get(k, k)) for k, v in g.items() if k not in ordem]
COMP = g
CTA_C = next((c for c in COMP if c["tipo"] == "cta"), {})
FINAL = cfg.get("frame_final", {"botao": CTA_C.get("botao", ""), "handle": CTA_C.get("handle", "")})

# ---------- takes (enquadramento por troço do vídeo) ----------
TK = cfg["takes"]
if isinstance(TK, dict):
    corte = cfg.get("corte_take", 1e9)
    TK = [dict(TK["A"], desde=0)] + ([dict(TK["B"], desde=corte)] if "B" in TK else [])
TK = sorted(TK, key=lambda t: t.get("desde", 0))
def take_of(t): return max((k for k in TK if k.get("desde", 0) <= t), key=lambda k: k.get("desde", 0))

# ---------- transcrição corrigida ----------
words = []
for i, f in enumerate(frases):
    for w in f["words"]:
        words.append({"t": w["w"], "s": w["s"], "e": w["e"], "f": i})
merged = []
for w in words:  # junta clíticos ("diz-me") e "e-mail"
    if w["t"].startswith("-") and merged and merged[-1]["f"] == w["f"]:
        prev = merged[-1]
        prev["t"] = "email" + w["t"][5:] if prev["t"] == "e" and w["t"].startswith("-mail") else prev["t"] + w["t"]
        prev["e"] = w["e"]
    else:
        merged.append(dict(w))
words = merged
def norm(t): return re.sub(r"[^\wÀ-ÿ-]", "", t.lower())
for fix in cfg.get("correcoes", []):
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

# ---------- legendas: linhas curtas sem sobreposição ----------
LEG = cfg.get("legendas", {})
ESTILO = LEG.get("estilo", "iman")
MAXW, MAXC = LEG.get("max_palavras", 4), LEG.get("max_caracteres", 22)
LEG_TOPO = cfg.get("legenda_topo", 1180)
FUNC = {"sobre", "com", "das", "dos", "nas", "na", "ao", "à", "a", "o", "as", "os", "de", "da", "do", "em", "que", "e", "ou", "um",
        "se", "nos", "te", "eu", "tu", "no", "por", "para", "nem", "é", "the", "a", "of", "to", "and", "in", "is"}
def chars(ws): return sum(len(x["t"]) for x in ws) + max(0, len(ws) - 1)
PAIRS = {tuple(norm(x) for x in d.split()) for d in cfg.get("destaques", []) if d and len(d.split()) == 2}
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
    n = len(ws); best = [0.0] + [float("inf")] * n; cut = [0] * (n + 1)
    for j in range(1, n + 1):
        for i in range(max(0, j - (MAXW + 2)), j):
            c = best[i] + line_cost(ws[i:j], j == n)
            if 0 < i < n and (norm(ws[i - 1]["t"]), norm(ws[i]["t"])) in PAIRS: c += 20
            if c < best[j]: best[j], cut[j] = c, i
    lines, j = [], n
    while j > 0: lines.insert(0, ws[cut[j]:j]); j = cut[j]
    return lines
chunks, by_f = [], {}
for w in words: by_f.setdefault(w["f"], []).append(w)
for fi, ws in sorted(by_f.items()):
    clause = []
    for w in ws:
        clause.append(w)
        if re.search(r"[,.?!]$", w["t"]):
            chunks += [{"f": fi, "words": l} for l in split_clause(clause)]; clause = []
    if clause: chunks += [{"f": fi, "words": l} for l in split_clause(clause)]
def dur_of(c): return c["words"][-1]["e"] - c["words"][0]["s"]
changed = True
while changed:  # linhas curtas demais juntam-se à seguinte da mesma frase
    changed = False
    for k, c in enumerate(chunks[:-1]):
        nx = chunks[k + 1]
        if (dur_of(c) < 0.3 or dur_of(nx) < 0.3) and c["f"] == nx["f"] and chars(c["words"] + nx["words"]) <= MAXC + 6:
            c["words"] = c["words"] + nx["words"]; chunks.remove(nx); changed = True; break
for k, c in enumerate(chunks):
    c["s"] = max(0.0, c["words"][0]["s"] - 0.04)  # nunca antes de 0: o render prende o início e a linha ficaria por cima da seguinte
    if k: c["s"] = max(c["s"], chunks[k - 1]["s"] + 0.1)
for k, c in enumerate(chunks):  # sem sobreposição: cada linha acaba quando a seguinte começa
    nxt = chunks[k + 1]["s"] if k + 1 < len(chunks) else TOTAL_VIDEO
    c["e"] = min(nxt, c["words"][-1]["e"] + 0.5)
    assert c["e"] > c["s"], c
def cap_word(w):
    t = re.sub(r"[,.!]+$", "", w["t"]).replace(",", "")
    if ESTILO == "destaque": return t.upper()
    return t if re.fullmatch(r"[A-Z]{2,}s?", t) else t.lower()

# ---------- componentes ----------
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
    "chart": '<path d="M4 19.5h16M7 16v-5M12 16V7M17 16v-8"/>',
    "money": '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.8"/>',
    "clock": '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    "star": '<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.3 2.7 1-5.8-4.2-4.1 5.9-.9z"/>',
    "heart": '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    "bolt": '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z"/>',
    "target": '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
    "check": '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M8 12.3l2.8 2.8L16.5 9"/>',
    "shirt": '<path d="M9 3.5L3.5 6.5l2 4.2 2.2-1.1v10.9h8.6V9.6l2.2 1.1 2-4.2L15 3.5c-.6 1.4-1.6 2.2-3 2.2s-2.4-.8-3-2.2z"/>',
    "users": '<circle cx="9" cy="9" r="3.3"/><path d="M3 19.5c.9-3.1 3.2-4.8 6-4.8s5.1 1.7 6 4.8M15.5 5.9a3.3 3.3 0 0 1 0 6.3M17.8 14.9c1.6.6 2.7 2.2 3.2 4.6"/>',
}
def icon(name, cls="ico"): return f'<span class="{cls}"><svg viewBox="0 0 24 24">{SVG.get(name, SVG["star"])}</svg></span>'
def appicon(name): return f'<span class="appicon">{icon(name)}</span>'
def words_html(text, cls="wd"):
    """Palavras em spans. O texto entre *asteriscos* leva o acento. A pontuação colada ao que a precede
    (por exemplo `*funciona*?`) fica colada: em português não há espaço antes de ? ! , . : ;"""
    out = []  # (html, colar_ao_anterior)
    for part in re.split(r"(\*[^*]+\*)", text):
        if not part: continue
        acc = part.startswith("*")
        raw = part.strip("*")
        ws = raw.split()
        for k, w in enumerate(ws):
            colar = (k == 0 and bool(out) and not raw[:1].isspace() and not acc and w[:1] in "?!,.:;")
            out.append((f'<span class="{cls}{" acc" if acc else ""}">{E(w)}</span>', colar))
    return "".join(h if (c or i == 0) else " " + h for i, (h, c) in enumerate(out))
dur = lambda a, b: f'data-start="{a:.3f}" data-duration="{b - a:.3f}"'
POINTER = '<svg viewBox="0 0 28 36"><path d="M3 2l20 19h-10l6 12-4 2-6-12-6 7z" fill="#fff" stroke="#000" stroke-width="2" stroke-linejoin="round"/></svg>'

layers_scene, layers_over, js, sfx, cards = [], [], [], [], []  # js: animações dos componentes
def S(t, kind): sfx.append([round(t, 3), kind])
FUNDO = {"gancho": 523, "mosaicos": 532, "remate": 559, "cta": 482, "palavra": 520, "lista": 760, "numero": 640}
for k, c in enumerate(COMP):
    tipo, p = c["tipo"], f"g{k}"
    ini, fim = c.get("ini", 0.0), c.get("fim", TOTAL_VIDEO)
    topo = c.get("topo", 300)
    if tipo in FUNDO and c.get("fundo", True) is not False:
        cards.append((ini, fim if tipo != "cta" else TOTAL_VIDEO, c.get("fundo") if isinstance(c.get("fundo"), (int, float)) else FUNDO[tipo] + (topo - 300)))
    if tipo == "gancho":
        layers_over.append(f'<div id="{p}" class="panel glass dark clip gancho" style="top:{topo}px" {dur(ini, fim)}><h1>{words_html(c["texto"])}</h1></div>')
        if ini < 0.05:  # gancho do início: legível já no primeiro fotograma (o Reels começa aí e a capa pode vir daí), lição 31
            js.append(f'tl.fromTo("#{p}", {{ opacity: 1, scale: 1.035 }}, {{ opacity: 1, scale: 1, ease: "power2.out", duration: 0.6 }}, 0); '
                      f'tl.fromTo("#{p} .acc", {{ y: 5 }}, {{ y: 0, ease: "power3.out", duration: 0.45 }}, 0); out("#{p}", {fim - 0.25:.3f});')
        else:
            js.append(f'pop("#{p}", {ini:.3f}); words("#{p} .wd", {ini + 0.12:.3f}); out("#{p}", {fim - 0.25:.3f});')
        S(ini, "pop")
    elif tipo == "palavra":
        layers_over.append(f'<div id="{p}" class="clip palavra" style="top:{topo}px" {dur(ini, fim)}><div class="pw">{words_html(c["texto"])}</div></div>')
        js.append(f'pop("#{p} .pw", {ini:.3f}, {{ s0: 0.9, y0: 10, d: 0.4 }}); out("#{p}", {fim - 0.25:.3f});'); S(ini, "pop")
    elif tipo == "lista":
        itens = "".join(f'<div class="li" id="{p}i{n}">{icon(it.get("icone", "check"), "ico lic")}<span>{words_html(it["texto"], "lw")}</span></div>'
                        for n, it in enumerate(c["itens"]))
        tit = f'<div class="ltit">{words_html(c["titulo"])}</div>' if c.get("titulo") else ""
        layers_over.append(f'<div id="{p}" class="panel glass dark clip lista" style="top:{topo}px" {dur(ini, fim)}>{tit}{itens}</div>')
        js.append(f'pop("#{p}", {ini:.3f}); words("#{p} .ltit .wd", {ini + 0.1:.3f}); out("#{p}", {fim - 0.25:.3f});'); S(ini, "pop")
        for n, it in enumerate(c["itens"]):
            js.append(f'tl.fromTo("#{p}i{n}", {{ opacity: 0, x: -18, filter: "blur(8px)" }}, {{ opacity: 1, x: 0, filter: "blur(0px)", ease: "power3.out", duration: 0.35 }}, {it["t"]:.3f});')
            S(it["t"], "tick")
    elif tipo == "numero":
        de, ate = float(c.get("de", 0)), float(c["ate"])
        casas = int(c.get("casas", 0)); fmt0 = f"{de:.{casas}f}"
        layers_over.append(f'<div id="{p}" class="panel glass dark clip numero" style="top:{topo}px" {dur(ini, fim)}>'
                           f'<div class="nv"><span class="pre">{E(c.get("prefixo", ""))}</span><span id="{p}v">{fmt0}</span><span class="suf">{E(c.get("sufixo", ""))}</span></div>'
                           f'<div class="nl">{words_html(c.get("legenda", ""))}</div></div>')
        cont = float(c.get("duracao_contagem", 1.2))
        js.append(f'pop("#{p}", {ini:.3f}); words("#{p} .nl .wd", {ini + 0.15:.3f}); out("#{p}", {fim - 0.25:.3f});')
        js.append(f'tl.fromTo("#{p}v", {{ textContent: {de} }}, {{ textContent: {ate}, duration: {cont}, ease: "power2.out", snap: {{ textContent: {10 ** -casas} }}, immediateRender: false }}, {ini + 0.15:.3f});')
        S(ini, "pop"); S(ini + 0.15 + cont, "tick")
    elif tipo == "notificacoes":
        cards_html = "".join(
            f'<div class="notif glass" id="{p}n{n}">{appicon(it["icone"])}<div class="nb"><div class="nh"><span>{E(it["app"])}</span><span>{E(it.get("quando", "agora"))}</span></div>'
            f'<div class="nt">{E(it["titulo"])}</div><div class="nd">{E(it["texto"])}</div></div></div>' for n, it in enumerate(c["itens"]))
        layers_scene.append(f'<div id="{p}" class="scene clip" {dur(ini, fim)}><div class="glowblob" id="{p}glow"></div><div class="grid"></div>'
                            f'<div class="content" style="top:{c.get("topo", 320)}px"><div class="eyebrow" id="{p}eb"><span class="dot"></span>{E(c.get("eyebrow", ""))}</div>'
                            f'<div class="stitle" id="{p}t">{words_html(c["titulo"])}</div>{cards_html}</div></div>')
        js.append(f'scene("#{p}", "#{p}glow", {ini:.3f}, {fim - ini:.3f}); words("#{p}eb, #{p}t .wd", {ini + 0.05:.3f});'); S(ini, "whoosh")
        for n, it in enumerate(c["itens"]):
            js.append(f'pop("#{p}n{n}", {it["t"]:.3f}, {{ y0: -30, s0: 0.92 }});'); S(it["t"], "notif")
    elif tipo == "pesquisa":
        letters = "".join(f'<span class="ch" id="{p}l{n}">{E(ch)}</span>' for n, ch in enumerate(c["pesquisa"]))
        results = "".join(
            f'<div class="res" id="{p}r{n}"><span class="favi">{icon(r["icone"])}</span><div><div class="rt">{E(r["titulo"])}</div><div class="rd">{E(r["desc"])}</div></div><span class="hl"></span></div>'
            for n, r in enumerate(c["resultados"]))
        layers_scene.append(f'<div id="{p}" class="scene clip" {dur(ini, fim)}><div class="glowblob" id="{p}glow"></div><div class="grid"></div>'
                            f'<div class="content" style="top:{c.get("topo", 430)}px"><div class="eyebrow" id="{p}eb"><span class="dot"></span>{E(c.get("eyebrow", ""))}</div>'
                            f'<div class="stitle" id="{p}t">{words_html(c["titulo"])}</div>'
                            f'<div class="browser glass" id="{p}b"><div class="dots"><i></i><i></i><i></i></div><div class="bar">{icon("search")}<span class="q">{letters}</span><span class="caret" id="{p}caret"></span></div>{results}</div>'
                            f'<div class="pointer" id="{p}ptr">{POINTER}</div></div></div>')
        js.append(f'scene("#{p}", "#{p}glow", {ini:.3f}, {fim - ini:.3f});')
        js.append(f'tl.set("#{p}b", {{ height: 192 }}, 0); words("#{p}eb, #{p}t .wd", {ini + 0.05:.3f}); pop("#{p}b", {ini + 0.1:.3f});')
        for n, r in enumerate(c["resultados"]):
            js.append(f'tl.to("#{p}b", {{ height: {196 + 146 * (n + 1)}, ease: "power3.out", duration: 0.35 }}, {r["t"] - 0.05:.3f});')
        S(ini, "whoosh")
        esc = c.get("escrever", ini + 0.35)
        for n, _ in enumerate(c["pesquisa"]):
            t = esc + n * 0.09; js.append(f'tl.set("#{p}l{n}", {{ opacity: 1 }}, {t:.3f});'); S(t, "type")
        js.append(f'tl.set("#{p}caret", {{ opacity: 0 }}, {esc + len(c["pesquisa"]) * 0.09 + 0.5:.3f});')
        for n, r in enumerate(c["resultados"]):
            js.append(f'pop("#{p}r{n}", {r["t"]:.3f}, {{ y0: 12, s0: 0.97, d: 0.4 }});'); S(r["t"], "pop")
        cur = c.get("cursor")
        if cur:
            js.append(f'tl.fromTo("#{p}ptr", {{ opacity: 0, x: {cur["x0"]}, y: {cur["y0"]} }}, {{ opacity: 1, duration: 0.2 }}, {cur["t"]:.3f});')
            js.append(f'tl.to("#{p}ptr", {{ x: {cur["x1"]}, y: {cur["y1"]}, ease: "power2.inOut", duration: 0.7 }}, {cur["t"] + 0.1:.3f});')
            js.append(f'tl.to("#{p}ptr", {{ scale: 0.85, duration: 0.08, yoyo: true, repeat: 1, ease: "power1.inOut" }}, {cur["t"] + 0.85:.3f});')
            js.append(f'tl.fromTo("#{p}r{cur["res"]} .hl", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.2 }}, {cur["t"] + 0.85:.3f});'); S(cur["t"] + 0.85, "click")
    elif tipo == "mosaicos":
        tiles = "".join(f'<div class="tile glass dark" id="{p}t{n}">{appicon(t["icone"])}<span>{E(t["texto"])}</span></div>' for n, t in enumerate(c["itens"]))
        layers_over.append(f'<div id="{p}" class="clip tiles" style="top:{topo}px" {dur(ini, fim)}>{tiles}</div>')
        for n, t in enumerate(c["itens"]):
            js.append(f'pop("#{p}t{n}", {t["t"]:.3f}, {{ s0: 0.9, y0: 10, d: 0.4 }});'); S(t["t"], "tick")
        js.append(f'out("#{p}", {fim - 0.25:.3f});')
    elif tipo == "lower_third":
        badge = E(c.get("emblema", c["nome"][:1].upper()))
        layers_over.append(f'<div id="{p}" class="clip lt" style="top:{c.get("topo", 1400)}px" {dur(ini, fim)}><div id="{p}pill" class="ltpill glass dark"><span class="badge">{badge}</span>'
                           f'<div><div class="name">{E(c["nome"])}</div><div class="handle">{E(c.get("handle", ""))}</div></div></div></div>')
        js.append(f'tl.fromTo("#{p}pill", {{ opacity: 0, x: -24, filter: "blur(8px)" }}, {{ opacity: 1, x: 0, filter: "blur(0px)", ease: SPRING, duration: 0.45 }}, {ini:.3f}); out("#{p}pill", {fim - 0.25:.3f});')
        S(ini, "pop")
    elif tipo == "remate":
        layers_over.append(f'<div id="{p}" class="panel glass dark clip remate" style="top:{topo}px" {dur(ini, fim)}><div class="a">{words_html(c["a"])}</div><div class="b serif" id="{p}b">{E(c["b"])}</div></div>')
        js.append(f'pop("#{p}", {ini:.3f}); words("#{p} .wd", {ini + 0.1:.3f});')
        js.append(f'tl.fromTo("#{p}b", {{ opacity: 0, y: 14, filter: "blur(10px)", textShadow: "0 0 0px rgba({A},0)" }}, {{ opacity: 1, y: 0, filter: "blur(0px)", textShadow: "0 0 22px rgba({A},.42)", ease: "power3.out", duration: 0.5 }}, {ini + 0.3:.3f});')
        js.append(f'out("#{p}", {fim - 0.25:.3f});'); S(ini, "shimmer")
    elif tipo == "cta":
        fim_cta = c.get("fim", TOTAL_VIDEO)
        layers_over.append(f'<div id="{p}" class="clip" {dur(ini, fim_cta)}><div class="notif glass dark ctan" id="{p}n" style="top:{topo}px">{appicon(c.get("icone", "send"))}<div class="nb"><div class="nh"><span>{E(c.get("app", ""))}</span><span>agora</span></div>'
                           f'<div class="nt">{E(c["titulo"])}</div><div class="nd">{E(c.get("texto", ""))}</div></div></div></div>')
        js.append(f'pop("#{p}n", {ini:.3f}, {{ y0: -60, s0: 0.95, d: 0.5 }}); out("#{p}", {fim_cta - 0.25:.3f});'); S(ini, "notif")
    else:
        print("AVISO componente desconhecido:", tipo, file=sys.stderr)
CARDS = [tuple(x) for x in cfg["cartoes_janelas"]] if "cartoes_janelas" in cfg else cards

# ---------- enquadramento: zooms lentos só nos momentos-chave, cara sempre abaixo dos cartões ----------
def card_bottom(a, b): return max([c[2] for c in CARDS if c[0] < b and c[1] > a] or [0])
def frame_for(Z, take, bottom):
    face = take["fw"] * VID_W * Z
    eye_t = 0.35 * H
    if bottom: eye_t = max(eye_t, bottom + 20 + 0.75 * face)
    eye_max = LEG_TOPO - 0.6 * face
    ty = min(0, max(H - VID_H * Z, eye_t - take["eye"] * VID_H * Z))
    tx = min(0, max(W - VID_W * Z, W / 2 - take["cx"] * VID_W * Z))
    eye = ty + take["eye"] * VID_H * Z
    ok = (not bottom or eye - 0.75 * face >= bottom + 10) and eye <= eye_max
    return {"x": round(tx, 1), "y": round(ty, 1), "scale": round(Z, 4)}, ok
def best_frame(mult, take, bottom):
    for mm in [mult, (mult + 1) / 2, 1.0]:
        fr, ok = frame_for(take["base"] * mm, take, bottom)
        if ok: return fr, mm
    return fr, mm
moves = []
for kf in cfg.get("zoom_chave", []):
    take = take_of(kf["t"] + 0.01)
    if kf.get("push"):
        end_t = kf["t"] + kf["push"]
        fr0, _ = best_frame(kf["de"], take, card_bottom(kf["t"], kf["t"] + 0.1))
        fr1, _ = best_frame(kf["para"], take, card_bottom(kf["t"], end_t))
        moves.append({"t": kf["t"], "push": kf["push"], "from": fr0, "to": fr1, "ease": kf.get("ease", "sine.inOut")})
    else:
        fr, _ = best_frame(kf["mult"], take, card_bottom(kf["t"], kf.get("ate", kf["t"] + 1)))
        moves.append({"t": kf["t"], "set": fr})
moves_js = []
for mv in moves:
    if "set" in mv:
        f = mv["set"]; moves_js.append(f'tl.set("#vid", {{ x: {f["x"]}, y: {f["y"]}, scale: {f["scale"]} }}, {mv["t"]});')
    else:
        a, b = mv["from"], mv["to"]
        moves_js.append(f'tl.fromTo("#vid", {{ x: {a["x"]}, y: {a["y"]}, scale: {a["scale"]} }}, {{ x: {b["x"]}, y: {b["y"]}, scale: {b["scale"]}, ease: "{mv["ease"]}", duration: {mv["push"]}, immediateRender: false }}, {mv["t"]});')

# ---------- legendas (HTML e animação por estilo) ----------
cap_html, cap_js = [], []
for k, c in enumerate(chunks):
    spans = [f'<span class="w"><span class="l">{E(cap_word(w))}</span><span class="b" id="c{k}b{n}">{E(cap_word(w))}</span></span>' for n, w in enumerate(c["words"])]
    cap_html.append(f'<div class="cap clip" id="cap{k}" data-start="{c["s"]:.3f}" data-duration="{c["e"] - c["s"]:.3f}">{" ".join(spans)}</div>')
    if ESTILO == "simples": continue
    for n, w in enumerate(c["words"]):
        t0 = max(c["s"], w["s"] - 0.02)
        cap_js.append(f'tl.fromTo("#c{k}b{n}", {{ opacity: 0 }}, {{ opacity: 1, duration: 0.08, ease: "none" }}, {t0:.3f});')
        if ESTILO == "destaque":  # só a palavra que está a ser dita fica na cor de acento
            t1 = min(c["e"], c["words"][n + 1]["s"] - 0.02) if n + 1 < len(c["words"]) else c["e"]
            t1 = min(c["e"], max(t1, t0 + 0.12))
            cap_js.append(f'tl.to("#c{k}b{n}", {{ opacity: 0, duration: 0.06, ease: "none" }}, {max(t0 + 0.06, t1 - 0.06):.3f});')
CAP_CSS = {
    "iman": ".cap .l {{ font-weight: 300; }} .cap .b {{ font-weight: 700; opacity: 0; }}",
    "destaque": ".cap {{ letter-spacing: -0.005em; }} .cap .l {{ font-weight: 800; }} .cap .b {{ font-weight: 800; color: var(--accent); opacity: 0; text-shadow: 0 0 20px rgba({A},.55), 0 2px 6px rgba(0,0,0,.75); }}",
    "simples": ".cap .l {{ font-weight: 700; }} .cap .b {{ display: none; }}",
}[ESTILO].replace("{{", "{").replace("}}", "}")

# ---------- frame final ----------
end_html = ""
if END_CARD > 0:
    end_html = (f'<div id="end" class="scene clip" {dur(TOTAL_VIDEO, TOTAL)}><div class="glowblob" id="endglow"></div><div class="grid"></div>'
                f'<div class="content endc"><img src="assets/logo.png" alt="{E(MARCA)}" id="endlogo" />'
                + (f'<div class="cta" id="endpill">{icon("send")}{E(FINAL["botao"])}</div>' if FINAL.get("botao") else "")
                + f'<div id="endhandle">{E(FINAL.get("handle", ""))}</div></div></div>')
    js.append(f'scene("#end", "#endglow", {TOTAL_VIDEO:.3f}, {TOTAL - TOTAL_VIDEO:.3f}); pop("#endlogo", {TOTAL_VIDEO + 0.05:.3f});'
              + (f' pop("#endpill", {TOTAL_VIDEO + 0.2:.3f});' if FINAL.get("botao") else "")
              + f' pop("#endhandle", {TOTAL_VIDEO + 0.3:.3f}, {{ s0: 1 }});')
    S(TOTAL_VIDEO, "whoosh"); S(TOTAL_VIDEO + 0.2, "shimmer")

LT_PAD = 20 if any(c.get("emblema") == "*" for c in COMP if c["tipo"] == "lower_third") else 0
doc = f'''<!doctype html>
<html lang="{cfg.get("lingua", "pt-PT")}" data-resolution="portrait">
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
  --glow: 0 0 28px rgba({A},.55); --margin: 72px;
}}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
html, body {{ width: 1080px; height: 1920px; overflow: hidden; background: #000; }}
#root {{ position: relative; width: 1080px; height: 1920px; overflow: hidden; font-family: "MontV", sans-serif; color: var(--ink); -webkit-font-smoothing: antialiased; }}
#vid {{ position: absolute; left: 0; top: 0; width: {VID_W}px; height: {VID_H}px; transform-origin: 0 0; object-fit: fill; }}
.ico {{ display: inline-flex; flex: 0 0 auto; }}
.ico svg {{ width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }}
.acc {{ color: var(--accent); text-shadow: var(--glow); }}
.serif {{ font-family: "Instrument Serif", serif; font-style: italic; font-weight: 400; letter-spacing: 0; color: var(--accent); text-shadow: 0 0 22px rgba({A},.42); }}
.glass {{ background: linear-gradient(180deg, rgba(48,48,48,.58), rgba(14,14,14,.66)); -webkit-backdrop-filter: blur(18px) saturate(160%); backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid rgba(255,255,255,.14); border-top-color: rgba(255,255,255,.42); box-shadow: 0 10px 30px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.06); }}
.dark {{ background: linear-gradient(180deg, rgba(26,26,26,.80), rgba(8,8,8,.86)); }}
.appicon {{ display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 84px; height: 84px; border-radius: 22px;
  background: linear-gradient(180deg, var(--accent-light) 0%, var(--accent) 55%, var(--accent-bottom) 100%); color: #fff;
  box-shadow: 0 6px 16px rgba({A},.35), inset 0 1px 0 rgba(255,255,255,.4); }}
.appicon .ico {{ width: 44px; height: 44px; }}
.appicon .ico svg {{ stroke-width: 2.2; }}
#scrim {{ position: absolute; left: 0; right: 0; top: {LEG_TOPO - 260}px; height: 640px; background: linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.38) 40%, rgba(0,0,0,.38) 62%, rgba(0,0,0,0) 100%); }}
.cap {{ position: absolute; left: 90px; width: 900px; top: {LEG_TOPO}px; text-align: center; font-size: {LEG.get("tamanho", 60)}px; line-height: 1.15;
  letter-spacing: -0.01em; color: #fff; text-shadow: 0 0 18px rgba(0,0,0,.55), 0 2px 6px rgba(0,0,0,.75), 0 1px 2px rgba(0,0,0,.8); }}
.cap .w {{ display: inline-grid; justify-items: center; }}
.cap .l, .cap .b {{ grid-area: 1 / 1; }}
{CAP_CSS}
.scene {{ position: absolute; inset: 0; overflow: hidden; background: radial-gradient(1400px 1100px at 50% 45%, {SCENE_BG} 0%, #060606 65%, #000 100%); }}
.scene .glowblob {{ position: absolute; left: 140px; top: 280px; width: 800px; height: 800px; border-radius: 50%;
  background: radial-gradient(circle, rgba({A},.30) 0%, rgba({AD},.16) 45%, rgba(0,0,0,0) 70%); filter: blur(30px); }}
.scene .grid {{ position: absolute; inset: -2px; background-image: linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px);
  background-size: 72px 72px; background-position: 36px 36px; -webkit-mask-image: radial-gradient(900px 1100px at 50% 40%, #000 25%, transparent 80%); }}
.scene .content {{ position: absolute; left: var(--margin); right: var(--margin); top: 320px; }}
.eyebrow {{ display: inline-flex; align-items: center; gap: 12px; font-size: 32px; font-weight: 600; color: var(--muted); letter-spacing: .01em; }}
.eyebrow .dot {{ width: 12px; height: 12px; border-radius: 6px; background: var(--accent); box-shadow: var(--glow); }}
.stitle {{ font-size: 66px; font-weight: 800; letter-spacing: -0.025em; line-height: 1.05; margin: 16px 0 40px; }}
.notif {{ display: flex; gap: 24px; align-items: center; padding: 26px 30px; border-radius: 34px; margin-bottom: 20px; opacity: 0; }}
.notif .nb {{ flex: 1; min-width: 0; }}
.notif .nh {{ display: flex; justify-content: space-between; font-size: 32px; font-weight: 600; color: var(--muted); }}
.notif .nt {{ font-size: 42px; font-weight: 700; letter-spacing: -0.01em; margin-top: 2px; }}
.notif .nd {{ font-size: 34px; font-weight: 500; color: #D9D9D9; margin-top: 2px; }}
.browser {{ border-radius: 34px; padding: 26px 28px 30px; opacity: 0; overflow: hidden; }}
.browser .dots {{ display: flex; gap: 10px; margin: 0 0 20px 6px; }}
.browser .dots i {{ width: 16px; height: 16px; border-radius: 8px; background: rgba(255,255,255,.22); }}
.browser .bar {{ display: flex; align-items: center; gap: 10px; height: 100px; padding: 0 30px; border-radius: 50px; background: rgba(0,0,0,.42); border: 1px solid rgba(255,255,255,.12); }}
.browser .bar .ico {{ width: 40px; height: 40px; color: var(--muted); }}
.browser .q {{ font-size: 50px; font-weight: 600; margin-left: 8px; }}
.browser .q .ch {{ opacity: 0; }}
.browser .caret {{ width: 3px; height: 54px; background: var(--ink); margin-left: 2px; }}
.res {{ position: relative; display: flex; align-items: center; gap: 22px; margin-top: 18px; padding: 22px 24px; border-radius: 22px; opacity: 0; }}
.res .favi {{ display: inline-flex; align-items: center; justify-content: center; width: 72px; height: 72px; border-radius: 18px; background: rgba({A},.14); color: var(--accent-light); flex: 0 0 auto; }}
.res .favi .ico {{ width: 40px; height: 40px; }}
.res .rt {{ font-size: 46px; font-weight: 700; letter-spacing: -0.015em; }}
.res .rd {{ font-size: 32px; font-weight: 500; color: var(--muted); margin-top: 2px; }}
.res .hl {{ position: absolute; inset: 0; border-radius: 22px; background: rgba(255,255,255,.07); border: 1px solid rgba({A},.45); box-shadow: 0 0 24px rgba({A},.25); opacity: 0; }}
.pointer {{ position: absolute; width: 56px; height: 72px; left: 0; top: 0; opacity: 0; filter: drop-shadow(0 6px 10px rgba(0,0,0,.5)); }}
.panel {{ position: absolute; left: var(--margin); right: var(--margin); border-radius: 36px; padding: 36px 40px; opacity: 0; }}
.gancho h1 {{ font-size: 70px; font-weight: 800; line-height: 1.08; letter-spacing: -0.025em; }}
.gancho .wd, .remate .wd, .lista .ltit .wd, .numero .nl .wd {{ display: inline-block; }}
.palavra {{ position: absolute; left: var(--margin); right: var(--margin); text-align: center; }}
.palavra .pw {{ display: inline-block; font-size: 110px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.0; opacity: 0; text-shadow: 0 0 24px rgba(0,0,0,.6), 0 3px 8px rgba(0,0,0,.7); }}
.lista .ltit {{ font-size: 56px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.08; margin-bottom: 18px; }}
.lista .li {{ display: flex; align-items: center; gap: 18px; font-size: 44px; font-weight: 700; letter-spacing: -0.01em; padding: 12px 0; opacity: 0; }}
.lista .lic {{ width: 52px; height: 52px; color: var(--accent); }}
.numero {{ text-align: center; }}
.numero .nv {{ font-size: 150px; font-weight: 800; letter-spacing: -0.04em; line-height: 1.0; color: var(--accent); text-shadow: var(--glow); font-variant-numeric: tabular-nums; }}
.numero .nl {{ font-size: 44px; font-weight: 700; margin-top: 10px; }}
.tiles {{ position: absolute; left: var(--margin); right: var(--margin); display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }}
.tile {{ display: flex; align-items: center; gap: 18px; padding: 18px 20px; border-radius: 28px; font-size: 36px; font-weight: 700; letter-spacing: -0.01em; opacity: 0; }}
.tile .appicon {{ width: 72px; height: 72px; border-radius: 19px; }}
.tile .appicon .ico {{ width: 38px; height: 38px; }}
.lt {{ position: absolute; left: 0; width: 1080px; display: flex; justify-content: center; }}
.ltpill {{ display: flex; align-items: center; gap: 18px; height: 112px; padding: 0 44px 0 16px; border-radius: 56px; opacity: 0; }}
.ltpill .badge {{ width: 80px; height: 80px; border-radius: 40px; display: flex; align-items: center; justify-content: center; font-size: 64px; font-weight: 800; line-height: 1;
  background: linear-gradient(180deg, var(--accent-light), var(--accent) 60%, var(--accent-bottom)); color: #fff; box-shadow: 0 6px 16px rgba({A},.35); padding-top: {LT_PAD}px; }}
.ltpill .name {{ font-size: 40px; font-weight: 800; letter-spacing: -0.015em; line-height: 1.05; }}
.ltpill .handle {{ font-size: 32px; font-weight: 500; color: var(--muted); line-height: 1.15; }}
.remate {{ text-align: center; padding: 34px 40px 40px; }}
.remate .a {{ font-size: 60px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.05; }}
.remate .b {{ font-size: 116px; line-height: 1.0; margin-top: 6px; }}
.ctan {{ position: absolute; left: var(--margin); right: var(--margin); margin: 0; box-shadow: 0 10px 30px rgba(0,0,0,.28), 0 0 0 1px rgba({A},.55), 0 0 44px rgba({A},.30); }}
.cta {{ display: inline-flex; align-items: center; gap: 12px; height: 112px; padding: 0 48px 0 34px; border-radius: 56px;
  background: linear-gradient(180deg, var(--accent-top), var(--accent-bottom)); border: 1px solid rgba(255,255,255,.18); border-top: 1px solid rgba(255,255,255,.55);
  box-shadow: 0 8px 24px rgba(0,0,0,.2), 0 0 40px rgba({A},.35); color: {CTA_INK}; font-size: 48px; font-weight: 800; letter-spacing: -0.015em; white-space: nowrap; }}
.cta .ico {{ width: 38px; height: 38px; }}
.scene .content.endc {{ top: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }}
#endlogo {{ width: 560px; }}
#endpill {{ margin-top: 88px; }}
#endhandle {{ margin-top: 30px; font-size: 36px; font-weight: 600; color: var(--muted); }}
</style>
</head>
<body>
<div id="root" data-composition-id="main" data-start="0" data-duration="{TOTAL:.3f}" data-width="1080" data-height="1920" data-fps="30">
  <video id="vid" class="clip" {dur(0, TOTAL_VIDEO)} src="assets/base.mp4" muted playsinline></video>
  {"".join(layers_scene)}
  {end_html}
  <div id="scrim" class="clip" {dur(0, TOTAL_VIDEO)}></div>
  {"".join(cap_html)}
  {"".join(layers_over)}
</div>
<script>
const tl = gsap.timeline({{ paused: true }});
const SPRING = "back.out(1.25)";
function pop(sel, t, o) {{ o = o || {{}}; tl.fromTo(sel, {{ opacity: 0, scale: o.s0 || 0.94, y: o.y0 === undefined ? 18 : o.y0, filter: "blur(10px)" }},
  {{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)", ease: SPRING, duration: o.d || 0.45 }}, t); }}
function words(sel, t) {{ tl.fromTo(sel, {{ opacity: 0, y: 14, filter: "blur(8px)" }}, {{ opacity: 1, y: 0, filter: "blur(0px)", ease: "power3.out", duration: 0.35, stagger: 0.06 }}, t); }}
function out(sel, t) {{ tl.to(sel, {{ opacity: 0, scale: 0.98, filter: "blur(6px)", ease: "power2.in", duration: 0.25 }}, t); }}
function scene(sel, glow, t, d) {{ tl.fromTo(sel, {{ opacity: 0 }}, {{ opacity: 1, duration: 0.15, ease: "none" }}, t);
  tl.fromTo(glow, {{ scale: 0.85, opacity: 0.6 }}, {{ scale: 1.1, opacity: 1, ease: "sine.inOut", duration: d }}, t); }}
'''
doc += "\n".join(moves_js + cap_js + js) + '''
window.__timelines = window.__timelines || {};
window.__timelines["main"] = tl;
tl.seek(0);
</script>
</body>
</html>
'''
(work / "hf").mkdir(exist_ok=True)
(work / "hf" / "index.html").write_text(doc)
json.dump(sorted(sfx), open(work / "sfx_eventos.json", "w"))
ov = [k for k, (a, b) in enumerate(zip(chunks, chunks[1:])) if a["e"] > b["s"] + 1e-6]
print(f"{len(chunks)} linhas de legenda ({ESTILO}, sobreposições: {len(ov)}), {len(COMP)} componentes, {len(moves)} chaves de enquadramento, "
      f"{len(sfx)} SFX, vídeo {SRC_W}x{SRC_H}, total {TOTAL}s")
