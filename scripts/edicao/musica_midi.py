# Compõe a música de fundo (MIDI) e renderiza com FluidSynth + FluidR3_GM: piano em arpejo, cordas, pad e violoncelo.
# 80 BPM, Am F C G (vi IV I V), entra leve, cresce no remate e resolve no frame final.
import sys, subprocess, mido
out_mid, out_wav, dur_s = sys.argv[1], sys.argv[2], float(sys.argv[3])
TPB, BPM = 480, 80
beat_s = 60 / BPM; bar_s = 4 * beat_s
nbars = int(dur_s // bar_s) + 1
mid = mido.MidiFile(ticks_per_beat=TPB)
def track(ch, program, name):
    t = mido.MidiTrack(); mid.tracks.append(t)
    t.append(mido.MetaMessage("track_name", name=name, time=0))
    t.append(mido.Message("program_change", channel=ch, program=program, time=0))
    return t
events = {ch: [] for ch in range(5)}
def note(ch, n, start_beats, len_beats, vel):
    events[ch].append((int(start_beats * TPB), "on", n, vel)); events[ch].append((int((start_beats + len_beats) * TPB), "off", n, 0))
def cc(ch, start_beats, ctrl, val): events[ch].append((int(start_beats * TPB), "cc", ctrl, val))
ARP = {"Am": [57, 64, 69, 72, 76, 72, 69, 64], "F": [53, 60, 65, 69, 72, 69, 65, 60], "C": [55, 60, 64, 67, 72, 67, 64, 60], "G": [55, 59, 62, 67, 71, 67, 62, 59]}
STR = {"Am": [57, 60, 64], "F": [53, 57, 60], "C": [55, 60, 64], "G": [55, 59, 62]}
ROOT = {"Am": 45, "F": 41, "C": 48, "G": 43}
MEL = {"Am": (76, 72), "F": (72, 69), "C": (76, 79), "G": (74, 71)}
prog = ["Am", "F", "C", "G"]
for b in range(nbars):
    ch_name = prog[b % 4] if b < nbars - 1 else "Am"
    t0 = b * 4
    last = b == nbars - 1
    lift = 12 <= b < nbars - 1      # secção final (≈ 36 s): sobe um pouco
    # piano: baixo na mão esquerda + arpejo em colcheias
    pv = 44 + (8 if lift else 0)
    note(0, ROOT[ch_name] - 12 + 12, t0, 3.8, pv + 4)
    if not last:
        for k, n in enumerate(ARP[ch_name]):
            note(0, n, t0 + k * 0.5, 0.9, pv - (6 if k % 2 else 0))
    else:
        for n in (57, 64, 69, 72, 76): note(0, n, t0, 4, 40)
    # pad quente desde o início, muito baixo
    for n in STR[ch_name]: note(1, n, t0, 4, 34)
    # cordas a partir do compasso 5
    if b >= 4:
        for n in STR[ch_name]: note(2, n + 12, t0, 4, 40 + (12 if lift else 0))
    # violoncelo a partir do compasso 5
    if b >= 4: note(3, ROOT[ch_name], t0, 4, 46 + (8 if lift else 0))
    # melodia simples na secção final
    if lift:
        m1, m2 = MEL[ch_name]; note(4, m1, t0, 1.9, 50); note(4, m2, t0 + 2, 1.9, 46)
# volume por canal (CC7) e expressão
for ch, v in ((0, 92), (1, 70), (2, 78), (3, 72), (4, 80)): cc(ch, 0, 7, v)
programs = {0: (0, "Piano"), 1: (89, "Pad"), 2: (48, "Cordas"), 3: (42, "Violoncelo"), 4: (0, "Melodia")}
tempo_track = mido.MidiTrack(); mid.tracks.append(tempo_track)
tempo_track.append(mido.MetaMessage("set_tempo", tempo=int(60_000_000 / BPM), time=0))
for ch, evs in events.items():
    t = track(ch, *programs[ch])
    now = 0
    for tick, kind, a, b in sorted(evs, key=lambda e: (e[0], 0 if e[1] == "off" else 1)):
        dt = tick - now; now = tick
        if kind == "on": t.append(mido.Message("note_on", channel=ch, note=a, velocity=b, time=dt))
        elif kind == "off": t.append(mido.Message("note_off", channel=ch, note=a, velocity=0, time=dt))
        else: t.append(mido.Message("control_change", channel=ch, control=a, value=b, time=dt))
mid.save(out_mid)
subprocess.run(["fluidsynth", "-ni", "-q", "-F", out_wav, "-r", "48000", "-g", "0.6",
                "-o", "synth.reverb.active=1", "-o", "synth.reverb.room-size=0.75", "-o", "synth.reverb.level=0.6",
                "-o", "synth.reverb.width=0.8", "-o", "synth.chorus.active=0",
                "/usr/share/sounds/sf2/FluidR3_GM.sf2", out_mid], check=True)
print("música:", out_wav, nbars, "compassos")
