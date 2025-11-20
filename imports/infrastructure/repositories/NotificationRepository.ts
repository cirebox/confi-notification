import {
  NotificationsCollection,
  INotification,
} from '../../domain/entities/Notification';
import {
  INotificationRepository,
  PaginatedResult,
} from '../../domain/repositories/INotificationRepository';

export class NotificationRepository implements INotificationRepository {
  async create(userId: string, message: string): Promise<string> {
    const notification: Omit<INotification, '_id'> = {
      userId,
      message,
      createdAt: new Date(),
    };

    return await NotificationsCollection.insertAsync(notification);
  }

  async findById(id: string): Promise<INotification | null> {
    const result = await NotificationsCollection.findOneAsync({ _id: id });
    return result || null;
  }

  async markAsRead(id: string): Promise<number> {
    return await NotificationsCollection.updateAsync(
      { _id: id },
      { $set: { readAt: new Date() } }
    );
  }

  async softDelete(id: string): Promise<number> {
    return await NotificationsCollection.updateAsync(
      { _id: id },
      { $set: { deletedAt: new Date() } }
    );
  }

  findByUserId(userId: string, skip: number, limit: number) {
    return NotificationsCollection.find(
      {
        userId,
        deletedAt: { $exists: false },
      },
      {
        sort: { createdAt: -1 },
        skip,
        limit,
        fields: {
          userId: 1,
          message: 1,
          readAt: 1,
          createdAt: 1,
        },
      }
    );
  }

  countByUserId(userId: string): number {
    return NotificationsCollection.find({
      userId,
      deletedAt: { $exists: false },
    }).count();
  }

  async findByUserIdAsync(
    userId: string,
    skip: number,
    limit: number
  ): Promise<PaginatedResult<INotification>> {
    const total = await this.countByUserIdAsync(userId);
    const items = await NotificationsCollection.find(
      {
        userId,
        deletedAt: { $exists: false },
      },
      {
        sort: { createdAt: -1 },
        skip,
        limit,
        fields: {
          userId: 1,
          message: 1,
          readAt: 1,
          createdAt: 1,
        },
      }
    ).fetchAsync();

    return {
      items,
      total,
      hasMore: skip + limit < total,
    };
  }

  async countByUserIdAsync(userId: string): Promise<number> {
    return await NotificationsCollection.find({
      userId,
      deletedAt: { $exists: false },
    }).countAsync();
  }
}
