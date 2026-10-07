# Estágio 10: Aprender com o criador

Objetivo: cada correção do criador torna o próximo trabalho melhor. A sessão na cloud não tem memória própria, por isso a memória é o repositório do criador, em `estilo/`.

## Ficheiros (no repo do criador, privados)

- `estilo/feedback.csv`: diário bruto. Uma linha por correção ou aprovação.
- `estilo/estilo-criador.md`: perfil de estilo gerado a partir do diário. Não se edita à mão, edita-se o CSV (ou pede-se ao agente).

## Antes de trabalhar (estágios 04, 05, 07)

1. Lê `estilo/estilo-criador.md`. Se não existir, segue com os defeitos do `creator.md`.
2. Aplica as regras `confirmada` e `dura` sem perguntar. Aplica as `hipotese` mas assinala no plano ("a testar: ...").
3. Diz no resumo ao criador que regras aplicaste (uma linha). Assim ele vê que o agente aprendeu e pode corrigir.

## Depois de entregar (todos os estágios que produzem algo)

1. Pergunta com AskUserQuestion o que mudar (Aprovar / Ajustar ritmo / legendas / gráficos / guião / outro). Se o criador escrever uma correção livre, usa-a.
2. Traduz cada correção numa regra curta, concreta e testável. Mau: "mais dinâmico". Bom: "cortes a cada 2 a 3 s, nunca planos parados acima de 4 s".
3. Regista com `python3 scripts/registar-feedback.py` (ver abaixo). Uma chamada por regra.
4. Aprovação sem alterações também se regista (tipo `aprovacao`): confirma as regras aplicadas.
5. Aplica a correção a esta versão (v2) antes de passar ao próximo vídeo.

## Como uma regra ganha força

| Estado | Condição |
| --- | --- |
| hipotese | Pedida 1 vez |
| confirmada | Pedida 2 vezes, ou aprovada em 2 vídeos seguidos |
| dura | O criador disse "sempre" ou "nunca", ou usou `--forte` |

Se duas regras se contradizem, ganha a mais recente, e perguntas ao criador uma vez para fixar. Se uma regra `confirmada` for corrigida, volta a `hipotese` com a nova versão.

## Preferência não é desempenho

- **Preferência** (gosto do criador): vem de correções. Obedece.
- **Desempenho** (o que traz resultados): vem de dados reais (estágio 09). Se uma preferência prejudica resultados com dados suficientes, diz-o uma vez, com números, e deixa o criador decidir. Nunca ignores a preferência por teu gosto.

## Limites

- Aprende só do que o criador disse ou aprovou. Não inferes personalidade nem gostos.
- Nada de dados sensíveis ou pessoais em `estilo/` (saúde, finanças, terceiros).
- O criador pode ver, editar e apagar qualquer linha a qualquer momento. Se pedir para esquecer, remove a linha do CSV e regenera.
- Estas regras são do criador. Nunca vão para o repo público do agente.

## Script

~~~
python3 scripts/registar-feedback.py --categoria edicao --regra "Cortes a cada 2 a 3 s" \
  --video 2026-10-12_porque-comecei --tipo correcao [--forte]
python3 scripts/registar-feedback.py --regenerar
~~~

Categorias: `edicao`, `legendas`, `motion`, `audio`, `guiao`, `voz`, `roteiro`, `estrategia`, `publicacao`.
Tipos: `correcao`, `aprovacao`, `pedido`.
