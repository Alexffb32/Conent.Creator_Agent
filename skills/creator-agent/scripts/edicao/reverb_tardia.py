# Suprime a reverberação tardia (método de Lebart: a cauda é estimada como o espectro de há D ms, atenuado pelo RT60).
# Uso: reverb_tardia.py entrada.wav saida.wav [rt60_s] [sobre_subtracao] [ganho_min]
import sys, numpy as np, soundfile as sf
from scipy.signal import stft, istft
x, sr = sf.read(sys.argv[1], dtype="float64")
rt60 = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
beta = float(sys.argv[4]) if len(sys.argv) > 4 else 1.2
gmin = float(sys.argv[5]) if len(sys.argv) > 5 else 0.2
nfft, hop = 1024, 256
f, t, Y = stft(x, sr, nperseg=nfft, noverlap=nfft - hop)
P = np.abs(Y) ** 2
# suaviza no tempo a potência observada
Ps = P.copy()
for k in range(1, P.shape[1]): Ps[:, k] = 0.7 * Ps[:, k - 1] + 0.3 * P[:, k]
D = int(round(0.05 * sr / hop))
lam = 3 * np.log(10) / rt60
att = np.exp(-2 * lam * 0.05)
Pl = np.zeros_like(Ps); Pl[:, D:] = att * Ps[:, :-D]
G = np.maximum(1 - beta * Pl / np.maximum(P, 1e-12), gmin ** 2)
G = np.sqrt(G)
# suaviza o ganho para evitar ruído musical
for k in range(1, G.shape[1]): G[:, k] = 0.5 * G[:, k - 1] + 0.5 * G[:, k]
_, y = istft(Y * G, sr, nperseg=nfft, noverlap=nfft - hop)
y = y[: len(x)]; y = y / max(np.max(np.abs(y)), 1e-9) * 0.89
sf.write(sys.argv[2], y.astype(np.float32), sr, subtype="FLOAT")
