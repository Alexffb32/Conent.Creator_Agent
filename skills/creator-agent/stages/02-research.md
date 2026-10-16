# Estágio 2: Pesquisa de referências

Objetivo: perceber o que já funciona no nicho do criador e para a audiência que ele quer atingir. Segue `references/research-playbook.md` em detalhe.

Saída: `referencias/AAAA-MM-DD_<nicho>.md` com:
- Criadores de referência (5 a 10): nome, plataforma, link, tamanho, porque servem de referência (mesmo nicho, mesma fase, mesmo estilo), com o que se pode aprender.
- Vídeos outliers (10 a 20): link, plataforma, o que se destaca (views muito acima da média do canal), gancho, estrutura, duração, CTA, estilo de edição.
- Padrões repetidos (o que 3 ou mais exemplos têm em comum).
- Ganchos e CTAs testados no nicho, em formato reutilizável (padrão, não texto copiado).
- Estilos de edição dominantes (ritmo, legendas, música, B-roll, gráficos).
- Algoritmo e formatos em alta para as plataformas escolhidas, com data e fonte.
- O que não foi possível verificar.

Depois atualiza `references/hooks.md` e `references/ctas.md` do agente apenas com padrões gerais (nunca dados privados do criador).

## Fichas de estilo de edição
Quando o criador quer editar como alguém (ou a pesquisa mostra um estilo dominante no nicho):
1. Junta 3 a 5 vídeos recentes desse criador. Se tiveres o ficheiro (enviado pelo criador ou descarregável dentro dos termos da plataforma), corre `python3 scripts/analisar_referencia.py <video> referencias/estilos/<criador>/<n>` e olha para `planos.jpg` e `gancho.jpg`. Sem ficheiro, usa páginas, guias e capturas, e marca a confiança como média.
2. Escreve `referencias/estilos/<criador>.md` a partir de `biblioteca/estilos/README.md`: ritmo (cortes por minuto, plano médio), gancho, legendas (fonte, caixa, cor, animação, posição), componentes de motion, cor e look, música e SFX, CTA e frame final, com fontes e datas.
3. Traduz a ficha em componentes e parâmetros do `compor.py` (`biblioteca/componentes.md`) e diz o que não existe ainda (componente novo a criar).
4. Se a ficha for geral e sem dados privados, propõe-a para `biblioteca/estilos/` do agente.
