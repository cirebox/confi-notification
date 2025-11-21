import { WebApp } from 'meteor/webapp';
import { check } from 'meteor/check';
import { IncomingMessage, ServerResponse } from 'http';
import {
  CreateNotificationUseCase,
  MarkNotificationAsReadUseCase,
  RemoveNotificationUseCase,
} from '../application/usecases/NotificationUseCases';
import { NotificationRepository } from '../infrastructure/repositories/NotificationRepository';
import { ErrorHandler } from '../application/errors/ErrorHandler';
import { NotificationValidator } from '../domain/validators/NotificationValidator';

const repository = new NotificationRepository();

// Interfaces para tipos específicos
interface CreateNotificationRequest {
  userId: string;
  message: string;
}

interface ListNotificationsQuery {
  userId?: string;
  page?: number;
  limit?: number;
}

interface RequestWithBody extends IncomingMessage {
  body?:
    | CreateNotificationRequest
    | ListNotificationsQuery
    | Record<string, unknown>;
}

interface MeteorError {
  statusCode?: number;
  reason?: string;
  message?: string;
}

// Configuração Swagger/OpenAPI
const swaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Notification System API',
    version: '1.0.0',
    description: 'API RESTful para gerenciamento de notificações de usuários',
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Servidor de desenvolvimento',
    },
  ],
  paths: {
    '/api/notifications': {
      get: {
        summary: 'Listar notificações paginadas',
        parameters: [
          {
            name: 'userId',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'ID do usuário',
          },
          {
            name: 'page',
            in: 'query',
            schema: { type: 'integer', default: 1 },
            description: 'Página (inicia em 1)',
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 10, maximum: 100 },
            description: 'Itens por página',
          },
        ],
        responses: {
          200: {
            description: 'Lista de notificações',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Notification' },
                    },
                    pagination: { $ref: '#/components/schemas/Pagination' },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        summary: 'Criar nova notificação',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'message'],
                properties: {
                  userId: { type: 'string', description: 'ID do usuário' },
                  message: {
                    type: 'string',
                    maxLength: 500,
                    description: 'Mensagem da notificação',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Notificação criada',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        notificationId: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/notifications/{id}/read': {
      put: {
        summary: 'Marcar notificação como lida',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID da notificação',
          },
        ],
        responses: {
          200: {
            description: 'Notificação marcada como lida',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        modified: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/notifications/{id}': {
      delete: {
        summary: 'Remover notificação (soft delete)',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: 'ID da notificação',
          },
        ],
        responses: {
          200: {
            description: 'Notificação removida',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        modified: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Notification: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          userId: { type: 'string' },
          message: { type: 'string' },
          readAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          hasMore: { type: 'boolean' },
        },
      },
    },
  },
};

// Servir documentação Swagger
WebApp.connectHandlers.use(
  '/api-docs',
  (req: IncomingMessage, res: ServerResponse) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(swaggerSpec, null, 2));
  }
);

// Página HTML do Swagger UI
WebApp.connectHandlers.use(
  '/docs',
  (req: IncomingMessage, res: ServerResponse) => {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Notification System API - Swagger UI</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin:0; background: #fafafa; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.10.3/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        url: '/api-docs',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>`;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }
);

// Middleware para parsear JSON
WebApp.rawConnectHandlers.use(
  '/api/notifications',
  (req: RequestWithBody, res: ServerResponse, next: () => void) => {
    if (req.method === 'POST' || req.method === 'PUT') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          req.body = JSON.parse(body);
          next();
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        }
      });
    } else {
      next();
    }
  }
);

// GET /api/notifications?userId=xxx&page=1&limit=10 - Listar notificações
WebApp.connectHandlers.use(
  '/api/notifications',
  (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.method === 'GET') {
      try {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const userId = url.searchParams.get('userId');
        const page = parseInt(url.searchParams.get('page') || '1');
        const limit = parseInt(url.searchParams.get('limit') || '10');

        if (!userId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'userId é obrigatório' }));
          return;
        }

        const { skip, limit: safeLimit } =
          NotificationValidator.validatePagination(page, limit);
        const sanitizedUserId = NotificationValidator.sanitizeString(userId);

        // Usar o método assíncrono do repositório
        repository
          .findByUserIdAsync(sanitizedUserId, skip, safeLimit)
          .then((result) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                data: result.items,
                pagination: {
                  page,
                  limit: safeLimit,
                  total: result.total,
                  hasMore: result.hasMore,
                },
              })
            );
          })
          .catch((error) => {
            try {
              const meteorError = ErrorHandler.handleDomainError(error) as MeteorError;
              res.writeHead(meteorError.statusCode || 500, {
                'Content-Type': 'application/json',
              });
              res.end(
                JSON.stringify({
                  error: meteorError.reason || meteorError.message,
                })
              );
            } catch (handlerError) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Erro interno do servidor' }));
            }
          });
      } catch (error: unknown) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro interno do servidor' }));
      }
    } else {
      next();
    }
  }
);

// POST /api/notifications - Criar notificação
WebApp.connectHandlers.use(
  '/api/notifications',
  (req: RequestWithBody, res: ServerResponse, next: () => void) => {
    if (req.method === 'POST') {
      try {
        const { userId, message } = req.body as CreateNotificationRequest;

        check(userId, String);
        check(message, String);

        const useCase = new CreateNotificationUseCase(repository);
        useCase
          .execute(userId, message)
          .then((notificationId) => {
            res.writeHead(201, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                data: { notificationId },
              })
            );
          })
          .catch((error) => {
            try {
              const meteorError = ErrorHandler.handleDomainError(error) as MeteorError;
              res.writeHead(meteorError.statusCode || 500, {
                'Content-Type': 'application/json',
              });
              res.end(
                JSON.stringify({
                  error: meteorError.reason || meteorError.message,
                })
              );
            } catch (handlerError) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Erro interno do servidor' }));
            }
          });
      } catch (error: unknown) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro interno do servidor' }));
      }
    } else {
      next();
    }
  }
);

// PUT /api/notifications/:id/read - Marcar como lida
WebApp.connectHandlers.use(
  '/api/notifications/:id/read',
  (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.method === 'PUT') {
      try {
        const notificationId = req.url!.split('/')[3]; // Extrair ID da URL

        check(notificationId, String);

        const useCase = new MarkNotificationAsReadUseCase(repository);
        useCase
          .execute(notificationId)
          .then((result) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                data: { modified: result },
              })
            );
          })
          .catch((error) => {
            try {
              const meteorError = ErrorHandler.handleDomainError(error) as MeteorError;
              res.writeHead(meteorError.statusCode || 500, {
                'Content-Type': 'application/json',
              });
              res.end(
                JSON.stringify({
                  error: meteorError.reason || meteorError.message,
                })
              );
            } catch (handlerError) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Erro interno do servidor' }));
            }
          });
      } catch (error: unknown) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro interno do servidor' }));
      }
    } else {
      next();
    }
  }
);

// DELETE /api/notifications/:id - Remover notificação
WebApp.connectHandlers.use(
  '/api/notifications/:id',
  (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (req.method === 'DELETE') {
      try {
        const notificationId = req.url!.split('/')[3]; // Extrair ID da URL

        check(notificationId, String);

        const useCase = new RemoveNotificationUseCase(repository);
        useCase
          .execute(notificationId)
          .then((result) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                data: { modified: result },
              })
            );
          })
          .catch((error) => {
            try {
              const meteorError = ErrorHandler.handleDomainError(error) as MeteorError;
              res.writeHead(meteorError.statusCode || 500, {
                'Content-Type': 'application/json',
              });
              res.end(
                JSON.stringify({
                  error: meteorError.reason || meteorError.message,
                })
              );
            } catch (handlerError) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'Erro interno do servidor' }));
            }
          });
      } catch (error: unknown) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro interno do servidor' }));
      }
    } else {
      next();
    }
  }
);

console.log('✅ Endpoints REST configurados:');
console.log('  GET    /api/notifications?userId=xxx&page=1&limit=10');
console.log('  POST   /api/notifications');
console.log('  PUT    /api/notifications/:id/read');
console.log('  DELETE /api/notifications/:id');
console.log('📚 Documentação Swagger:');
console.log('  JSON   /api-docs');
console.log('  UI     /docs');
