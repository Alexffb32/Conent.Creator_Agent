# Deteta a cara (centro e tamanho) a meio de cada segmento mantido, em coordenadas normalizadas.
import cv2, json, sys
src, cortes = sys.argv[1], json.load(open(sys.argv[2]))
cap = cv2.VideoCapture(src)
casc = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
res = []
for a, b in cortes["keep"]:
    found = []
    for f in (0.25, 0.5, 0.75):
        cap.set(cv2.CAP_PROP_POS_MSEC, (a + (b - a) * f) * 1000)
        ok, img = cap.read()
        if not ok: continue
        H, W = img.shape[:2]
        g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        fs = casc.detectMultiScale(g, 1.1, 5, minSize=(40, 40))
        if len(fs):
            x, y, w, h = max(fs, key=lambda r: r[2] * r[3])
            found.append(((x + w / 2) / W, (y + h * 0.42) / H, w / W))   # olhos ~42% da caixa
    if found:
        n = len(found); res.append({"a": a, "b": b, "cx": sum(f[0] for f in found) / n, "eye_y": sum(f[1] for f in found) / n, "fw": sum(f[2] for f in found) / n})
    else: res.append({"a": a, "b": b, "cx": None, "eye_y": None, "fw": None})
    print(f"{a:6.2f}-{b:6.2f} " + (f"cx={res[-1]['cx']:.3f} olhos={res[-1]['eye_y']:.3f} cara={res[-1]['fw']:.3f}" if found else "sem cara"))
json.dump(res, open(sys.argv[3], "w"), indent=1)
print(W, H)
