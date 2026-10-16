# Corta a voz original pelos segmentos do vídeo (micro fades de 10 ms), sem tratamento, mono 48 kHz, com o silêncio do frame final.
import json, subprocess, sys
src, segs, end_card, out = sys.argv[1], json.load(open(sys.argv[2]))["segments"], float(sys.argv[3]), sys.argv[4]
parts, labels = [], []
for i, s in enumerate(segs):
    a, d = s["src"], s["dur"]
    parts.append(f"[0:a]atrim=start={a}:duration={d},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st={max(0, d - 0.01):.4f}:d=0.01[a{i}]")
    labels.append(f"[a{i}]")
total = sum(s["dur"] for s in segs) + end_card
fc = ";".join(parts) + ";" + "".join(labels) + f"concat=n={len(segs)}:v=0:a=1,aresample=48000,pan=mono|c0=0.5*c0+0.5*c1,apad=whole_dur={total:.3f}[v]"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-filter_complex", fc, "-map", "[v]", "-c:a", "pcm_f32le", out], check=True)
