# Componentes de motion

O que o `scripts/edicao/compor.py` sabe desenhar, com o exemplo de config de cada um. Os componentes vão em `graficos`, uma lista,
pela ordem que quiseres; cada um pode repetir-se. Tempos em segundos na linha temporal cortada (`trabalho/frases_cortadas.json`):
o componente entra com a palavra que o anuncia. Todos usam os tokens da marca (`tokens.accent`) e o vidro fosco do sistema de design.
Os SFX saem sozinhos de cada componente (coluna SFX) e o mapa de sons decide que som toca.

| Tipo | Para quê | Quando usar | SFX |
| --- | --- | --- | --- |
| `gancho` | Frase do gancho num painel de vidro, palavras a entrar com desfoque | 0 a 3 s de todos os vídeos | pop |
| `palavra` | Palavra-chave ou número grande, sem painel | Topo de funil, ênfase rápida (0,8 a 1,5 s) | pop |
| `lista` | Painel com título e itens que entram um a um | Passos, erros, vantagens (3 a 5 itens) | pop, tick por item |
| `numero` | Número a contar até ao valor, com legenda | Prova, resultado, estatística (só com dados confirmados) | pop, tick no fim |
| `notificacoes` | Cena de ecrã inteiro com título e notificações iOS | Mostrar um problema ou situação do dia a dia (mensagens, emails, chamadas) | whoosh, notif por item |
| `pesquisa` | Cena com browser: escreve a pesquisa, entram resultados, o cursor clica | "Vão pesquisar sobre ti", sites, ferramentas | whoosh, teclas, pop, clique |
| `mosaicos` | Grelha 2x2 de mosaicos com ícone sobre o vídeo | Listar canais, plataformas, categorias | tick por mosaico |
| `lower_third` | Pill com emblema, nome e handle | Primeira vez que o criador aparece ou se apresenta | pop |
| `remate` | Painel com frase e 1 a 3 palavras em Instrument Serif com brilho | A ideia principal, perto do fim | shimmer (ou riser) |
| `cta` | Notificação com contorno de acento que desce do topo até ao fim | Chamada para ação falada | notif |

Ícones disponíveis: `x`, `ok`, `mail`, `phone`, `chat`, `send`, `search`, `globe`, `funnel`, `user`, `camera`, `brief`, `play`, `chart`, `money`, `clock`, `star`, `heart`, `bolt`, `target`, `check`.
Destaque no texto: `*palavra*` fica na cor de acento com brilho (gancho, títulos, listas, remate).

## Exemplos

```json
{"tipo": "gancho", "ini": 0.0, "fim": 2.6, "texto": "Como fazer com que te *respondam*"}
{"tipo": "palavra", "ini": 5.1, "fim": 6.3, "texto": "*3x* mais respostas", "topo": 420}
{"tipo": "lista", "ini": 8.0, "fim": 13.5, "titulo": "O que *falta* no teu perfil", "itens": [
  {"t": 8.6, "texto": "Site com o que fazes"}, {"t": 10.2, "texto": "Provas de clientes", "icone": "star"}, {"t": 11.9, "texto": "Contacto fácil", "icone": "chat"}]}
{"tipo": "numero", "ini": 15.0, "fim": 18.0, "de": 0, "ate": 120, "sufixo": "+", "legenda": "clientes *novos*", "duracao_contagem": 1.2}
{"tipo": "notificacoes", "ini": 3.55, "fim": 9.27, "eyebrow": "O teu outreach hoje", "titulo": "Sem qualquer *resposta*", "itens": [
  {"t": 3.64, "icone": "mail", "app": "Email", "titulo": "Emails em bulk", "texto": "Sem resposta"},
  {"t": 6.16, "icone": "phone", "app": "Chamadas", "titulo": "Cold calls", "texto": "Sem reuniões"}]}
{"tipo": "pesquisa", "ini": 17.97, "fim": 24.57, "eyebrow": "O que encontram quando pesquisam", "titulo": "Vão *pesquisar* sobre nós",
 "pesquisa": "Layout", "escrever": 18.3,
 "resultados": [{"t": 20.13, "icone": "globe", "titulo": "Site", "desc": "No topo da página"}],
 "cursor": {"t": 21.0, "x0": 640, "y0": 720, "x1": 520, "y1": 330, "res": 0}}
{"tipo": "mosaicos", "ini": 24.57, "fim": 29.5, "itens": [{"t": 24.73, "icone": "user", "texto": "Personal brand"}, {"t": 26.87, "icone": "camera", "texto": "Instagram"}]}
{"tipo": "lower_third", "ini": 13.3, "fim": 15.3, "nome": "Alex", "handle": "@alexffb_", "emblema": "*"}
{"tipo": "remate", "ini": 40.78, "fim": 42.5, "a": "Tratar da tua", "b": "presença digital"}
{"tipo": "cta", "ini": 43.2, "app": "Mensagens", "titulo": "Manda-me mensagem", "texto": "ou escreve aqui em baixo nos comentários"}
```

Campos comuns: `ini`, `fim`, `topo` (px a partir de cima; por defeito 300, ou 320 e 430 nas cenas, 1400 no lower third) e `fundo`
(px onde o componente acaba; o enquadramento desce a cara para baixo dele; `false` para não contar). As cenas (`notificacoes`, `pesquisa`)
tapam o vídeo, usa-as no máximo 1 a 2 vezes por 30 s.

## Resto do config
```json
{
 "lingua": "pt-PT", "end_card": 2.0,
 "takes": [{"desde": 0, "base": 1.06, "cx": 0.55, "eye": 0.521, "fw": 0.206}, {"desde": 13.2, "base": 1.0, "cx": 0.55, "eye": 0.475, "fw": 0.241}],
 "legenda_topo": 1180,
 "legendas": {"estilo": "iman", "tamanho": 60, "max_palavras": 4, "max_caracteres": 22},
 "correcoes": [{"de": ["em", "Melsenburg,"], "para": ["emails", "em", "bulk"]}],
 "destaques": ["presença digital", "resposta"],
 "zoom_chave": [{"t": 0.0, "push": 2.6, "de": 1.0, "para": 1.07}, {"t": 33.07, "push": 9.4, "de": 1.0, "para": 1.1}],
 "tokens": {"accent": "#FF2E00"},
 "marca": {"nome": "alexffb"},
 "frame_final": {"botao": "Manda-me mensagem", "handle": "@alexffb_"},
 "sfx": {"extra": [[0.0, "boom", -2]], "trocar": {"40.78": "riser"}, "remover": []},
 "musica": {"ativa": true, "lufs": -23}
}
```
- **takes:** onde está a cara em cada troço (o `preparar` sugere-os a partir da deteção de cara). `base` é o zoom de base.
- **legendas.estilo:** `iman` (minúsculas brancas, light para bold à medida que fala), `destaque` (maiúsculas, palavra falada na cor de acento), `simples` (bold, sem animação por palavra).
- **destaques:** pares de palavras que não se separam entre linhas de legenda.
- **zoom_chave:** `push` lento de `de` para `para` (multiplicadores do zoom de base), ou corte seco com `mult` e `ate`.
- **sfx:** `extra` acrescenta eventos (`[t, tipo, ajuste_dB]`), `trocar` muda o tipo de um evento pelo tempo, `remover` tira por tipo ou tempo.
- **look:** cor do vídeo base e acabamento, por vídeo: `{"contraste": 1.08, "saturacao": 1.05, "brilho": 0.01, "gama": 1.0, "vinheta": "PI/7", "grao": 3}` (os valores por defeito). Cenas escuras pedem menos contraste e gama acima de 1 (por exemplo 1.03, 1.03, 0, 1.12, vinheta "PI/9"); mede a luminância da cara num fotograma antes e depois. O `preparar` aplica a cor ao gerar o `base.mp4`; o `exportar` aplica a vinheta e o grão.
- **frame_final:** logo de `assets/logo/` (ou o nome da marca, se não houver), botão e handle; `end_card: 0` tira-o.

## Criar um componente novo
Quando o estilo de referência pede algo que não existe (por exemplo um gráfico de barras, um antes e depois, uma citação):
1. Desenha-o dentro dos tokens e das seis decisões (`templates/sistema-design.md`): vidro, raios da escala, uma ideia de movimento.
2. Acrescenta um ramo `elif tipo == "..."` no `compor.py` (HTML, CSS por classe, animação com as funções `pop`, `words`, `out`, `scene`, e o SFX).
3. Testa num render curto, vê os fotogramas, e acrescenta a linha à tabela de cima com um exemplo.
4. Anima só propriedades (posição, escala, opacidade, `textContent` com `snap`), nunca com callbacks (ver `references/licoes-tecnicas.md`).
