---
applyTo: '**'
---

# Desafio Prático - Desenvolvedor FullStack
## Sistema de Notificações
### Backend (Node.js)

#### Visão Geral:
O desafio consiste em construir uma API RESTful em Node.js para gerenciar notificações de usuários. O objetivo é avaliar a arquitetura, clareza, validação, tratamento de erros, testes e documentação do código. Priorize um código bem organizado, testes abrangentes e instruções de execução claras.

#### Objetivo:
Implementar uma API que permita as seguintes operações para notificações de usuários: criar, listar (paginada), marcar como lida e remover. A persistência dos dados deve ser feita em MongoDB, com uma organização de projeto exemplar.

#### Entregáveis Obrigatórios (Mínimos):
1. **Operações:**
   - Cria uma notificação.
   - Lista paginada de notificações de um usuário.
   - Marque uma notificação como lida.
   - Remove uma notificação (soft delete aceitável).

2. **Persistência:**
   - Utilizar MongoDB como banco de dados.

3. **Arquitetura e Organização do Código:**
   - Separação de responsabilidades
   - Configuração via variáveis de ambiente (dotenv ou equivalente).
   - Estrutura de pastas clara

4. **Validação e Tratamento de Erros:**
   - Validação de payloads com respostas de erro consistentes em JSON.
   - Uso apropriado de códigos HTTP
   - Mensagens de erro claras para o cliente.

5. **Testes:**
   - Unit tests cobrindo, no mínimo:
     - Criação de notificação.
     - Marcação de notificação como lida.

6. **Scripts e Documentação:**
   - README.md contendo:
     - Instruções para rodar localmente.
     - Exemplos de requests (cURL ou Postman).
     - Instruções para rodar testes.
     - Decisões arquiteturais relevantes.

7. **Infraestrutura para Execução Local:**
   - Docker Compose com a aplicação (Node) e MongoDB, OU instruções claras para execução sem Docker.

#### Diferenciais (Opcionais):
- Usar o meteor.js
- Autenticação de API's e usuários
- Uso de Redis para contagem de notificações não lidas por usuário.
- Documentação OpenAPI/Swagger.
- Testes de integração com mongodb-memory-server ou containers.
- Implementação de endpoints adicionais que achar relevante para a aplicação

#### Formato de Entrega:
- Link do Repositório Git com commits claros.
- README.md explicando a execução, testes e decisões arquiteturais.
- NOTES.md com trade-offs, pontos não implementados por falta de tempo e próximos passos sugeridos.

#### Critérios Mínimos de Aceitação:
- API inicializa e endpoints básicos funcionam conforme especificado.
- Persistência em MongoDB demonstrada.
- Código organizado em camadas com responsabilidades claras.
- Testes unitários mínimos presentes e executáveis.
- README com instruções de execução.

#### Observações Finais:
- Priorize a qualidade do código e a clareza nas decisões.
- Caso opte por não implementar algum diferencial, descreva no NOTES.md o motivo e o que faria com mais tempo.
- Na entrega, inclua instruções exatas para executar os endpoints (variáveis de ambiente, comandos Docker/compose, exemplos de cURL).