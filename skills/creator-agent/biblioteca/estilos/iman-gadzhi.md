# Estilo: Iman Gadzhi (shorts e reels)

Última verificação: 2026-10-08 | Confiança: média | Vídeos analisados diretamente: 0 (Instagram e as páginas dos guias estavam bloqueados na rede da sessão)
Base: guias de ferramentas de legendas (listados em Fontes, não abertos), pesquisa de 2026-10-07 e o que um criador aprovou numa edição feita neste estilo (v3 a v5 do short "presença digital").

## Ritmo
- Cortes secos nas pausas (pausas acima de 0,25 s fora), ritmo rápido mas sem saltos visuais a cada corte. *Hipótese, a medir com `analisar_referencia.py`.*
- Duração típica de shorts educativos: 30 a 60 s.

## Gancho (0 a 3 s)
- Frase forte falada e escrita; zoom de entrada lento. *Aprovado na edição de referência.*

## Legendas
- Minúsculas, só brancas, sem palavras a cor; a linha passa de light para bold à medida que cada palavra é dita. *Segundo os guias da Submagic e da SendShort (resultados de pesquisa).*
- Fonte: Montserrat é a mais citada (light e bold), mas a fonte da SendShort contradiz-se. *Confiança média: confirmar com identificação de fonte num fotograma.*
- Linhas curtas (2 a 4 palavras), centradas no terço de baixo, com sombra suave. *Aprovado na edição de referência.*

## Motion
- Componentes de interface ao estilo Apple em vidro fosco escuro: notificações iOS, browser com pesquisa e cursor, mosaicos com ícones, lower third em pill. *Aprovado na edição de referência (pedido explícito "quase idêntico").*
- Entradas em mola com desfoque, palavras a entrar uma a uma com 60 ms de intervalo, saídas curtas. Movimento leve: só nos momentos-chave.
- Cenas de ecrã inteiro escuras com grelha e brilho da cor de acento, poucas por vídeo.

## Câmara
- Zooms lentos (push-in de 100% a 110%) em 2 a 4 momentos-chave; nada de zoom em cada corte.

## Cor e look
- Contraste ligeiramente acima, saturação contida, grão leve e vinheta suave; paleta escura com um só acento.

## Som
- Música cinematográfica ou piano muito baixa por baixo da voz; SFX discretos (pop, whoosh, notificação, teclas, clique) em cada animação.

## CTA e fim
- CTA falado com um elemento visual (notificação ou botão); frame final com logo, botão e handle.

## Tradução para o compor.py
- `legendas.estilo: "iman"`, tamanho 60, até 4 palavras e 22 caracteres por linha.
- Componentes: `gancho`, `notificacoes`, `pesquisa`, `mosaicos`, `lower_third`, `remate`, `cta`; 1 a 2 cenas por 30 s.
- `zoom_chave`: entrada no gancho e 2 a 4 pushes lentos.
- SFX leves (15 a 27 dB abaixo da voz), música a -23 LUFS com ducking.

## Fontes
- Submagic, "How to make captions like Iman Gadzhi": https://submagic.co/blog/how-to-make-captions-like-iman-gadzhi (resultado de pesquisa; página bloqueada na sessão, não aberta)
- SendShort, "Create Iman Gadzhi-style videos": https://sendshort.ai/guides/iman-gadzhi-style/ (resultado de pesquisa; não aberta)
- SendShort, "Captions like Iman Gadzhi": https://sendshort.ai/uncategorized/how-to-make-captions-like-iman-gadzhi/ (resultado de pesquisa; não aberta)
- Edição de referência aprovada pelo criador: short "presença digital", versões v3 a v5 (2026-10-08).

Para subir a confiança: analisar 3 a 5 shorts recentes com `analisar_referencia.py` e atualizar as secções marcadas como hipótese.
