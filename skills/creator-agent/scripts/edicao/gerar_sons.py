# Cria o kit de sons por código (para quem ainda não tem sons próprios) e o mapa.json que o pipeline usa.
# Uso: python3 gerar_sons.py <pasta_destino>      (normalmente <criador>/assets/sons)
import json, sys, wave
from pathlib import Path
import numpy as np
import sfx
from audio_util import lufs_m

ALVO = {"pop": -37, "whoosh": -35, "notif": -35, "click": -45, "tick": -43, "shimmer": -36, "riser": -36, "boom": -38, "type": -52}
dest = Path(sys.argv[1]); dest.mkdir(parents=True, exist_ok=True)


def gravar(nome, mono):
    x = np.clip(np.stack([mono, mono], axis=1) * 0.7, -1, 1)
    with wave.open(str(dest / nome), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(sfx.SR); w.writeframes((x * 32767).astype(np.int16).tobytes())


mapa = {}
for tipo in ("pop", "whoosh", "notif", "click", "tick", "shimmer", "riser", "boom"):
    s, pre = sfx.sintetizar(tipo)
    lead = 0.01; s = np.concatenate([np.zeros(int(lead * sfx.SR)), s])
    nome = f"kit_{tipo}.wav"; gravar(nome, s)
    mapa[tipo] = {"ficheiro": nome, "de": 0.0, "ate": round(len(s) / sfx.SR, 3), "impacto": round(lead + pre, 3), "lufs": ALVO[tipo],
                  "fade": 0.05, **({"pan": sfx.PANS[tipo]} if tipo in sfx.PANS else {})}
# teclas: 6 toques num só ficheiro
teclas = [0.1, 0.3, 0.5, 0.7, 0.9, 1.1]; buf = np.zeros(int(1.3 * sfx.SR))
for t in teclas:
    k = sfx.type_(); i = int(t * sfx.SR); buf[i:i + len(k)] += k / (np.max(np.abs(k)) + 1e-9)
gravar("kit_teclas.wav", buf)
mapa["type"] = {"ficheiro": "kit_teclas.wav", "teclas": teclas, "dur": 0.08, "pre": 0.004, "lufs": ALVO["type"], "pan": 0.55}
json.dump(mapa, open(dest / "mapa.json", "w"), ensure_ascii=False, indent=1)
print(f"Kit de {len(mapa)} sons em {dest} e mapa.json (sonoridade alvo por tipo: {ALVO})")
