# Sistema de design: alexffb

Fonte: sistema enviado pelo Alex a 2026-10-07 (seis decisões). Aplica-se a todas as peças, estáticas e em movimento.
Preferência confirmada no feedback da v1: movimento leve, transições só em momentos-chave.

## Tokens preenchidos

| Token | Valor |
| --- | --- |
| Personalidade | ambicioso, direto, educativo, premium |
| Acento principal | #FF2E00 (asterisco do logo) |
| Acento, satin do CTA | topo #FF481F (+6 % de luminosidade), base #E02900 (−6 %) |
| Acento a 10 % (chips) | #1A0500 (10 % de acento sobre #000000) |
| Ink / texto | #FFFFFF |
| Fundo | #000000 |
| Superfície | #222222 |
| Texto secundário | #B3B3B3 |
| Linha | #4F4F4F |
| Display e corpo | Inter (Display Bold 800, corpo 500 a 600) |
| Legendas | Montserrat Light 300 e Bold 700, minúsculas, brancas, 60 px (estilo Iman; exceção à maiúscula inicial pedida pelo Alex) |
| Fonte de destaque | Instrument Serif Italic, no máximo 1 a 3 palavras por peça |
| Motivo | linha fina no acento (divisor e barra de progresso) e o asterisco do logo |
| Formatos | 1080x1920 a 30 fps (Reels, Shorts) |
| Espaçamento | 4, 8, 12, 16, 24, 32, 48, 64, 96, 128 (a 1080 px de lado curto) |
| Raios | 8 badges, 16 cartões, 24 painéis, pill = altura ÷ 2 |
| Sombra | md 0 8 24 a 14 %, sempre para baixo; borda superior de 1 px a branco 50 % |
| Movimento | fast 100 ms, base 200 ms, slow 300 ms, cubic-bezier(.2,.8,.2,1); transições de cena 300 a 500 ms |
| Margens | ≥ 6 % do lado curto (72 px); 9:16 sem conteúdo nos 12 % de cima nem nos 20 % de baixo |
| Texto mínimo | 32 px (3 % de 1080) |

## As seis decisões (resumo para aplicar)

1. **Tamanho e espaço:** texto ≥ 32 px, margens ≥ 6 %, CTA ≥ 48 px de altura, um ponto focal, leitura clara em 3 s.
2. **Tipo e texto:** frase em maiúscula inicial, títulos ≥ 3× o corpo, tracking −1 a −2 % em tamanhos grandes, máximo 2 fontes + 1 de destaque (1 a 3 palavras). CTA é verbo + objeto. Títulos dizem o que o espectador ganha. Cada texto fica no ecrã ≥ 0.3 s por palavra (mínimo 1.5 s).
3. **Contraste:** texto ≥ 4.5:1 (grande ≥ 3:1), ícones e contornos ≥ 3:1, texto sobre vídeo com scrim, painel ou contorno. A cor nunca é o único sinal.
4. **Profundidade:** no máximo 3 camadas (vídeo, superfície, elemento elevado). Luz de cima, sombra para baixo. Um só destaque com rim por peça (o CTA).
5. **Detalhe e forma:** raios só da escala, botões e chips em pill, um conjunto de ícones com traço de 2 px, um ícone por elemento, 8 a 10 px entre o ícone e o rótulo. Logo com área de proteção igual à altura da letra principal, sem esticar.
6. **Movimento e ritmo:** uma ideia de movimento por cena, gancho em 1 a 3 s, CTA final ≥ 2 s. Revelar com fade e subida de 8 px em 300 ms, 60 ms de intervalo, uma vez só. Sem parallax nem tremer. Movimentos de ênfase só no elemento-chave. Dar sempre uma versão estática.

## QA final
[ ] Só tokens  [ ] Texto ≥ mínimo, margens e zonas seguras  [ ] Contraste 4.5 / 3  [ ] Um acento por componente, um destaque por peça
[ ] CTAs verbo + objeto  [ ] Um ponto focal, leitura em 3 s  [ ] Formatos verificados  [ ] Movimento: gancho, tempos, CTA final, versão estática
[ ] Funciona em tons de cinzento  [ ] Contacto legível
