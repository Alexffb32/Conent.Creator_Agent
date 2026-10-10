# Funções de áudio partilhadas: ler qualquer ficheiro com ffmpeg, sonoridade momentânea (LUFS-M, BS.1770) e envolvente.
import subprocess
import numpy as np
from scipy.signal import lfilter

SR = 48000


def ler(caminho, canais=2):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(caminho), "-ac", str(canais), "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    return x.reshape(-1, canais) if canais > 1 else x


def kpond(x):
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]; a1 = [1.0, -1.69065929318241, 0.73248077421585]
    b2 = [1.0, -2.0, 1.0]; a2 = [1.0, -1.99004745483398, 0.99007225036621]
    return lfilter(b2, a2, lfilter(b1, a1, x, axis=0), axis=0)


def lufs_m(x):
    """Sonoridade momentânea máxima (janelas de 400 ms) de um sinal estéreo (N, 2) ou mono."""
    if x.ndim == 1: x = np.stack([x, x], axis=1) / np.sqrt(2)
    pad = np.zeros((int(0.4 * SR), x.shape[1]))
    y = kpond(np.vstack([pad, x, pad])); w = int(0.4 * SR); h = int(0.01 * SR); best = -120.0
    for i in range(0, len(y) - w + 1, h):
        p = np.mean(y[i:i + w] ** 2, axis=0).sum()
        if p > 0: best = max(best, -0.691 + 10 * np.log10(p))
    return best


def envolvente_db(mono, passo=0.005):
    h = max(1, int(passo * SR))
    env = np.array([np.max(np.abs(mono[i:i + h])) for i in range(0, max(1, len(mono) - h), h)])
    return 20 * np.log10(env + 1e-9), passo
