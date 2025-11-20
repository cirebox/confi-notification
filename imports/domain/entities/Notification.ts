import { Mongo } from 'meteor/mongo';

export interface INotification {
  _id?: string;
  userId: string;
  message: string;
  readAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
}

export const NotificationsCollection = new Mongo.Collection<INotification>(
  'notifications'
);
