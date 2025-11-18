import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { NotificationRepository } from '../../infrastructure/repositories/NotificationRepository';
import { NotificationValidator } from '../../domain/validators/NotificationValidator';
import { ErrorHandler, ErrorCode } from '../../application/errors/ErrorHandler';

const repository = new NotificationRepository();

Meteor.publish('notifications.list', function (params: { userId: string; page?: number; limit?: number }) {
  check(params, {
    userId: String,
    page: Match.Optional(Match.Integer),
    limit: Match.Optional(Match.Integer),
  });

  const { userId, page = 1, limit = 10 } = params;

  if (!userId || userId.trim().length === 0) {
    throw ErrorHandler.createMeteorError(
      ErrorCode.VALIDATION_ERROR,
      'userId é obrigatório'
    );
  }

  const { skip, limit: safeLimit } = NotificationValidator.validatePagination(page, limit);
  const sanitizedUserId = NotificationValidator.sanitizeString(userId);

  return repository.findByUserId(sanitizedUserId, skip, safeLimit);
});

Meteor.publish('notifications.count', function (userId: string) {
  check(userId, String);

  if (!userId || userId.trim().length === 0) {
    throw ErrorHandler.createMeteorError(
      ErrorCode.VALIDATION_ERROR,
      'userId é obrigatório'
    );
  }

  const sanitizedUserId = NotificationValidator.sanitizeString(userId);
  const count = repository.countByUserId(sanitizedUserId);

  this.added('counts', 'notifications', { count });
  this.ready();
});
