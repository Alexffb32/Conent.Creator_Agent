# Transcreve com faster-whisper (tempos por palavra). Uso: python3 transcrever.py <video> <saida.json> [modelo]
import json, sys, subprocess, numpy as np
from faster_whisper import WhisperModel
src, out_path = sys.argv[1], sys.argv[2]
size = sys.argv[3] if len(sys.argv) > 3 else "small"
raw = subprocess.run(["ffmpeg","-v","error","-i",src,"-ac","1","-ar","16000","-f","s16le","-"],capture_output=True,check=True).stdout
audio = np.frombuffer(raw, np.int16).astype(np.float32)/32768.0
m = WhisperModel(size, device="cpu", compute_type="int8")
segs, info = m.transcribe(audio, language="pt", word_timestamps=True, vad_filter=False, beam_size=5,
    initial_prompt="Alex, alexffb, Covilhã. Português europeu.")
out=[]
for s in segs:
    out.append({"start":round(s.start,3),"end":round(s.end,3),"text":s.text.strip(),
        "words":[{"w":w.word.strip(),"s":round(w.start,3),"e":round(w.end,3),"p":round(w.probability,3)} for w in s.words]})
    print(f"[{s.start:6.2f}-{s.end:6.2f}] {s.text}", flush=True)
json.dump(out, open(out_path,"w"), ensure_ascii=False, indent=1)
