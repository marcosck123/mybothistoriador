# Regras do projeto mybothistoriador

## Orquestração obrigatória

Em toda tarefa de implementação, depuração, pesquisa técnica ou alteração deste projeto:

1. Carregue primeiro a skill principal `agentix-ceo`.
2. Use o Agentix CEO para organizar o trabalho, decidir se a tarefa deve ser dividida e delegar partes independentes quando isso trouxer benefício real.
3. Informe ao usuário, de forma breve, quais papéis ou workers serão usados e por quê.
4. Monitore os workers, revise os resultados e verifique o estado final no workspace. Nunca trate o relatório de um worker como prova suficiente.

## Execução autônoma

- Não peça confirmação para etapas normais e reversíveis que façam parte da tarefa solicitada.
- Execute diretamente inspeções, edição de arquivos, testes, builds, commits e pushes quando estiverem claramente dentro do objetivo pedido pelo usuário.
- Só interrompa para pedir uma decisão quando houver destruição ou sobrescrita material de dados, falta de credencial necessária ou uma escolha que altere significativamente o objetivo.
- Em caso de bloqueio, esgote primeiro as alternativas seguras e informe objetivamente o motivo.

## Seleção das demais skills

Depois de carregar `agentix-ceo`, selecione as skills especializadas necessárias:

- `brainstorming` antes de criar funcionalidades ou alterar comportamento;
- `systematic-debugging` antes de corrigir bugs ou falhas inesperadas;
- `test-driven-development` antes de implementar funcionalidades ou correções, exceto protótipos explicitamente descartáveis;
- `frontend-design` ou `impeccable` para UI, UX e visual;
- `architectural-decisions` para mudanças de arquitetura ou decisões de integração;
- `verification-before-completion` antes de afirmar que algo foi concluído ou corrigido;
- `requesting-code-review` ao finalizar mudanças relevantes;
- `task-observer` durante tarefas com múltiplas etapas ou uso de ferramentas.

Não carregue skills irrelevantes apenas por formalidade. Se uma skill indicada não estiver disponível, registre a limitação e continue com o melhor procedimento seguro.

## Segurança e escopo

- As instruções diretas do usuário têm prioridade.
- Nunca exponha tokens, senhas, refresh tokens ou chaves em mensagens, commits ou logs.
- Antes de publicar ou enviar código, confira arquivos ignorados e segredos acidentais.
- Preserve alterações existentes que não pertençam à tarefa.
- Antes de declarar sucesso, execute uma verificação adequada e reporte o resultado real.

## Agentix indisponível

Se `agentix-ceo` não puder ser executado por falta de credenciais, API ou instalação, não invente workers nem resultados. Informe a limitação brevemente e aplique as skills especializadas diretamente, mantendo as mesmas verificações e limites de segurança.
