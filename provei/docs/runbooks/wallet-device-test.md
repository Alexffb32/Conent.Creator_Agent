# Runbook · Teste manual da Wallet num iPhone real

O simulador do iOS **não** mostra cartões no ecrã de bloqueio; o push de atualização **não** funciona em sandbox.
Este teste faz-se num iPhone real, com o ambiente de produção (ou preview com certificados reais) e um restaurante de teste
marcado como fictício (`is_demo`) e cartões com `is_synthetic = true`.

## Preparação
- Flags no restaurante de teste: `wallet_apple` ligada; para W2 também `wallet_updates`; para W3 `wallet_location`.
- Plano do restaurante: pago (o cartão na Wallet faz parte do plano pago).

## Checklist
| # | Passo | Resultado esperado | OK |
| --- | --- | --- | --- |
| 1 | Entrar na conta, abrir Cartão › restaurante › "Adicionar à Apple Wallet" | O iPhone mostra o cartão verde com o nome do restaurante, pontos, progresso e nível | |
| 2 | Verso do cartão | Termos, privacidade, como desligar avisos, contacto do restaurante; sem e-mail/telefone do cliente | |
| 3 | Tentar partilhar o cartão | Partilha indisponível (`sharingProhibited`) | |
| 4 | Staff lê o QR do cartão no leitor do restaurante | "Visita confirmada", pontos creditados | |
| 5 | (W2) Esperar pela atualização | Pontos atualizados no cartão; aviso "Tens N pontos no …" com notificações da Wallet ativas | |
| 6 | (W2) Desligar notificações do cartão (⋯ › Detalhes do cartão) e ganhar pontos | O cartão atualiza, sem aviso | |
| 7 | Apagar o cartão da Wallet e voltar a adicionar | Mesmo número de série, mesmos pontos; registo antigo removido | |
| 8 | (W3) Aproximar-se do restaurante com o cartão fora do grupo de controlo | Sugestão no ecrã de bloqueio (gerida pelo iOS, sem garantia de horário) | |
| 9 | Apagar a conta Provei | O cartão passa a "anulado" na Wallet após atualização | |
| 10 | Link de descarga com mais de 5 minutos | "Ligação inválida ou expirada" | |

Registar data, modelo do iPhone e versão do iOS em cada execução.
