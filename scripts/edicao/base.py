# Gera o vídeo base cortado (sem áudio), com cor corrigida e aumentado para 1404x2480 (cobre zoom até 130%).
# Seleciona por número de fotograma, igual a segmentos.json, para o áudio e as legendas baterem certo.
import json, subprocess, sys
src, segs, pts_file, out = sys.argv[1], json.load(open(sys.argv[2]))["segments"], sys.argv[3], sys.argv[4]
pts = sorted(float(l.strip().strip(",")) for l in open(pts_file) if l.strip().strip(","))
idx = {round(t, 4): i for i, t in enumerate(pts)}
expr = "+".join(f"between(n,{idx[s['src']]},{idx[s['src']] + s['n'] - 1})" for s in segs)
vf = (f"select='{expr}',setpts=N/(30*TB),"
      "scale=1404:2480:flags=lanczos,eq=contrast=1.08:saturation=1.05:brightness=0.01,"
      "unsharp=5:5:0.55:5:5:0.0,format=yuv420p")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-vf", vf, "-an", "-fps_mode", "passthrough", "-video_track_timescale", "30000",
                "-c:v", "libx264", "-preset", "medium", "-crf", "14", "-g", "15", out], check=True)
