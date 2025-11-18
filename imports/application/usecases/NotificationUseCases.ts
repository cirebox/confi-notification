import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { NotificationValidator } from '../../domain/validators/NotificationValidator';
import { NotFoundError, BusinessRuleError } from '../../domain/errors/DomainErrors';

export class CreateNotificationUseCase {
  constructor(private repository: INotificationRepository) {}

  async execute(userId: string, message: string): Promise<string> {
    NotificationValidator.validateCreate(userId, message);

    const sanitizedUserId = NotificationValidator.sanitizeString(userId);
    const sanitizedMessage = NotificationValidator.sanitizeString(message);

    return await this.repository.create(sanitizedUserId, sanitizedMessage);
  }
}

export class MarkNotificationAsReadUseCase {
  constructor(private repository: INotificationRepository) {}

  async execute(notificationId: string): Promise<number> {
    NotificationValidator.validateId(notificationId);

    const notification = await this.repository.findById(notificationId);

    if (!notification) {
      throw new NotFoundError('Notificação não encontrada');
    }

    if (notification.deletedAt) {
      throw new BusinessRuleError('Não é possível marcar como lida uma notificação deletada');
    }

    if (notification.readAt) {
      return 0;
    }

    return await this.repository.markAsRead(notificationId);
  }
}

export class RemoveNotificationUseCase {
  constructor(private repository: INotificationRepository) {}

  async execute(notificationId: string): Promise<number> {
    NotificationValidator.validateId(notificationId);

    const notification = await this.repository.findById(notificationId);

    if (!notification) {
      throw new NotFoundError('Notificação não encontrada');
    }

    if (notification.deletedAt) {
      return 0;
    }

    return await this.repository.softDelete(notificationId);
  }
}
