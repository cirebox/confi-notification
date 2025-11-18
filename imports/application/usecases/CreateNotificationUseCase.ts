import { INotificationRepository } from '../../domain/repositories/INotificationRepository';
import { NotificationValidator } from '../../domain/validators/NotificationValidator';

export class CreateNotificationUseCase {
  constructor(private repository: INotificationRepository) {}

  async execute(userId: string, message: string): Promise<string> {
    NotificationValidator.validateCreate(userId, message);

    const sanitizedUserId = NotificationValidator.sanitizeString(userId);
    const sanitizedMessage = NotificationValidator.sanitizeString(message);

    return await this.repository.create(sanitizedUserId, sanitizedMessage);
  }
}
