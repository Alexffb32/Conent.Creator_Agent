# Corta a voz pelos mesmos segmentos do vídeo (micro fades de 10 ms), junta o silêncio do frame final e trata a voz.
import json, subprocess, sys
src, segs, end_card, out = sys.argv[1], json.load(open(sys.argv[2]))["segments"], float(sys.argv[3]), sys.argv[4]
parts, labels = [], []
for i, s in enumerate(segs):
    a, d = s["src"], s["dur"]
    parts.append(f"[0:a]atrim=start={a}:duration={d},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st={max(0, d - 0.01):.4f}:d=0.01[a{i}]")
    labels.append(f"[a{i}]")
total = sum(s["dur"] for s in segs) + end_card
fc = ";".join(parts) + ";" + "".join(labels) + f"concat=n={len(segs)}:v=0:a=1,aresample=48000,pan=mono|c0=0.5*c0+0.5*c1," \
     f"highpass=f=80,afftdn=nr=8:nf=-50,acompressor=threshold=-22dB:ratio=3:attack=8:release=120:makeup=2," \
     f"apad=whole_dur={total:.3f}[v]"
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-filter_complex", fc, "-map", "[v]", "-c:a", "pcm_s24le", out], check=True)
print("voz", round(total, 3), "s")
