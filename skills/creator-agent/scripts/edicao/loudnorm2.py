# loudnorm em dois passos (linear), para acertar o alvo de LUFS com precisão.
import json, re, subprocess, sys
src, out, I = sys.argv[1], sys.argv[2], float(sys.argv[3]); TP = sys.argv[4] if len(sys.argv) > 4 else "-1.0"; pre = sys.argv[5] + "," if len(sys.argv) > 5 else ""
r = subprocess.run(["ffmpeg", "-hide_banner", "-i", src, "-af", f"{pre}loudnorm=I={I}:TP={TP}:LRA=11:print_format=json", "-f", "null", "-"], capture_output=True, text=True)
m = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", r.stderr).group(0))
af = (f"{pre}loudnorm=I={I}:TP={TP}:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
      f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-af", af, "-c:a", "pcm_s24le", out], check=True)
print(f"{src}: {m['input_i']} LUFS -> {I}")
