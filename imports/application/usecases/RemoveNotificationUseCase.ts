import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { NotificationValidator } from '../../domain/validators/NotificationValidator';
import {
  NotFoundError,
  BusinessRuleError,
} from '../../domain/errors/DomainErrors';
import { Meteor } from 'meteor/meteor';

export class RemoveNotificationUseCase {
  constructor(private repository: INotificationRepository) {}

  async execute(notificationId: string): Promise<number> {
    NotificationValidator.validateId(notificationId);

    if (!this.getCurrentUserId()) {
      throw new BusinessRuleError('Usuário não autenticado');
    }

    const notification = await this.repository.findById(notificationId);

    if (!notification) {
      throw new NotFoundError('Notificação não encontrada');
    }

    if (notification.userId !== this.getCurrentUserId()) {
      throw new BusinessRuleError(
        'Usuário não autorizado a modificar esta notificação'
      );
    }

    if (notification.deletedAt) {
      return 0;
    }

    return await this.repository.softDelete(notificationId);
  }

  private getCurrentUserId(): string | null {
    return Meteor.userId();
  }
}
