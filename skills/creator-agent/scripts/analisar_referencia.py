# Analisa um vídeo de referência (de outro criador, que o criador enviou ou que se pode descarregar legalmente)
# para tirar o estilo de edição com dados, não de memória.
# Uso: python3 analisar_referencia.py <video> <pasta_saida> [--limiar 0.3]
# Escreve na pasta: ficha.json (ritmo de cortes, duração dos planos, sonoridade, paleta), planos.jpg (um fotograma por plano,
# com o tempo) e gancho.jpg (os primeiros 3 s em 6 fotogramas). O agente olha para as imagens para descrever legendas,
# gráficos e enquadramento, e escreve a ficha de estilo em referencias/estilos/<criador>.md.
import json, re, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw

src, out = sys.argv[1], Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
limiar = float(sys.argv[sys.argv.index("--limiar") + 1]) if "--limiar" in sys.argv else 0.3


def run(cmd): return subprocess.run(cmd, capture_output=True, text=True)


info = json.loads(run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height,avg_frame_rate", "-of", "json", src]).stdout)
dur = float(info["format"]["duration"])
v = next(s for s in info["streams"] if s["codec_type"] == "video")
tem_audio = any(s["codec_type"] == "audio" for s in info["streams"])
# 1) cortes: mudanças de cena fortes (gráficos, B-roll) e cortes secos (mesmo plano, pico em relação aos vizinhos)
r = run(["ffmpeg", "-hide_banner", "-i", src, "-vf", "scale=320:-2,select='gte(scene,0)',metadata=print:file=-", "-an", "-f", "null", "-"])
tempos = [float(t) for t in re.findall(r"pts_time:([\d.]+)", r.stdout)]
scores = [float(x) for x in re.findall(r"lavfi\.scene_score=([\d.]+)", r.stdout)]
n = min(len(tempos), len(scores)); cortes = []
for k in range(n):
    viz = sorted(scores[max(0, k - 15):k] + scores[k + 1:k + 16]) or [0.0]
    base = viz[len(viz) // 2]
    forte = scores[k] > limiar
    seco = scores[k] > max(0.02, 6 * base) and scores[k] == max(scores[max(0, k - 3):k + 4])
    if (forte or seco) and tempos[k] > 0.1 and (not cortes or tempos[k] - cortes[-1] > 0.25): cortes.append(round(tempos[k], 2))
inicios = [0.0] + cortes; planos = [b - a for a, b in zip(inicios, inicios[1:] + [dur])]
planos_ord = sorted(planos)
# 2) sonoridade
lufs = lra = None
if tem_audio:
    e = run(["ffmpeg", "-hide_banner", "-i", src, "-af", "ebur128=framelog=quiet", "-f", "null", "-"]).stderr
    i = re.findall(r"I:\s+(-?[\d.]+) LUFS", e); l = re.findall(r"LRA:\s+([\d.]+) LU", e)
    lufs = float(i[-1]) if i else None; lra = float(l[-1]) if l else None
# 3) fotogramas: um por plano (até 30) e o gancho
def frame(t, path, w=240):
    run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", src, "-frames:v", "1", "-vf", f"scale={w}:-2", str(path)])
    return Image.open(path).convert("RGB") if path.exists() else None
tmp = out / "_fotogramas"; tmp.mkdir(exist_ok=True)
amostra = inicios if len(inicios) <= 30 else [inicios[int(k * len(inicios) / 30)] for k in range(30)]
imgs = [(t, frame(min(dur - 0.05, t + 0.15), tmp / f"p{k:03d}.png")) for k, t in enumerate(amostra)]
imgs = [(t, im) for t, im in imgs if im]
def grelha(itens, cols, nome):
    if not itens: return
    w, h = itens[0][1].size; rows = (len(itens) + cols - 1) // cols
    g = Image.new("RGB", (w * cols, h * rows), (0, 0, 0)); d = ImageDraw.Draw(g)
    for k, (t, im) in enumerate(itens):
        x, y = (k % cols) * w, (k // cols) * h; g.paste(im.resize((w, h)), (x, y))
        d.rectangle([x, y, x + 64, y + 22], fill=(0, 0, 0)); d.text((x + 4, y + 4), f"{t:.1f}s", fill=(255, 255, 255))
    g.save(out / nome, quality=85)
grelha(imgs, 6, "planos.jpg")
gancho = [(t, frame(t, tmp / f"g{k}.png")) for k, t in enumerate([0.05, 0.5, 1.0, 1.5, 2.2, 2.9]) if t < dur]
grelha([(t, im) for t, im in gancho if im], 6, "gancho.jpg")
# 4) paleta e luz (média de todos os fotogramas por plano)
todos = Image.new("RGB", (len(imgs) * 60, 100))
for k, (_, im) in enumerate(imgs): todos.paste(im.resize((60, 100)), (k * 60, 0))
pal = todos.quantize(colors=6, method=Image.Quantize.MEDIANCUT)
cores = sorted(pal.getcolors(), reverse=True); rgb = pal.getpalette()
paleta = [{"hex": "#%02X%02X%02X" % tuple(rgb[i * 3:i * 3 + 3]), "pct": round(100 * n / (todos.width * todos.height))} for n, i in cores[:6]]
hsv = todos.convert("HSV"); _, s_, v_ = [list(c.getdata()) for c in hsv.split()]
ficha = {
    "ficheiro": Path(src).name, "duracao_s": round(dur, 2), "resolucao": f"{v['width']}x{v['height']}", "fps": v.get("avg_frame_rate"),
    "formato": "vertical" if v["height"] > v["width"] else "horizontal",
    "cortes": len(cortes), "cortes_por_minuto": round(60 * len(cortes) / dur, 1),
    "plano_medio_s": round(sum(planos) / len(planos), 2), "plano_mediano_s": round(planos_ord[len(planos_ord) // 2], 2),
    "plano_mais_curto_s": round(planos_ord[0], 2), "plano_mais_longo_s": round(planos_ord[-1], 2),
    "cortes_nos_primeiros_3s": sum(1 for t in cortes if t < 3),
    "sonoridade_lufs": lufs, "variacao_lu": lra,
    "paleta": paleta, "saturacao_media": round(sum(s_) / len(s_) / 2.55), "brilho_medio": round(sum(v_) / len(v_) / 2.55),
    "tempos_dos_cortes": cortes,
    "nota": "cortes = mudanças de imagem (inclui gráficos de ecrã inteiro e B-roll); confirma nas imagens planos.jpg e gancho.jpg",
}
json.dump(ficha, open(out / "ficha.json", "w"), ensure_ascii=False, indent=1)
for p in tmp.iterdir(): p.unlink()
tmp.rmdir()
print(json.dumps({k: v for k, v in ficha.items() if k != "tempos_dos_cortes"}, ensure_ascii=False, indent=1))
print(f"Imagens: {out / 'planos.jpg'} e {out / 'gancho.jpg'}")
