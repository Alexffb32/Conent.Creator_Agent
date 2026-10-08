# Prompts

Pedidos prontos para os momentos em que o agente tem de pensar bem antes de agir. Os de "para o criador" são frases que o criador pode escrever
para pôr o agente a trabalhar; os de "para o agente" são o checklist mental do próprio agente.

## Para o criador (escrever no Claude Code)
- **Começar:** "Usa o creator-agent. Sou [nome], faço conteúdo sobre [tema] para [quem]. Quero [objetivo]."
- **Próximo vídeo:** "O que devo publicar a seguir? Dá-me 3 ideias para a fase certa do funil."
- **Editar:** "Gravei o vídeo [pasta ou link]. Edita no meu estilo e manda-me no chat."
- **Ajustar:** "Na v2: [o que mudar]. Guarda isto no meu estilo para os próximos."
- **Estilo de alguém:** "Analisa o estilo de edição de [criador] e diz-me o que dá para usar no meu."
- **Sons:** "Aqui estão os meus sons [pasta ou zip]. Usa-os nos efeitos das animações, de forma leve."
- **Rever resultados:** "Estes são os números do último vídeo [captura ou CSV]. O que aprendemos?"

## Para o agente

### Antes de planear uma edição
"Qual é a fase do funil e o objetivo deste vídeo? O que diz o `estilo-edicao.md` do criador (regras confirmadas e 'não voltar a fazer')?
Que lições técnicas se aplicam? Que componentes da biblioteca contam a história deste guião, um por ideia? Onde está o gancho visual nos primeiros 3 s?
O CTA tem 2 s ou mais? Há algum texto no ecrã que fuja aos limites do criador (travessões, palavrões, dados não confirmados)?"

### Ao interpretar feedback
"O que o criador pediu exatamente? É uma preferência que vale para todos os vídeos, um erro técnico meu, ou um gosto só deste vídeo?
Que regra escrevo no `estilo-edicao.md`, com a versão e a data? Há algo no pedido que contradiz uma regra anterior? Se sim, a nova ganha e a antiga vai para 'não voltar a fazer'."

### Ao pesquisar um estilo
"Que vídeos recentes posso analisar com ficheiro? Que páginas abri de facto? O que medi, o que li e o que deduzi?
Como se traduz cada observação em componentes e parâmetros do `compor.py`? O que falta criar?"

### Ao criar um componente novo
"Que ideia do guião precisa disto e porque nenhum componente existente serve? Cabe nos tokens e nas seis decisões?
Qual é a única ideia de movimento? Que SFX dispara? Testei um render curto e vi os fotogramas?"

### Antes de entregar
"Sobreposições de legendas: 0? A cara nunca fica tapada? O texto está dentro da zona segura e legível em 3 s?
A mistura está a -14 LUFS e os SFX à distância certa da voz? A versão está numa pasta nova, num commit só seu com 'vN - o que mudou'?
Enviei o vídeo no chat (cópia abaixo do limite)?"
