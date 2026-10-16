# Remove eco/reverberação da voz com WPE (Weighted Prediction Error, nara_wpe) e uma redução de ruído leve.
import sys, numpy as np, soundfile as sf
from nara_wpe.wpe import wpe
from nara_wpe.utils import stft, istft
import noisereduce as nr
x, sr = sf.read(sys.argv[1], dtype="float32")
taps, delay, it = int(sys.argv[3]) if len(sys.argv) > 3 else 12, 3, 4
size, shift = 1024, 256
Y = stft(x[None, :], size=size, shift=shift).transpose(2, 0, 1)   # (F, D, T)
Z = wpe(Y, taps=taps, delay=delay, iterations=it, statistics_mode="full").transpose(1, 2, 0)
y = istft(Z, size=size, shift=shift)[0][: len(x)]
y = nr.reduce_noise(y=y, sr=sr, stationary=True, prop_decrease=0.6, n_fft=2048)
peak = np.max(np.abs(y)); y = y / max(peak, 1e-6) * 0.89
sf.write(sys.argv[2], y.astype(np.float32), sr, subtype="FLOAT")
print("ok", sr, len(y) / sr)
