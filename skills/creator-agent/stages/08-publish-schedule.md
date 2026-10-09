# Estágio 8: Adaptação por plataforma e agendamento

0. **Pronto a publicar?** Corre `scripts/checklist.py <pasta do vídeo> --fase pos`. Se não estiver pronto, não agendes.
0b. **Hora fixa.** Um ritmo previsível vale mais do que a hora perfeita: o criador escolhe uma hora por dia (ou por dia da semana) e o `agenda.csv` fica preenchido nessa hora, para o conteúdo sair sempre a horas sem ele ter de decidir. Sem dados do criador, o agente propõe 2 ou 3 horas de Lisboa para testar durante 2 a 3 semanas cada e escolhe pelo que os Insights mostrarem; os estudos gerais que encontrámos (pico ao fim da tarde e à noite) não são específicos de Portugal. O agente prepara e agenda mediante aprovação, nunca publica sozinho.
1. Para cada plataforma escolhida, cria `adaptacoes/<plataforma>.md` com: título ou primeira linha, legenda, hashtags (poucas e relevantes), comentário fixado, CTA ajustado à plataforma, capa ou miniatura (descrição e, se houver ferramenta de design ligada, versão), duração e formato exigidos, hora sugerida (da audiência real se houver dados; senão regras gerais do playbook).
2. Se o vídeo é longo, propõe 3 cortes para short com tempos.
3. Atualiza `calendario/agenda.csv`: data, plataforma, tipo, fase, tema, estado agendado.
4. Se houver calendário ou ferramenta de agendamento ligados, cria os lembretes ou agendamentos mediante aprovação. Por defeito não publicas.
5. Regista em `historico/posts.csv` quando o criador disser que publicou (data, plataforma, link, fase, tipo, série, tema).
6. Pergunta quando quer a análise (24 h e 7 dias depois) e agenda o lembrete.
