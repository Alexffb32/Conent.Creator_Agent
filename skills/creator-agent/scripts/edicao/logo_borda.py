# Converte o logo (fundo branco opaco) em PNG transparente com borda branca suave.
import sys, numpy as np
from PIL import Image, ImageFilter
src, dst, raio = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 10
im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32) / 255
a = 1 - im.min(axis=2)                       # tinta: preto e vermelho = 1, branco = 0
safe = np.maximum(a, 1e-6)[..., None]
rgb = np.clip((im - (1 - a[..., None])) / safe, 0, 1)   # tira a mistura com o branco
pad = raio * 3
A = np.pad(a, pad); RGB = np.pad(rgb, ((pad, pad), (pad, pad), (0, 0)))
mask = Image.fromarray((A * 255).astype(np.uint8))
borda = mask.filter(ImageFilter.MaxFilter(raio * 2 + 1)).filter(ImageFilter.GaussianBlur(raio * 0.25))
B = np.asarray(borda).astype(np.float32) / 255
out_a = A + B * (1 - A)
out_rgb = (RGB * A[..., None] + 1.0 * B[..., None] * (1 - A[..., None])) / np.maximum(out_a, 1e-6)[..., None]
out = np.dstack([out_rgb, out_a])
img = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "RGBA")
img = img.crop(img.getbbox())
img.save(dst)
print(dst, img.size)
