# Notification System

Sistema de notificações desenvolvido com Meteor.js e TypeScript.

## Requisitos

- Node.js 20+
- Meteor 3.3.2
- MongoDB 7.0+
- Docker e Docker Compose (opcional)

## Instalação

```bash
# Instalar Meteor
curl https://install.meteor.com/ | sh

# Instalar dependências
meteor npm install
```

## Execução Local

```bash
# Iniciar aplicação
meteor run --settings settings.json

# Rodar testes
meteor npm test
```

## Execução com Docker

```bash
# Iniciar containers
docker-compose up -d

# Verificar logs
docker-compose logs -f app
```

## Endpoints

### Criar Notificação
```bash
# Meteor Method
Meteor.call('notifications.create', { userId: 'user123', message: 'Mensagem' })
```

### Listar Notificações
```bash
# Meteor Subscription
Meteor.subscribe('notifications.list', { userId: 'user123', page: 1, limit: 10 })
```

### Marcar como Lida
```bash
# Meteor Method
Meteor.call('notifications.markAsRead', 'notificationId')
```

### Remover Notificação
```bash
# Meteor Method
Meteor.call('notifications.remove', 'notificationId')
```

## Arquitetura

Projeto estruturado em camadas seguindo princípios SOLID:

- **Domain**: Entidades, validadores, repositórios (interfaces)
- **Application**: Casos de uso, handlers de erro
- **Infrastructure**: Implementações de repositórios, segurança, database
- **API**: Methods e Publications do Meteor

## Testes

```bash
# Executar testes unitários
meteor npm test

# Executar com watch
meteor npm run test:watch
```

## Tecnologias

- Meteor.js 3.3.2
- TypeScript 5.3
- MongoDB 7.0
- Mocha + Chai
