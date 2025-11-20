import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { NotificationRepositoryWithRedis } from '../../infrastructure/repositories/NotificationRepositoryWithRedis';
import { NotificationValidator } from '../../domain/validators/NotificationValidator';
import { ErrorHandler, ErrorCode } from '../../application/errors/ErrorHandler';
import { NotificationsCollection } from '../../domain/entities/Notification';

const repository = new NotificationRepositoryWithRedis();

Meteor.publish(
  'notifications.list',
  async function (params: { page?: number; limit?: number }) {
    check(params, {
      page: Match.Optional(Match.Integer),
      limit: Match.Optional(Match.Integer),
    });

    if (!this.userId) {
      throw ErrorHandler.createMeteorError(
        ErrorCode.VALIDATION_ERROR,
        'Usuário não autenticado. Faça login primeiro.'
      );
    }

    const { page = 1, limit = 10 } = params;

    const { skip, limit: safeLimit } = NotificationValidator.validatePagination(
      page,
      limit
    );
    const sanitizedUserId = NotificationValidator.sanitizeString(this.userId);

    // Publicar metadados de paginação (calcular total de forma assíncrona)
    const totalRecords = await NotificationsCollection.find({
      userId: sanitizedUserId,
      deletedAt: { $exists: false },
    }).countAsync();

    const totalPages = Math.ceil(totalRecords / safeLimit);
    this.added('pagination', `notifications_${sanitizedUserId}`, {
      page,
      limit: safeLimit,
      total: totalRecords,
      totalPages,
      hasMore: page < totalPages,
    });

    return repository.findByUserId(sanitizedUserId, skip, safeLimit);
  }
);

Meteor.publish(
  'notifications.unreadCount',
  async function (params?: { userId?: string }) {
    // Aceitar params vazio/undefined
    if (params) {
      check(params, {
        userId: Match.Optional(String),
      });
    }

    if (!this.userId) {
      throw ErrorHandler.createMeteorError(
        ErrorCode.VALIDATION_ERROR,
        'Usuário não autenticado. Faça login primeiro.'
      );
    }

    const sanitizedUserId = NotificationValidator.sanitizeString(this.userId);

    // Usar Redis para obter contagem (com fallback para MongoDB)
    const unreadCount = await repository.getUnreadCount(sanitizedUserId);

    this.added('counts', 'notifications_unread', { count: unreadCount });
    this.ready();
  }
);
