# Pipeline de edição de um short 9:16, em quatro comandos. Corre a partir de qualquer pasta.
#
#   python3 pipeline.py preparar <pasta_do_video> [--modelo large-v3] [--cortes-manuais "[[15.2,16.98]]"] [--limiar -40] [--fonte gravados/x.mov]
#   python3 pipeline.py render   <pasta_do_video>
#   python3 pipeline.py audio    <pasta_do_video> [--sem-musica] [--rt60 0.5]
#   python3 pipeline.py exportar <pasta_do_video> <vN> --titulo "o que mudou" [--chat-mb 30] [--capa-t 1.4]
#   python3 pipeline.py tudo     <pasta_do_video> <vN> --titulo "o que mudou"      (render + audio + exportar)
#
# Pastas: <video>/gravados (originais, nunca alterados), <video>/trabalho (JSON de trabalho, vai para o git),
# <video>/trabalho/tmp (áudio, vídeo intermédio e projeto HyperFrames, fora do git), <video>/vN (entrega).
# O "preparar" escreve trabalho/config.json inicial (se não existir) com o enquadramento sugerido e os tokens da marca.
# O agente preenche os componentes (biblioteca/componentes.md) antes do render.
import argparse, json, os, re, shutil, subprocess, sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
PY = sys.executable
HF_VERSAO = os.environ.get("HYPERFRAMES_VERSAO", "0.8.140")
GSAP_VERSAO = "3.14.2"
CACHE = Path(os.environ.get("CREATOR_AGENT_CACHE", Path.home() / ".cache" / "creator-agent"))
VIDEO_EXT = (".mov", ".mp4", ".m4v", ".mkv", ".avi", ".webm")


def sh(cmd, **kw):
    print("  $", " ".join(str(c) for c in cmd)[:220], flush=True)
    return subprocess.run([str(c) for c in cmd], check=True, **kw)


def py(script, *args, **kw):
    return sh([PY, AQUI / script, *args], **kw)


def probe(path, entries, stream="v:0"):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", stream, "-show_entries", entries, "-of", "json", str(path)],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def duracao(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
                                capture_output=True, text=True, check=True).stdout.strip())


def lufs(path):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(path), "-af", "ebur128=peak=true:framelog=quiet", "-f", "null", "-"],
                       capture_output=True, text=True)
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr); p = re.findall(r"Peak:\s+(-?[\d.]+) dBFS", r.stderr)
    return (float(i[-1]) if i else None, float(p[-1]) if p else None)


class Video:
    def __init__(self, pasta):
        self.dir = Path(pasta).resolve()
        if not self.dir.is_dir(): sys.exit(f"Pasta do vídeo não existe: {self.dir}")
        self.trab = self.dir / "trabalho"; self.tmp = self.trab / "tmp"
        self.trab.mkdir(exist_ok=True); self.tmp.mkdir(exist_ok=True)
        self.slug = re.sub(r"^\d{4}-\d{2}-\d{2}_", "", self.dir.name)
        self.criador = next((p for p in [self.dir, *self.dir.parents] if (p / "creator.md").exists()), None)
        self.cfg_path = self.trab / "config.json"

    def cfg(self):
        if not self.cfg_path.exists(): sys.exit(f"Falta {self.cfg_path}: corre primeiro 'preparar'.")
        return json.load(open(self.cfg_path))

    def fonte_original(self, escolhida=None):
        if not escolhida and (self.trab / "fonte.txt").exists(): escolhida = (self.trab / "fonte.txt").read_text().strip()
        if escolhida: return (self.dir / escolhida) if not Path(escolhida).is_absolute() else Path(escolhida)
        vids = sorted(p for p in (self.dir / "gravados").glob("*") if p.suffix.lower() in VIDEO_EXT)
        if not vids: sys.exit("Não há vídeos em gravados/.")
        if len(vids) > 1:
            sys.exit("Há vários vídeos em gravados/: " + ", ".join(v.name for v in vids) +
                     ". Escolhe um com --fonte, ou junta-os primeiro (ffmpeg concat) num só ficheiro.")
        return vids[0]

    @property
    def fonte(self):  # versão a 30 fps constantes, que todos os passos usam
        return self.tmp / "fonte_30fps.mp4"

    def perfil(self):
        """Lê do creator.md o que o pipeline precisa: língua, nome, handle e acento da marca."""
        if not self.criador: return {}
        txt = (self.criador / "creator.md").read_text()
        for extra in ("estrategia/sistema-design.md",):
            if (self.criador / extra).exists(): txt += "\n" + (self.criador / extra).read_text()
        def campo(nome):
            m = re.search(rf"^{nome}:\s*(.+)$", txt, re.M | re.I); return m.group(1).strip() if m else ""
        acc = re.search(r"acento[^\n]*?(#[0-9A-Fa-f]{6})", txt, re.I)
        lingua = campo("língua") or campo("lingua")
        code = "en" if re.search(r"ingl|english", lingua, re.I) else "es" if re.search(r"espanh|spanish", lingua, re.I) else "pt"
        return {"nome": campo("nome").split(",")[0].split("(")[0].strip(), "handle": campo("handle"),
                "acento": acc.group(1) if acc else "#FF2E00", "lingua": code,
                "html_lang": {"pt": "pt-BR" if re.search(r"brasil", lingua, re.I) else "pt-PT", "en": "en", "es": "es"}[code]}


# ---------------------------------------------------------------- preparar
def preparar(v, a):
    orig = v.fonte_original(a.fonte)
    (v.trab / "fonte.txt").write_text(os.path.relpath(orig, v.dir))
    info = probe(orig, "stream=width,height,avg_frame_rate,r_frame_rate:stream_tags=rotate")["streams"][0]
    print(f"Origem: {orig.name} {info.get('width')}x{info.get('height')} a {info.get('avg_frame_rate')} fps")
    # 1) 30 fps constantes (iPhone grava a 60 ou com fps variável; os cortes contam fotogramas a 30)
    if not v.fonte.exists() or a.refazer:
        # fontes 4K: reduzir já para 2560 px de altura (o base.mp4 usa 2480), em vez de recodificar 4K inteiro (lição 28)
        vf = "fps=30" + (",scale=-2:2560:flags=lanczos" if int(info.get("height") or 0) > 2560 else "")
        sh(["ffmpeg", "-v", "error", "-y", "-i", orig, "-vf", vf, "-c:v", "libx264", "-preset", "medium", "-crf", "14",
            "-c:a", "aac", "-b:a", "256k", "-ar", "48000", v.fonte])
    perfil = v.perfil()
    # 2) transcrição com tempos por palavra
    tr = v.trab / "transcricao.json"
    if not tr.exists() or a.refazer_transcricao:
        prompt = ", ".join(x for x in (perfil.get("nome"), perfil.get("handle"), a.vocabulario) if x)
        py("transcrever.py", v.fonte, tr, a.modelo, "--lingua", perfil.get("lingua", "pt"), "--prompt", prompt)
    # 3) cortes de silêncio (mais os manuais) e segmentos alinhados ao fotograma
    sh(["ffmpeg", "-v", "error", "-y", "-i", v.fonte, "-ac", "1", "-ar", "16000", v.tmp / "voz16k.wav"])
    with open(v.trab / "cortes.json", "w") as f:
        py("cortes.py", v.tmp / "voz16k.wav", a.cortes_manuais, str(a.limiar), stdout=f)
    with open(v.tmp / "frames_pts.txt", "w") as f:
        sh(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "frame=pts_time", "-of", "csv=p=0", v.fonte], stdout=f)
    py("segmentos.py", v.trab / "cortes.json", v.tmp / "frames_pts.txt", v.trab / "segmentos.json")
    py("mapear.py", v.trab / "segmentos.json", tr, v.trab / "frases_cortadas.json", v.trab / "cortes.json")
    py("rostos.py", v.fonte, v.trab / "cortes.json", v.trab / "rostos.json")
    look = json.load(open(v.cfg_path)).get("look") if v.cfg_path.exists() else None
    py("base.py", v.fonte, v.trab / "segmentos.json", v.tmp / "frames_pts.txt", v.tmp / "base.mp4", json.dumps(look) if look else "")
    # 4) resumo e config inicial
    segs = json.load(open(v.trab / "segmentos.json"))
    cortes = json.load(open(v.trab / "cortes.json"))
    frases = json.load(open(v.trab / "frases_cortadas.json"))
    takes = sugerir_takes(json.load(open(v.trab / "rostos.json")), segs["segments"])
    if not v.cfg_path.exists():
        cfg = config_inicial(perfil, takes)
        json.dump(cfg, open(v.cfg_path, "w"), ensure_ascii=False, indent=1)
        print(f"Config inicial escrito em {v.cfg_path} (falta preencher 'graficos', 'destaques', 'zoom_chave' e 'correcoes').")
    print(f"\nPronto: {cortes['dur_in']:.1f} s originais -> {segs['total']:.1f} s ({100 * (1 - segs['total'] / cortes['dur_in']):.0f}% cortado), "
          f"{len(segs['segments'])} segmentos, {len(frases)} frases. Takes sugeridos: {json.dumps(takes)}")
    print("Transcrição na linha temporal cortada: trabalho/frases_cortadas.json (confirma nomes e termos e põe as correções no config).")


def sugerir_takes(rostos, segs):
    """Um take novo quando a câmara mudou: altura dos olhos ou tamanho da cara diferentes, num troço de 1 s ou mais,
    e a mudança mantém-se no troço seguinte (movimentos da cabeça não contam)."""
    out_de = {round(s["src"], 1): (s["out"], s["dur"]) for s in segs}
    pts = []
    for r in rostos:
        if r["cx"] is None: continue
        out, d = min(out_de.items(), key=lambda kv: abs(kv[0] - r["a"]))[1] if out_de else (0.0, 1.0)
        if d >= 1.0: pts.append({"t": out, "cx": r["cx"], "eye": r["eye_y"], "fw": r["fw"]})
    if not pts: return [{"desde": 0, "base": 1.0, "cx": 0.5, "eye": 0.45, "fw": 0.22}]
    med = lambda xs: sorted(xs)[len(xs) // 2]
    difere = lambda p, g: abs(p["eye"] - med([x["eye"] for x in g])) > 0.025 or abs(p["fw"] / med([x["fw"] for x in g]) - 1) > 0.12
    grupos = [[pts[0]]]
    for k, p in enumerate(pts[1:], 1):
        nxt = pts[k + 1] if k + 1 < len(pts) else None
        if difere(p, grupos[-1]) and (nxt is None or (difere(nxt, grupos[-1]) and not difere(nxt, [p]))):
            grupos.append([p])
        else:
            grupos[-1].append(p)
    res = []
    for g in grupos:
        fw = med([x["fw"] for x in g])
        res.append({"desde": round(g[0]["t"], 2) if res else 0, "base": 1.06 if fw < 0.215 else 1.0,
                    "cx": round(med([x["cx"] for x in g]), 3), "eye": round(med([x["eye"] for x in g]), 3), "fw": round(fw, 3)})
    return res


def config_inicial(p, takes):
    return {
        "lingua": p.get("html_lang", "pt-PT"), "end_card": 2.0, "takes": takes, "legenda_topo": 1180,
        "legendas": {"estilo": "iman", "tamanho": 60, "max_palavras": 4, "max_caracteres": 22},
        "correcoes": [], "destaques": [],
        "zoom_chave": [{"t": 0.0, "push": 2.6, "de": 1.0, "para": 1.07}],
        "tokens": {"accent": p.get("acento", "#FF2E00")},
        "marca": {"nome": p.get("handle") or p.get("nome") or "logo"},
        "graficos": [],
        "frame_final": {"botao": "", "handle": p.get("handle", "")},
        "sfx": {"extra": [], "trocar": {}, "remover": []},
    }


# ---------------------------------------------------------------- render
def npm_assets():
    """Fontes (OFL) e GSAP descarregados uma vez do npm para a cache local."""
    nm = CACHE / "npm" / "node_modules"
    pkgs = [f"gsap@{GSAP_VERSAO}", "@fontsource-variable/montserrat@5", "@fontsource/instrument-serif@5"]
    if not (nm / "gsap" / "dist" / "gsap.min.js").exists() or not (nm / "@fontsource" / "instrument-serif").exists():
        (CACHE / "npm").mkdir(parents=True, exist_ok=True)
        sh(["npm", "install", "--silent", "--no-audit", "--no-fund", "--prefix", CACHE / "npm", *pkgs])
    return {
        "js/gsap.min.js": nm / "gsap/dist/gsap.min.js",
        "fonts/montserrat-latin-wght-normal.woff2": nm / "@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2",
        "fonts/montserrat-latin-ext-wght-normal.woff2": nm / "@fontsource-variable/montserrat/files/montserrat-latin-ext-wght-normal.woff2",
        "fonts/instrument-serif-latin-400-italic.woff2": nm / "@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2",
    }


def logo_para(v, destino, cfg):
    cands = [v.criador / "assets/logo" / n for n in ("logo_borda.png", "logo.png")] if v.criador else []
    for c in cands:
        if c.exists(): shutil.copy(c, destino); return
    from PIL import Image, ImageDraw, ImageFont  # sem logo: escreve o nome da marca
    nome = cfg.get("marca", {}).get("nome", "logo")
    img = Image.new("RGBA", (1120, 360), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    try: f = ImageFont.truetype("DejaVuSans-Bold.ttf", 150)
    except OSError: f = ImageFont.load_default()
    w = d.textlength(nome, font=f); d.text(((1120 - w) / 2, 90), nome, font=f, fill=(255, 255, 255, 255)); img.save(destino)


def browser_env():
    env = dict(os.environ, HYPERFRAMES_SKIP_SKILLS="1")
    if "HYPERFRAMES_BROWSER_PATH" not in env:
        for c in sorted(Path("/opt/pw-browsers").glob("chromium_headless_shell-*/chrome-linux/headless_shell")) if Path("/opt/pw-browsers").exists() else []:
            env["HYPERFRAMES_BROWSER_PATH"] = str(c)
    return env


def eventos_sfx(auto, cfg):
    s = cfg.get("sfx", {})
    trocar = {round(float(k), 3): t for k, t in s.get("trocar", {}).items()}
    rem = s.get("remover", [])
    ev = []
    for t, kind in auto:
        if kind in rem or t in rem or round(t, 3) in rem: continue
        ev.append([t, trocar.get(round(t, 3), kind)])
    ev += [list(e) for e in s.get("extra", [])]
    return sorted(ev, key=lambda e: e[0])


def render(v, a):
    cfg = v.cfg()
    if not (v.tmp / "base.mp4").exists(): sys.exit("Falta trabalho/tmp/base.mp4: corre 'preparar'.")
    if not cfg.get("graficos"): print("AVISO: config sem componentes em 'graficos' (só legendas e zooms).")
    hf = v.tmp / "hf"; (hf / "assets" / "fonts").mkdir(parents=True, exist_ok=True); (hf / "assets" / "js").mkdir(exist_ok=True)
    (hf / "package.json").write_text(json.dumps({"name": "hf", "private": True, "type": "module"}, indent=1))
    (hf / "hyperframes.json").write_text(json.dumps({"$schema": "https://hyperframes.heygen.com/schema/hyperframes.json",
        "paths": {"blocks": "compositions", "components": "compositions/components", "assets": "assets"}, "media": {"autoProxy": True}}, indent=1))
    (hf / "meta.json").write_text(json.dumps({"id": "hf", "name": v.slug}, indent=1))
    for rel, src in npm_assets().items(): shutil.copy(src, hf / "assets" / rel)
    shutil.copy(v.tmp / "base.mp4", hf / "assets" / "base.mp4")
    logo_para(v, hf / "assets" / "logo.png", cfg)
    for f in ("frases_cortadas.json", "segmentos.json"): shutil.copy(v.trab / f, v.tmp / f)
    py("compor.py", v.tmp, v.cfg_path)
    ev = eventos_sfx(json.load(open(v.tmp / "sfx_eventos.json")), cfg)
    json.dump(ev, open(v.trab / "sfx_eventos.json", "w"))
    out = v.tmp / "render.mp4"
    cmd = ["npx", "--yes", f"hyperframes@{HF_VERSAO}", "render", ".", "-o", out, "--fps", "30", "--crf", "18"]
    if sys.platform.startswith("linux"): cmd.append("--no-browser-gpu")
    sh(cmd, cwd=hf, env=browser_env())
    print(f"Render: {out} ({duracao(out):.2f} s), {len(ev)} SFX em trabalho/sfx_eventos.json")


# ---------------------------------------------------------------- áudio
EQ_VOZ = ("highpass=f=85:p=2,equalizer=f=300:t=q:w=1.0:g=-2.5,equalizer=f=3500:t=q:w=1.2:g=2,highshelf=f=10000:g=1.5,"
          "deesser=i=0.35:m=0.5:f=0.5,acompressor=threshold=-20dB:ratio=3:attack=6:release=120:makeup=2:knee=4,alimiter=limit=0.95:level=disabled")


def mapa_sfx(v):
    """Mapa tipo de animação -> som: o do vídeo (trabalho/sfx_mapa.json) ou o do criador (assets/sons/mapa.json)."""
    sons = v.criador / "assets" / "sons" if v.criador else None
    for p in (v.trab / "sfx_mapa.json", sons / "mapa.json" if sons else None):
        if p and p.exists(): return p, sons or p.parent
    return None, None


def audio(v, a):
    cfg = v.cfg(); segs = json.load(open(v.trab / "segmentos.json"))
    end_card = float(cfg.get("end_card", 2.0)); total = round(segs["total"] + end_card, 3)
    t = v.tmp
    # voz: corte igual ao vídeo, remoção de reverberação (WPE e cauda tardia), EQ, de-esser, compressor e -14 LUFS
    py("voz_crua.py", v.fonte_original(), v.trab / "segmentos.json", str(end_card), t / "voz_crua.wav")
    py("dereverb.py", t / "voz_crua.wav", t / "voz_wpe.wav", "12")
    py("reverb_tardia.py", t / "voz_wpe.wav", t / "voz_lr.wav", str(a.rt60), "1.2", "0.2")
    sh(["ffmpeg", "-v", "error", "-y", "-i", t / "voz_lr.wav", "-af", EQ_VOZ, "-c:a", "pcm_s24le", t / "voz_pre.wav"])
    py("loudnorm2.py", t / "voz_pre.wav", t / "voz.wav", "-14", "-1.5")
    # música: composta em MIDI, a -23 LUFS, com ducking pela voz na mistura
    musica = None
    if not a.sem_musica and cfg.get("musica", {}).get("ativa", True):
        py("musica_midi.py", t / "musica.mid", t / "musica_raw.wav", str(total))
        sh(["ffmpeg", "-v", "error", "-y", "-i", t / "musica_raw.wav", "-af",
            f"atrim=0:{total},afade=t=in:d=1.2,afade=t=out:st={max(0, total - 2.2):.3f}:d=2.2,highpass=f=50,lowpass=f=12000",
            "-ar", "48000", "-c:a", "pcm_s24le", t / "musica_cut.wav"])
        py("loudnorm2.py", t / "musica_cut.wav", t / "musica.wav", str(cfg.get("musica", {}).get("lufs", -23)), "-3")
        musica = t / "musica.wav"
    # SFX: os sons do criador (mapa) ou gerados por código
    ev = v.trab / "sfx_eventos.json"
    if not ev.exists(): sys.exit("Falta trabalho/sfx_eventos.json: corre 'render' primeiro.")
    mapa, pasta = mapa_sfx(v)
    if mapa: py("sfx_amostras.py", str(total), ev, mapa, pasta, t / "sfx.wav")
    else: py("sfx.py", str(total), ev, t / "sfx.wav")
    # mistura
    ins = ["-i", t / "voz.wav"] + (["-i", musica] if musica else []) + ["-i", t / "sfx.wav"]
    fx = f"[{2 if musica else 1}:a]volume={cfg.get('sfx', {}).get('ganho_db', 4)}dB[fx]"
    if musica:
        fc = (f"[0:a]aformat=channel_layouts=stereo,asplit=2[v][key];[1:a][key]sidechaincompress=threshold=0.06:ratio=2:attack=40:release=500:makeup=1[duck];"
              f"{fx};[v][duck][fx]amix=inputs=3:normalize=0:duration=first,alimiter=limit=0.9:level=disabled[m]")
    else:
        fc = f"[0:a]aformat=channel_layouts=stereo[v];{fx};[v][fx]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.9:level=disabled[m]"
    sh(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", fc, "-map", "[m]", "-c:a", "pcm_s24le", t / "mix_pre.wav"])
    py("loudnorm2.py", t / "mix_pre.wav", t / "mix.wav", "-14", "-1.0")
    i, p = lufs(t / "mix.wav")
    print(f"Mistura: {i} LUFS, pico {p} dBFS, {duracao(t / 'mix.wav'):.2f} s" + (", com música" if musica else ", sem música")
          + (f", SFX do mapa {mapa}" if mapa else ", SFX gerados"))


# ---------------------------------------------------------------- exportar
def exportar(v, a):
    if not re.fullmatch(r"v\d+", a.versao): sys.exit("A versão tem de ser v1, v2, v3…")
    if not a.titulo: sys.exit("Falta --titulo (é o título do commit e da tabela de versões: 'vN - o que mudou').")
    out_dir = v.dir / a.versao
    if out_dir.exists() and not a.forcar: sys.exit(f"{out_dir} já existe: as versões anteriores ficam intactas. Usa a versão seguinte.")
    out_dir.mkdir(exist_ok=True)
    render_mp4, mix = v.tmp / "render.mp4", v.tmp / "mix.wav"
    for f in (render_mp4, mix):
        if not f.exists(): sys.exit(f"Falta {f}: corre 'render' e 'audio' primeiro.")
    mp4 = out_dir / f"{v.slug}_{a.versao}.mp4"
    look_exp = {"grao": 3, "vinheta": "PI/7", **(v.cfg().get("look") or {})}
    sh(["ffmpeg", "-v", "error", "-y", "-i", render_mp4, "-i", mix, "-map", "0:v", "-map", "1:a",
        "-vf", f"noise=alls={look_exp.get('grao', 3)}:allf=t," + (f"vignette=angle={look_exp['vinheta']}," if look_exp.get('vinheta', 'PI/7') else "") + "format=yuv420p", "-c:v", "libx264", "-crf", "19", "-preset", "medium", "-r", "30",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", mp4])
    sh(["ffmpeg", "-v", "error", "-y", "-ss", str(a.capa_t), "-i", mp4, "-frames:v", "1", out_dir / "capa.png"])
    d = duracao(mp4); qa = v.tmp / "qa"; shutil.rmtree(qa, ignore_errors=True); qa.mkdir()
    for k in range(12):
        sh(["ffmpeg", "-v", "error", "-y", "-ss", f"{(k + 0.5) * d / 12:.2f}", "-i", mp4, "-frames:v", "1", "-vf", "scale=270:480", qa / f"f{k:02d}.png"])
    sh(["ffmpeg", "-v", "error", "-y", "-i", qa / "f%02d.png", "-vf", "tile=6x2", "-frames:v", "1", "-q:v", "3", out_dir / "qa.jpg"])
    cfg = v.cfg(); cfg["sfx_eventos"] = json.load(open(v.trab / "sfx_eventos.json"))
    mapa, _ = mapa_sfx(v)
    if mapa: cfg["sfx_mapa"] = json.load(open(mapa))
    json.dump(cfg, open(out_dir / "config.json", "w"), ensure_ascii=False, indent=1)
    # cópia para enviar no chat, abaixo do limite de envio
    tam = mp4.stat().st_size / 2**20; chat = None
    if tam > a.chat_mb:
        alvo_kbps = int(a.chat_mb * 0.9 * 8 * 1024 / d) - 192
        chat = v.tmp / "chat" / f"{v.slug}_{a.versao}_chat.mp4"; chat.parent.mkdir(exist_ok=True)
        scale = [] if alvo_kbps >= 2500 else ["-vf", "scale=720:1280"]
        base = ["ffmpeg", "-v", "error", "-y", "-i", mp4, *scale, "-c:v", "libx264", "-preset", "slow", "-b:v", f"{alvo_kbps}k",
                "-maxrate", f"{int(alvo_kbps * 1.4)}k", "-bufsize", f"{alvo_kbps * 2}k", "-passlogfile", v.tmp / "chat" / "p"]
        sh([*base, "-pass", "1", "-an", "-f", "mp4", os.devnull])
        sh([*base, "-pass", "2", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", chat])
    # meta.json e tabela de versões do README do vídeo
    meta_p = v.dir / "meta.json"
    meta = json.load(open(meta_p)) if meta_p.exists() else {}
    meta.update({"estado": "editado", "versao": a.versao, "ficheiro": f"{a.versao}/{mp4.name}", "duracao_final_s": round(d, 1)})
    json.dump(meta, open(meta_p, "w"), ensure_ascii=False)
    readme = v.dir / "README.md"; linha = f"| [{a.versao}]({a.versao}/) | {a.versao} - {a.titulo} | (a aguardar) |"
    if readme.exists() and "| Versão |" in readme.read_text():
        txt = readme.read_text()
        txt = re.sub(r"(\| Versão \|[^\n]*\n\|[- |]+\|\n)", lambda m: m.group(1) + linha + "\n", txt, count=1)
        txt = re.sub(r"Versão atual: \[v\d+\]\([^)]*\)", f"Versão atual: [{a.versao}]({a.versao}/{mp4.name})", txt)
        readme.write_text(txt)
    else:
        readme.write_text(f"# {v.slug}\n\nVersão atual: [{a.versao}]({a.versao}/{mp4.name})\n\n## Versões\n\n| Versão | O que mudou | O teu feedback |\n| --- | --- | --- |\n{linha}\n")
    print("\nQA automático:")
    qa_cmd = [PY, AQUI / "qa_entrega.py", mp4, out_dir / "config.json", "--saida", out_dir / "qa.json", "--chat-mb", str(a.chat_mb)]
    if v.criador: qa_cmd += ["--criador", v.criador]
    if chat: qa_cmd += ["--chat", chat]
    qa_ok = subprocess.run([str(c) for c in qa_cmd]).returncode == 0
    if not qa_ok and not a.ignorar_qa:
        sys.exit(f"QA falhou: corrige o que está em {out_dir / 'qa.json'} e volta a exportar com --forcar (ou --ignorar-qa se for deliberado). Não faças commit desta versão.")
    i, p = lufs(mp4)
    print(f"\nEntregue: {mp4} ({tam:.1f} MB, {d:.2f} s, {i} LUFS, pico {p} dBFS)")
    if chat: print(f"Cópia para o chat: {chat} ({chat.stat().st_size / 2**20:.1f} MB)")
    print(f"Commit só desta versão: git add '{out_dir}' && git commit -m '{a.versao} - {a.titulo}'")
    print("Depois, num commit à parte: README.md, meta.json, plano-edicao.md e trabalho/.")


def main():
    ap = argparse.ArgumentParser(description="Pipeline de edição de shorts do creator-agent")
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("preparar"); p.add_argument("pasta")
    p.add_argument("--modelo", default="large-v3"); p.add_argument("--cortes-manuais", default="[]"); p.add_argument("--limiar", type=float, default=-40)
    p.add_argument("--fonte"); p.add_argument("--vocabulario", default="", help="nomes e termos para a transcrição")
    p.add_argument("--refazer", action="store_true"); p.add_argument("--refazer-transcricao", action="store_true")
    p = sub.add_parser("render"); p.add_argument("pasta")
    p = sub.add_parser("audio"); p.add_argument("pasta"); p.add_argument("--sem-musica", action="store_true"); p.add_argument("--rt60", type=float, default=0.5)
    for nome in ("exportar", "tudo"):
        p = sub.add_parser(nome); p.add_argument("pasta"); p.add_argument("versao"); p.add_argument("--titulo", required=True)
        p.add_argument("--chat-mb", type=float, default=30); p.add_argument("--capa-t", type=float, default=1.4); p.add_argument("--forcar", action="store_true")
        p.add_argument("--ignorar-qa", action="store_true", help="exporta mesmo que o QA automático falhe")
        if nome == "tudo": p.add_argument("--sem-musica", action="store_true"); p.add_argument("--rt60", type=float, default=0.5)
    a = ap.parse_args(); v = Video(a.pasta)
    if a.cmd == "preparar": preparar(v, a)
    elif a.cmd == "render": render(v, a)
    elif a.cmd == "audio": audio(v, a)
    elif a.cmd == "exportar": exportar(v, a)
    else: render(v, a); audio(v, a); exportar(v, a)


if __name__ == "__main__":
    main()
