# Gera o vídeo base cortado (sem áudio), com cor corrigida e aumentado para 2480 px de altura, mantendo a proporção (cobre zoom até 130%).
# A origem tem de estar a 30 fps constantes (o pipeline.py converte antes).
# 5.º argumento opcional: JSON com o look do vídeo ({"contraste", "saturacao", "brilho", "gama"}); sem ele, o look aprovado
# (contraste 1.08, saturação 1.05, brilho 0.01, gama 1.0). Cenas escuras pedem gama acima de 1 e menos contraste.
# Seleciona por número de fotograma, igual a segmentos.json, para o áudio e as legendas baterem certo.
import json, subprocess, sys
src, segs, pts_file, out = sys.argv[1], json.load(open(sys.argv[2]))["segments"], sys.argv[3], sys.argv[4]
look = {"contraste": 1.08, "saturacao": 1.05, "brilho": 0.01, "gama": 1.0, **(json.loads(sys.argv[5]) if len(sys.argv) > 5 and sys.argv[5] else {})}
pts = sorted(float(l.strip().strip(",")) for l in open(pts_file) if l.strip().strip(","))
idx = {round(t, 4): i for i, t in enumerate(pts)}
expr = "+".join(f"between(n,{idx[s['src']]},{idx[s['src']] + s['n'] - 1})" for s in segs)
vf = (f"select='{expr}',setpts=N/(30*TB),"
      "scale=-2:2480:flags=lanczos,"
      f"eq=contrast={look['contraste']}:saturation={look['saturacao']}:brightness={look['brilho']}:gamma={look['gama']},"
      "unsharp=5:5:0.55:5:5:0.0,format=yuv420p")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", vf, "-an", "-fps_mode", "passthrough", "-video_track_timescale", "30000",
                "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-g", "15", out], check=True)
