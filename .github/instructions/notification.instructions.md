---
applyTo: '**'
---

# Instruções do Projeto: Sistema de Notificações

## Visão Geral do Projeto
Este projeto é um teste técnico para a empresa Confi, envolvendo o desenvolvimento de uma aplicação de notificação simples usando o framework Meteor.js. O desafio consiste em construir uma API RESTful em Node.js para gerenciar notificações de usuários, com persistência em MongoDB. O foco está na avaliação da arquitetura, clareza, validação, tratamento de erros, testes e documentação do código.

## Objetivos
Implementar uma API que permita as seguintes operações para notificações de usuários:
- Criar uma notificação.
- Listar notificações de um usuário (com paginação).
- Marcar uma notificação como lida.
- Remover uma notificação (soft delete aceitável).

## Entregáveis Obrigatórios
1. **Operações da API**:
   - Endpoint para criar notificação.
   - Endpoint para listar notificações paginadas de um usuário.
   - Endpoint para marcar notificação como lida.
   - Endpoint para remover notificação.

2. **Persistência**:
   - Utilizar MongoDB como banco de dados.

3. **Arquitetura e Organização do Código**:
   - Separação de responsabilidades (ex.: controllers, models, services).
   - Configuração via variáveis de ambiente (dotenv).
   - Estrutura de pastas clara (ex.: /api, /models, /tests).

4. **Validação e Tratamento de Erros**:
   - Validação de payloads com respostas de erro consistentes em JSON.
   - Uso apropriado de códigos HTTP (200, 400, 404, etc.).
   - Mensagens de erro claras.

5. **Testes**:
   - Testes unitários cobrindo criação e marcação como lida de notificações.

6. **Scripts e Documentação**:
   - README.md com instruções para rodar localmente.

## Plano de Desenvolvimento
O desenvolvimento será organizado em commits específicos e pontuais, seguindo um fluxo incremental:

1. **Commit 1: Configuração Inicial do Projeto**
   - Inicializar projeto Meteor.js.
   - Configurar estrutura de pastas básica.
   - Adicionar dependências essenciais (MongoDB, dotenv, etc.).

2. **Commit 2: Modelo de Dados e Conexão com MongoDB**
   - Definir schema da notificação.
   - Configurar conexão com MongoDB via variáveis de ambiente.

3. **Commit 3: Endpoint para Criar Notificação**
   - Implementar endpoint POST /notifications.
   - Adicionar validação de payload.
   - Persistir no banco.

4. **Commit 4: Endpoint para Listar Notificações**
   - Implementar endpoint GET /notifications com paginação.
   - Filtrar por usuário.

5. **Commit 5: Endpoint para Marcar como Lida**
   - Implementar endpoint PUT /notifications/:id/read.
   - Atualizar status no banco.

6. **Commit 6: Endpoint para Remover Notificação**
   - Implementar endpoint DELETE /notifications/:id.
   - Soft delete (marcar como deletada).

7. **Commit 7: Tratamento de Erros e Validações**
   - Centralizar tratamento de erros.
   - Melhorar validações e códigos HTTP.

8. **Commit 8: Testes Unitários**
   - Escrever testes para criação e marcação como lida.
   - Configurar framework de testes (ex.: Mocha, Jest).

9. **Commit 9: Documentação e README**
   - Criar README.md com instruções de execução.
   - Documentar API (opcional: Swagger).

10. **Commit 10: Finalização e Revisão**
    - Revisar código, otimizar performance.
    - Garantir conformidade com requisitos.

## Diretrizes de Codificação para IA
Ao gerar código, responder perguntas ou revisar mudanças, siga estas diretrizes:
- Priorize código bem organizado, legível e comentado.
- Use padrões RESTful para APIs.
- Implemente validação rigorosa de entrada.
- Garanta tratamento adequado de erros com mensagens claras.
- Escreva testes abrangentes para funcionalidades críticas.
- Mantenha consistência com a arquitetura definida.
- Use variáveis de ambiente para configurações sensíveis.
- Documente funções e endpoints adequadamente.
- Evite código duplicado; promova reutilização.
- Siga convenções de nomenclatura (camelCase para JS, PascalCase para classes).

Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.