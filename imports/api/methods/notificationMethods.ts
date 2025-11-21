import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import { NotificationRepositoryWithRedis } from '../../infrastructure/repositories/NotificationRepositoryWithRedis';
import {
  CreateNotificationUseCase,
  MarkNotificationAsReadUseCase,
  RemoveNotificationUseCase,
} from '../../application/usecases/NotificationUseCases';
import { ErrorHandler } from '../../application/errors/ErrorHandler';

const repository = new NotificationRepositoryWithRedis();

Meteor.methods({
  async 'notifications.create'({ message }: { message: string }) {
    check(message, String);

    if (!this.userId) {
      throw new Meteor.Error(
        'not-authorized',
        'Usuário não autenticado. Faça login primeiro.'
      );
    }

    try {
      const useCase = new CreateNotificationUseCase(repository);
      return await useCase.execute(this.userId, message);
    } catch (error) {
      ErrorHandler.handleDomainError(error as Error);
    }
  },

  async 'notifications.markAsRead'(notificationId: string) {
    check(notificationId, String);

    if (!this.userId) {
      throw new Meteor.Error(
        'not-authorized',
        'Usuário não autenticado. Faça login primeiro.'
      );
    }

    try {
      const useCase = new MarkNotificationAsReadUseCase(repository);
      return await useCase.execute(notificationId);
    } catch (error) {
      ErrorHandler.handleDomainError(error as Error);
    }
  },

  async 'notifications.remove'(notificationId: string) {
    check(notificationId, String);

    if (!this.userId) {
      throw new Meteor.Error(
        'not-authorized',
        'Usuário não autenticado. Faça login primeiro.'
      );
    }

    try {
      const useCase = new RemoveNotificationUseCase(repository);
      return await useCase.execute(notificationId);
    } catch (error) {
      ErrorHandler.handleDomainError(error as Error);
    }
  },

  async 'notifications.getUnreadCount'() {
    if (!this.userId) {
      throw new Meteor.Error(
        'not-authorized',
        'Usuário não autenticado. Faça login primeiro.'
      );
    }

    try {
      return await repository.getUnreadCount(this.userId);
    } catch (error) {
      console.error('Erro ao obter contagem de notificações não lidas:', error);
      throw new Meteor.Error(
        'count-failed',
        'Erro ao obter contagem de notificações não lidas'
      );
    }
  },
});

// Métodos de Autenticação
Meteor.methods({
  async 'auth.register'(
    email: string,
    password: string,
    profile?: { name?: string }
  ) {
    check(email, String);
    check(password, String);
    check(profile, Match.Optional(Object));

    try {
      const userId = Accounts.createUser({
        email,
        password,
        profile: profile || {},
      });

      return { userId, success: true };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido';
      throw new Meteor.Error('registration-failed', message);
    }
  },
});
