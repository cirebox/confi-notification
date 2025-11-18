import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { NotificationRepository } from '../../infrastructure/repositories/NotificationRepository';
import {
  CreateNotificationUseCase,
  MarkNotificationAsReadUseCase,
  RemoveNotificationUseCase,
} from '../../application/usecases/NotificationUseCases';
import { ErrorHandler } from '../../application/errors/ErrorHandler';

const repository = new NotificationRepository();

Meteor.methods({
  async 'notifications.create'({ userId, message }: { userId: string; message: string }) {
    check(userId, String);
    check(message, String);

    try {
      const useCase = new CreateNotificationUseCase(repository);
      return await useCase.execute(userId, message);
    } catch (error) {
      ErrorHandler.handleDomainError(error as Error);
    }
  },

  async 'notifications.markAsRead'(notificationId: string) {
    check(notificationId, String);

    try {
      const useCase = new MarkNotificationAsReadUseCase(repository);
      return await useCase.execute(notificationId);
    } catch (error) {
      ErrorHandler.handleDomainError(error as Error);
    }
  },

  async 'notifications.remove'(notificationId: string) {
    check(notificationId, String);

    try {
      const useCase = new RemoveNotificationUseCase(repository);
      return await useCase.execute(notificationId);
    } catch (error) {
      ErrorHandler.handleDomainError(error as Error);
    }
  },
});
