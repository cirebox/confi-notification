import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { NotificationValidator } from '../../domain/validators/NotificationValidator';
import { NotFoundError } from '../../domain/errors/DomainErrors';

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
