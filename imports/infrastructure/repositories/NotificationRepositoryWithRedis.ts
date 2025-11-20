import {
  NotificationsCollection,
  INotification,
} from '../../domain/entities/Notification';
import {
  INotificationRepository,
  PaginatedResult,
} from '../../domain/repositories/INotificationRepository';
import redisService from '../services/RedisService';

export class NotificationRepositoryWithRedis
  implements INotificationRepository
{
  async create(userId: string, message: string): Promise<string> {
    const notification: Omit<INotification, '_id'> = {
      userId,
      message,
      createdAt: new Date(),
    };

    const notificationId =
      await NotificationsCollection.insertAsync(notification);

    // Incrementar contador Redis para notificações não lidas
    await redisService.incrementUnreadCount(userId);

    return notificationId;
  }

  async findById(id: string): Promise<INotification | null> {
    const result = await NotificationsCollection.findOneAsync({ _id: id });
    return result || null;
  }

  async markAsRead(id: string): Promise<number> {
    // Verificar se a notificação existe e não está lida
    const notification = await this.findById(id);
    if (!notification || notification.readAt) {
      return 0; // Já está lida ou não existe
    }

    const result = await NotificationsCollection.updateAsync(
      { _id: id },
      { $set: { readAt: new Date() } }
    );

    // Decrementar contador Redis se a notificação foi marcada como lida
    if (result > 0) {
      await redisService.decrementUnreadCount(notification.userId);
    }

    return result;
  }

  async softDelete(id: string): Promise<number> {
    // Verificar se a notificação existe e não está deletada
    const notification = await this.findById(id);
    if (!notification || notification.deletedAt) {
      return 0; // Já está deletada ou não existe
    }

    const result = await NotificationsCollection.updateAsync(
      { _id: id },
      { $set: { deletedAt: new Date() } }
    );

    // Decrementar contador Redis se a notificação deletada não estava lida
    if (result > 0 && !notification.readAt) {
      await redisService.decrementUnreadCount(notification.userId);
    }

    return result;
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

  /**
   * Obtém a contagem de notificações não lidas usando Redis (com fallback para MongoDB)
   */
  async getUnreadCount(userId: string): Promise<number> {
    if (redisService.isRedisConnected()) {
      return await redisService.getUnreadCount(userId);
    } else {
      // Fallback: contar no MongoDB
      console.warn('⚠️ Redis não disponível, usando MongoDB para contagem');
      return await NotificationsCollection.find({
        userId,
        deletedAt: { $exists: false },
        readAt: { $exists: false },
      }).countAsync();
    }
  }

  /**
   * Sincroniza o contador Redis com o MongoDB (útil para inicialização)
   */
  async syncUnreadCountWithMongoDB(userId: string): Promise<void> {
    const mongoCount = await NotificationsCollection.find({
      userId,
      deletedAt: { $exists: false },
      readAt: { $exists: false },
    }).countAsync();

    await redisService.syncUnreadCountWithMongoDB(userId, mongoCount);
  }
}
