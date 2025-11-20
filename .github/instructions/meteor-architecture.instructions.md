---
applyTo: '**'
---

# Guia de Implementação com Meteor.js

## 1. 🏗️ Arquitetura e Estrutura do Projeto (Best Practices)
Em vez de Controllers, Services e Models (como no Express), a estrutura do Meteor é centrada em collections, methods, e publications.

### Estrutura Sugerida de Pastas
```
├── imports/
│   ├── api/
│   │   └── notifications/
│   │       ├── collection.js       # MongoDB Collection (Schema opcional com SimpleSchema/Collection2)
│   │       ├── methods.js          # Lógica de escrita (Criar, Marcar Lida, Remover)
│   │       └── server/
│   │           └── publications.js   # Lógica de leitura (Listar - Assinaturas)
│   ├── startup/
│   │   ├── client/
│   │   └── server/
│   │       └── index.js            # Inicialização e seeds (Conexão MongoDB é automática)
│   └── utils/
│       └── validation.js           # Funções de validação, helpers
├── client/                     # Frontend (se for fazer um front mínimo para demonstrar)
├── server/                     # Código que roda apenas no servidor (pode ser substituído por /imports/startup/server)
├── package.json
├── settings.json               # Variáveis de ambiente e configurações (dotenv ainda pode ser usado).
└── README.md
```

### Separação de Responsabilidades (Meteor)
| Camada | Padrão Meteor | Responsabilidade | Desafio |
|--------|---------------|------------------|---------|
| Persistência | Collection (imports/api/notifications/collection.js) | Define a coleção MongoDB e o esquema. | MongoDB (Persistência) |
| Lógica de Escrita | Method (imports/api/notifications/methods.js) | Executa as operações CRUD de escrita. Ideal para Transações e Validação. | Criar, Marcar Lida, Remover |
| Lógica de Leitura | Publication (imports/api/notifications/server/publications.js) | Filtra e retorna dados do servidor para o cliente em tempo real. | Listar Notificações (em tempo real) |
| Validação | Schema (com simpl-schema ou collection2) | Validação de payloads nos Methods. | Validação e Tratamento de Erros |

## 2. 📝 Implementação dos Métodos e Publicações

### A. Criação de Notificação (Usando Meteor Method)
- **Método**: notifications.create
- **Ação**: O cliente chama Meteor.call('notifications.create', { userId, message }).
- **Validação e Erros**: Use SimpleSchema para definir o esquema do documento e validar o payload no Method. Retorne erros consistentes usando throw new Meteor.Error(errorCode, reason).
- **Código HTTP**: Embora Methods não usem HTTP Codes diretamente, o erro lançado se traduzirá em uma resposta com código 500 ou 400 (dependendo da configuração) se for chamado por um endpoint DDP/REST. Para o requisito, a clareza da mensagem de erro é o que importa.

### B. Listagem Paginada de Notificações (Usando Publication)
- **Publicação**: notifications.list
- **Ação**: O cliente chama Meteor.subscribe('notifications.list', { userId, page, limit }).
- **Paginação**: A paginação é feita no servidor dentro da função Meteor.publish. Use as opções do MongoDB/Mongoose:
  - limit: Limite de documentos.
  - skip: Calcular o deslocamento (offset) baseado na página ((page - 1) * limit).
  - sort: Para ordenar por data (ex: as mais recentes primeiro).
- **Opcional/Diferencial (Redis)**: O Redis (com o pacote meteorhacks:kadira-redis ou similar) seria usado aqui para gerenciar a contagem de notificações não lidas por userId, sem ter que recontar no MongoDB a cada chamada.

### C. Marcar Notificação como Lida (Usando Meteor Method)
- **Método**: notifications.markAsRead
- **Ação**: O cliente chama Meteor.call('notifications.markAsRead', notificationId).
- **Lógica**: Usar Collection.update({ _id: notificationId, userId: this.userId() }, { $set: { readAt: new Date() } }). A verificação do userId garante que o usuário só marque como lida a sua própria notificação (Autenticação/Autorização).

### D. Remover Notificação (Soft Delete) (Usando Meteor Method)
- **Método**: notifications.remove
- **Ação**: O cliente chama Meteor.call('notifications.remove', notificationId).
- **Lógica (Soft Delete)**: Usar Collection.update({ _id: notificationId }, { $set: { deletedAt: new Date() } }).
- **Regra de Ouro**: A Publication (notifications.list) deve sempre filtrar as notificações para excluir aquelas onde deletedAt não é nulo.

## 3. 🛡️ Tratamento de Erros, Validação e Autenticação (Diferencial)
O Meteor facilita o requisito de Autenticação, tornando-o um diferencial simples de implementar:
- **Usuário Autenticado**: Dentro de qualquer Method ou Publication, você pode acessar o ID do usuário logado via this.userId().
- **Validação de Usuário**: Sempre que o cliente tentar uma ação (ex: markAsRead), verifique:
  ```javascript
  // Dentro de methods.js
  if (!this.userId) {
    throw new Meteor.Error('not-authorized', 'Usuário não autenticado.');
  }
  ```
- **Opcional: Autenticação de API Key**: Para chamadas externas sem usuário Meteor (Ex: Servidor de antifraude enviando notificação). Use o pacote `simple:rest` ou `nimble:restivus` para criar endpoints RESTful (POST) e faça a verificação de um API Key no middleware do pacote.
- **Validação de Schema**: Defina o Schema no collection.js e use check() (ou SimpleSchema) nos Methods para garantir que o payload de entrada seja válido.

## 4. 🧪 Testes
Com o Meteor, os testes podem ser mais concisos, focando na lógica dos Methods e Publications.
- **Framework**: Use Mocha ou Jest (com o pacote meteortesting:mocha ou practicalmeteor:mocha).
- **Testes Unitários**: Teste a lógica dos Methods (notifications.create, notifications.markAsRead) usando mocks para simular chamadas de autenticação (this.userId()) e garantir que a coleção seja atualizada corretamente.
- **Testes de Integração (Diferencial)**: Teste as Publications para garantir que a paginação e a filtragem por usuário e soft delete funcionem corretamente.

## 5. 📦 Docker Compose
O docker-compose.yml deve incluir dois serviços:
- **Mongo**: A imagem oficial do MongoDB.
- **App**: Um container Node/Meteor que depende do serviço Mongo e usa as variáveis de ambiente para conectar (embora o Meteor se conecte automaticamente se a variável MONGO_URL for definida).