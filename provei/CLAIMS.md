# CLAIMS — prova de cada afirmação pública

| Afirmação | Onde | Prova |
| --- | --- | --- |
| "Publicar um prato demora segundos" | /para-restaurantes | Fluxo testado: escolher ficheiro + nome + Publicar (3 campos). Formular como "Publicar um prato leva menos de um minuto" até medir no piloto. |
| "Sem comissões" | /para-restaurantes | Modelo: sem comissão por reserva/pedido (docs/DECISIONS.md). Verdadeiro enquanto não houver pedidos na mesa. |
| "Plano gratuito" | /para-restaurantes, /legal/termos | `plan_limits.free` — nada cobrado. |
| "Os teus dados ficam na UE" | /para-restaurantes, privacidade | Base de dados Supabase em Frankfurt (eu-central-1). Alojamento Vercel tem servidores fora da UE → afirmar só "base de dados na UE". |
| "Funciona sem instalar app" | landing, app | PWA aberta por QR no navegador. |
| Preços 490 € / 99 € | /para-restaurantes | Hipóteses do documento do projeto; marcadas "valores de arranque, acresce IVA". |
| Números de utilizadores/restaurantes | — | Nenhum número afirmado. Proibido até haver dados reais. |
