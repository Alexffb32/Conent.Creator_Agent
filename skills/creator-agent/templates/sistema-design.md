# Sistema de design: {nome}

Os tokens visuais da marca, usados em todos os vídeos (o `pipeline.py` lê o acento daqui ou do `creator.md`).
Um só acento; o resto deriva dele. Valores em hex. Revisto quando o criador muda a marca.

## Tokens
| Token | Valor | Notas |
| --- | --- | --- |
| Acento (único) | #RRGGBB | a cor da marca; o compositor deriva a versão clara, a escura e o gradiente |
| Fundo | #000000 | cenas de ecrã inteiro |
| Ink (texto) | #FFFFFF | |
| Secundário | #B3B3B3 | texto de apoio |
| Display e corpo | Montserrat (800 títulos, 500 a 700 corpo) | |
| Destaque | Instrument Serif Italic, 1 a 3 palavras por peça | |
| Legendas | estilo `iman`, `destaque` ou `simples`, 60 px | |
| Vidro | blur 18 px, saturação 160 %, borda branca 14 % (42 % em cima); sobre vídeo, fundo escuro a 80 a 86 % | |
| Raios | 8 badges, 16 cartões, 24 a 36 painéis, pill = altura ÷ 2 | |
| Movimento | mola 94 % para 100 % (back.out 1.25), 450 ms, desfoque 10 px para 0; palavras com 60 ms de intervalo | |
| Margens | 72 px dos lados; nada nos 12 % de cima nem nos 20 % de baixo | |
| Logo | assets/logo/logo.png (e logo_borda.png para usar sobre vídeo) | |

## As seis decisões (aplicar a todas as peças)
1. **Tamanho e espaço:** texto de 32 px ou mais, margens de 6 % ou mais, um ponto focal, leitura clara em 3 s.
2. **Tipo e texto:** títulos 3 vezes maiores do que o corpo, no máximo 2 fontes e 1 de destaque (1 a 3 palavras), CTA com verbo e objeto, cada texto no ecrã pelo menos 0,3 s por palavra (mínimo 1,5 s).
3. **Contraste:** texto 4,5:1 (grande 3:1), sobre vídeo sempre com gradiente, painel ou contorno; a cor nunca é o único sinal.
4. **Profundidade:** no máximo 3 camadas (vídeo, superfície, elemento elevado), luz de cima e sombra para baixo, um só destaque com brilho por peça.
5. **Detalhe e forma:** raios só da escala, botões e chips em pill, um conjunto de ícones com traço de 2 px.
6. **Movimento e ritmo:** uma ideia de movimento por cena, gancho em 1 a 3 s, CTA final de 2 s ou mais, sem tremer nem parallax; dar sempre uma versão estática (capa).
