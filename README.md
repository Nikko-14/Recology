# Recology — Diário de desperdício

## Objetivo
Ajudar famílias, comunidades e pequenos negócios a registrar e acompanhar o desperdício
de água, energia e alimentos, ajudando o problema a se tornar visível para que possa ser reduzido.

## Problema e cidadão
- Toda a população é afetada com o consumo inadequado de recursos
- Muitas pessoas fazem o uso inadequado de recursos que vão fazer falta se utilizados de maneira incorreta, estamos aqui para ajudar a prevenir isso
- Evidência: [uma conversa, uma observação ou um dado público, com a fonte]
- ODS relacionadas: ODS 12 – Consumo e Produção Responsáveis, ODS 11 – Cidades e Comunidades Sustentáveis, ODS 13 – Ação Contra a Mudança Global do Clima, ODS 15 – Vida Terrestre e ODS 14 – Vida na Água

## Funcionalidades
- Cadastro de registros de desperdício (tipo, local, descrição, quantidade e data)
- Lista, edição e remoção dos registros, com totais por tipo
- Painel de atividades com data/hora, ação e resultado de cada operação
- Validação dos dados (HTML5 + JavaScript) com mensagens na tela
- Páginas de apoio: Sobre, Recursos, Dicas, Desafios e Quiz

## Tecnologias
HTML5 semântico, CSS3 (Flexbox, Grid e Mobile First), JavaScript puro,
Bootstrap 5.3 (via CDN) e `localStorage` para guardar os dados no navegador.

## Segurança e privacidade
- Toda entrada é validada (vazio, tamanho, formato e tipo) antes de ser usada.
- O texto do usuário é exibido com `textContent`, nunca com `innerHTML`.
- Mensagens de erro são genéricas, sem detalhes técnicos.
- Coleta mínima de dados (LGPD): nenhum dado pessoal é pedido; o formulário
  recusa e-mails e telefones. Os dados ficam só no navegador de quem usa.