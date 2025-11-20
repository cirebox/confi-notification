import { INotification } from '../entities/Notification';
import { Mongo } from 'meteor/mongo';

export interface PaginationOptions {
  skip: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
}

export interface INotificationRepository {
  create(userId: string, message: string): Promise<string>;
  findById(id: string): Promise<INotification | null>;
  markAsRead(id: string): Promise<number>;
  softDelete(id: string): Promise<number>;
  findByUserId(
    userId: string,
    skip: number,
    limit: number
  ): Mongo.Cursor<INotification>; // Cursor for Meteor publications
  findByUserIdAsync(
    userId: string,
    skip: number,
    limit: number
  ): Promise<PaginatedResult<INotification>>; // For async operations
  countByUserId(userId: string): number; // Sync for publications
  countByUserIdAsync(userId: string): Promise<number>; // Async version
}
