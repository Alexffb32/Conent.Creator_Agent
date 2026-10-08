# Lições técnicas deste criador

(sintoma, causa, regra; as gerais estão em `skills/creator-agent/references/licoes-tecnicas.md`)

- **Vídeo chegou a 480x848.** O original veio pelo chat, comprimido. Regra: pedir ao Alex o ficheiro original da câmara (carregado em `gravados/` no GitHub) antes de editar.
- **Eco na voz.** Grava no sofá, numa sala com eco. Regra: tratamento de voz completo do pipeline (WPE e reverberação tardia, rt60 0,5); sugerir gravar perto de tecidos ou com microfone de lapela.
- **Termos mal transcritos.** O Whisper ouviu "Melsenburg" e "Malzambuco" em vez de "emails em bulk". Regra: `--vocabulario "emails em bulk, outreach, cold calls, DMs, ghost, Layout"` e rever as frases antes do plano.
