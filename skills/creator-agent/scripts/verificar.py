# Verifica se a máquina tem tudo o que o creator-agent precisa para editar, e diz como instalar o que falta.
# Uso: python3 verificar.py [--completo]   (--completo testa também o HyperFrames e descarrega o que for preciso)
import importlib, os, platform, re, shutil, subprocess, sys
from pathlib import Path

SO = "mac" if sys.platform == "darwin" else "windows" if os.name == "nt" else "linux"
COMPLETO = "--completo" in sys.argv
HF = os.environ.get("HYPERFRAMES_VERSAO", "0.8.140")
falhas = []

INSTALAR = {
    "ffmpeg": {"linux": "sudo apt-get install -y ffmpeg", "mac": "brew install ffmpeg", "windows": "winget install Gyan.FFmpeg"},
    "node": {"linux": "instala Node 22: https://nodejs.org (ou nvm install 22)", "mac": "brew install node@22", "windows": "winget install OpenJS.NodeJS.LTS"},
    "fluidsynth": {"linux": "sudo apt-get update && sudo apt-get install -y fluidsynth fluid-soundfont-gm",
                   "mac": "brew install fluid-synth (e descarrega FluidR3_GM.sf2 para ~/.cache/creator-agent/)",
                   "windows": "winget install FluidSynth.FluidSynth (e descarrega FluidR3_GM.sf2 para %USERPROFILE%\\.cache\\creator-agent\\)"},
}
PIP = {"numpy": "numpy", "scipy": "scipy", "soundfile": "soundfile", "faster_whisper": "faster-whisper", "cv2": '"opencv-python-headless<5"',
       "nara_wpe": "nara_wpe", "noisereduce": "noisereduce", "mido": "mido", "PIL": "pillow"}


def ok(msg): print(f"  [ok] {msg}")
def falta(msg, como):
    print(f"  [falta] {msg}\n          -> {como}"); falhas.append(msg)
def versao(cmd):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=300); return r.stdout + r.stderr
    except Exception: return ""


print(f"Sistema: {platform.system()} {platform.machine()}, Python {platform.python_version()}")
print("\nPython")
if sys.version_info < (3, 10): falta("Python 3.10 ou superior", "https://www.python.org/downloads/")
else: ok(f"Python {platform.python_version()}")
for mod, pkg in PIP.items():
    try:
        m = importlib.import_module(mod)
        if mod == "cv2":
            if int(m.__version__.split(".")[0]) >= 5 or not hasattr(m, "CascadeClassifier"):
                falta(f"OpenCV {m.__version__} sem CascadeClassifier (a versão 5 removeu-o)", f"pip install {pkg}"); continue
        ok(f"{mod} {getattr(m, '__version__', '')}")
    except Exception:
        falta(f"módulo {mod}", f"pip install {pkg}")

print("\nProgramas")
if shutil.which("ffmpeg") and shutil.which("ffprobe"):
    v = (versao(["ffmpeg", "-version"]).splitlines() or ["ffmpeg"])[0]
    filtros = versao(["ffmpeg", "-hide_banner", "-filters"])
    em_falta = [f for f in ("loudnorm", "ebur128", "deesser", "sidechaincompress", "afftdn", "vignette", "noise") if f" {f} " not in filtros]
    ok(v[:60]) if not em_falta else falta(f"ffmpeg sem os filtros {', '.join(em_falta)}", INSTALAR["ffmpeg"][SO] + " (versão completa)")
else:
    falta("ffmpeg e ffprobe", INSTALAR["ffmpeg"][SO])
node = versao(["node", "--version"]).strip()
if node and int(re.sub(r"\D", "", node.split(".")[0]) or 0) >= 20 and shutil.which("npx"): ok(f"Node {node} e npx")
else: falta(f"Node 20 ou superior (tens: {node or 'nenhum'})", INSTALAR["node"][SO])
if shutil.which("fluidsynth") or shutil.which("fluidsynth.exe"): ok("fluidsynth")
else: falta("fluidsynth (música de fundo)", INSTALAR["fluidsynth"][SO])
sf = [p for p in (os.environ.get("SOUNDFONT"), "/usr/share/sounds/sf2/FluidR3_GM.sf2", "/usr/share/soundfonts/FluidR3_GM.sf2",
                  "/opt/homebrew/share/soundfonts/default.sf2", str(Path.home() / ".cache/creator-agent/FluidR3_GM.sf2")) if p and Path(p).exists()]
ok(f"soundfont {sf[0]}") if sf else falta("soundfont FluidR3_GM.sf2", INSTALAR["fluidsynth"][SO] + " ou define SOUNDFONT=/caminho/para.sf2")
for prog in ("git",):
    ok(prog) if shutil.which(prog) else falta(prog, "https://git-scm.com/downloads")

print("\nModelos e motion")
cache_hf = Path(os.environ.get("HF_HOME", Path.home() / ".cache/huggingface")) / "hub"
if any(cache_hf.glob("models--*whisper-large-v3*")): ok("modelo Whisper large-v3 já descarregado")
else: print("  [info] o modelo Whisper large-v3 (cerca de 3 GB) descarrega-se do huggingface.co na primeira transcrição")
if COMPLETO and shutil.which("npx"):
    out = versao(["npx", "--yes", f"hyperframes@{HF}", "doctor"])
    print("  " + "\n  ".join(l for l in re.sub(r"\x1b\[[0-9;]*m", "", out).splitlines()[-12:] if l.strip()))
else:
    print(f"  [info] HyperFrames {HF} corre com npx (corre com --completo para o testar e ver se o Chromium está pronto)")

print("\nResultado: " + ("tudo pronto para editar." if not falhas else f"faltam {len(falhas)} coisas (instala-as e volta a correr)."))
sys.exit(1 if falhas else 0)
