# Pesquisa: estilo de criação e edição de Iman Gadzhi (parcial)

Data de acesso de tudo o que se segue: 2026-10-09.
Método: WebFetch falhou por DNS, por isso abri as páginas com curl pelo proxy do ambiente. As cópias em bruto estão em `pesquisa/raw/` no scratchpad.

## 0. Limites desta pesquisa (ler primeiro)

- A parte (2), a edição (cortes, zooms, legendas, música, SFX, cores, tipografia), NÃO está medida. O yt-dlp foi bloqueado pelo YouTube ("Sign in to confirm you're not a bot"). Não contornei (sem cookies). Não houve vídeo para correr em `analisar_referencia.py`.
- Não abri nenhum guião, transcrição ou thumbnail de Iman. Só li texto de páginas.
- Páginas NÃO abertas ou inúteis:
  - https://en.wikipedia.org/wiki/Iman_Gadzhi: 404.
  - https://vidiq.com/youtube-stats/channel/UCQ4FNww3XoNgqIlkBqEAVCg: 429, não aberta.
  - https://www.instagram.com/imangadzhi/: 429, não aberta.
  - https://gilhildebrand.notion.site/How-did-Iman-Gadzhi-get-4M-YT-subscribers-8ca810ecef064f2692c576ff02f30e1d: abre (200) mas só devolve o esqueleto JS, sem conteúdo legível. Não usada.
  - sozai.app, sendshort.ai, dannymiranda.substack.com, creatordb.app: só tentados por WebFetch (DNS falhou). Não tentados por curl, logo NÃO abertos. Só apareceram em snippets de pesquisa.
- O texto de títulos de vídeos veio da API oEmbed do YouTube (https://www.youtube.com/oembed). Foi lida para 18 vídeos.

## 1. MEDIDO / VISTO em fonte primária

### 1.1 Canal YouTube (páginas do próprio canal, 2026-10-09)
Fontes: https://www.youtube.com/@ImanGadzhi/about e https://www.youtube.com/@ImanGadzhi/videos

- 6,2 M de subscritores, 203 663 660 visualizações totais, 483 vídeos, canal criado a 26 dez 2015. (O cabeçalho mostra "448K subscribers" num campo; o valor do separador "about" é 6,2 M.)
- Descrição do canal (resumo): começou em 2015 antes de ter sucesso; mostra a fase de personal trainer, abandono do liceu, construção de uma agência de publicidade online e a alegação de ter feito mais de 100 M de dólares aos 26 anos; diz "não escondo nada". (Isto é alegação dele, não verificada.)
- Durações dos 30 vídeos mais recentes no separador Vídeos (valores lidos da página): 27:42, 13:39, 26:27, 36:31, 17:21, 12:48, 13:16, 16:04, 8:48, 11:56, 44:56, 15:18, 22:10, 36:21, 1:06:40, 12:31, 3:21:10, 20:29, 35:48, 13:32, 54:07, 23:34, 26:12, 13:21, 26:06, 19:12, 39:21, 17:21, 18:16. Mediana de cerca de 20 minutos. Os vídeos recentes são, portanto, longos (8 min a mais de 3 h).
- Títulos recentes (oEmbed, texto exato):
  - "You're Not Late (Yet): Learn 98% of Gemini in Under 26 Minutes"
  - "Give Me 28 Minutes, I'll Give You 10,000 Hours of ChatGPT Knowledge"
  - "The Best AI Side Hustles To Start In 2026 (No Skills)"
  - "Give Me 26 minutes, I'll Give You 10,000 hours of Claude Knowledge"
  - "5 Proven Ways To Make Money With AI (No Experience)"
  - "If I Was Broke In My 20s, Here's What I'd Do"
  - "Give me 12 minutes, I'll open your eyes to how to actually become rich using AI"
  - "Move Out of Your Hometown (If You Want To Win At Life)"
  - "Give me 16 minutes and I'll brainwash you into thinking like a Millionaire"
  - "How Using "Dark Motivation" Made Me Rich"
  - "What to do when you feel like doing NOTHING"
  - "Best Online Business to Make $10k+/month In 2026 (Beginner Friendly)"
  - "How To Become Unrecognizably Successful in 2026"
  - "7 Books I Wish I Had Read Earlier"
  - "Day In The Life of A Future Billionaire"
  - "I Recorded My Entire Life Since I Was Broke"
  - "Disappear And Come Back Unrecognizable In 3 Months"
  - "Laziest One-Person Business Model To Start in 2026 ($100/day+)"
- O separador Shorts devolveu os mesmos IDs do separador Vídeos, por isso não consegui isolar Shorts nem medir duração deles.

### 1.2 TikTok (página pública, curl, campos embutidos na página)
Fonte: https://www.tiktok.com/@imangadzhi
- followerCount 559 900; heartCount 25 400 000; videoCount 715. Não li vídeos individuais.

## 2. OPINIÃO / DADOS de terceiros (abertos por curl; valem o que vale o autor)

- OutlierKit, análise gerada por IA com dados públicos, https://outlierkit.com/channel/imangadzhi:
  - 6,0 M subs, 180,8 M views, 478 vídeos, média de 378,2 K views por vídeo. Os números diferem do YouTube (data de recolha anterior).
  - Top de sempre (título e views): "7 Principles For Teenagers To Become Millionaires" 7,8 M; "Dopamine Detox is a Cheat Code to Success" 7,0 M; "HOW Teenagers Can Make $1 Million (7 Money Tips)" 5,6 M; "Best 5 Side Hustles To Make $550/day" 4,5 M; "How to take back CONTROL over YOUR LIFE | Monk Mode" 3,7 M; "I let Hasbulla drive my Porsche GT3..." 3,2 M.
  - A ferramenta diz que a fórmula recente é: ângulo "lazy/beginner", tema de IA ou dinheiro online, resultado em dinheiro por dia, "sem experiência", ano futuro (2026), vídeo de 12 a 25 minutos a falar para a câmara. Conteúdo "85% evergreen". É inferência automática de IA, não uma medição.
- Growthscribe, https://growthscribe.com/iman-gadzhi-net-worth/ (site de net worth, qualidade média):
  - Primeira empresa: agência de redes sociais IAG Media, depois AgenciFlow, com retainers para fitness e negócios locais.
  - Cursos Agency Navigator e Educate.io. Em abril de 2025 foi anunciado como co-owner e parceiro estratégico da Whop. Diz que não há valores confirmados de fortuna ou receita de cursos.
  - Comenta que o YouTube funciona sobretudo como canal de aquisição para ofertas pagas (opinião do site).
- Everything PR, https://everything-pr.com/iman-gadzhi-the-smma-creator-who-built-a-digital-education-empire: aberto (200, 10 K caracteres), mas parece conteúdo de PR/SEO. Não o usei para factos.
- George Blackman (Substack, retenção), https://georgeblackman.substack.com/p/rr8-study-this-hook-edit:
  - Não analisa vídeos de Iman. Analisa o vídeo de OUTRO criador sobre Iman ("The Truth About Iman Gadzhi's Digital Renaissance", retenção média 20,8%).
  - Usa-se só como lição geral: pattern interrupt por mudar de sala e ângulo; texto que pára o ritmo (ecrã preto com texto aos 0:17); o gancho deve falar directamente ao espectador. Não é evidência sobre o estilo de Iman.

## 3. DEDUZIDO por mim (hipóteses; confirmar vendo vídeos)

Marcado como dedução porque não vi a edição.

- Títulos: promessa de tempo ("Give me X minutes, I'll...") e promessa de resultado com número ("$100/day+"). O padrão repete-se em vários títulos reais da secção 1.1. Dedução: o título já é o gancho e dita a duração.
- Funil: o canal grande aponta para ofertas pagas (cursos). Os cursos citados são Agency Navigator e Educate.io (terceiros). Não vi links nem descrições, porque a descrição dos vídeos não veio nas páginas que abri. Não descrevo CTAs reais.
- Ritmo e edição de Iman (cortes rápidos, texto em destaque, zooms, ícones animados, cor de acento) vêm só de anúncios de freelancers e de resumos de vídeos promocionais vistos em snippets de pesquisa. NÃO verificados. Não os trato como facto.
- Para o criador (sofá, telemóvel, 18 anos, Covilhã), o que parece transponível sem exagero:
  - título com prazo e resultado concreto e modesto (por exemplo "Faço-te uma página em 10 minutos" só se for verdade e demonstrável);
  - falar de frente e responder a uma pergunta clara nos primeiros segundos;
  - 1 a 3 minutos em vez de 20, por ser telemóvel;
  - texto grande e uma só cor de acento;
  - mostrar o trabalho real (sites feitos) em vez de luxo.

## 4. O que NÃO copiar

- Promessas de dinheiro e de rendimento diário/mensal ("$373/day+", "tornar-se rico"): são o padrão dos títulos dele, mas o criador não tem esse histórico e não deve prometer resultados.
- Montras de riqueza e luxo, e alegações de fortuna sem prova. As fontes de terceiros referem que os números dele variam de entrevista para entrevista e não são verificáveis (Growthscribe).
- Ensinar "como montar uma agência" quando criador ainda está a começar. Ele vende serviço (sites, marca pessoal), não curso.
- Linguagem de "guru" ("brainwash", "Future Billionaire").

## 5. Por cobrir

Gancho dos primeiros 3 s, cortes por minuto, legendas, zooms, música e SFX, cores e tipografia exactas, thumbnails (não vi nenhuma), CTAs reais, Instagram, e Shorts do Iman. Precisam de acesso ao vídeo (yt-dlp com autenticação, que não foi dada) ou de ver os vídeos a olho. Os IDs dos vídeos recentes estão em `raw/fa982aa3.html` para quem quiser rever.
