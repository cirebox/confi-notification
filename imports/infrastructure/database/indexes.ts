import { Meteor } from 'meteor/meteor';
import { NotificationsCollection } from '../../domain/entities/Notification';

export const initializeIndexes = async () => {
  await NotificationsCollection.createIndexAsync({ userId: 1, createdAt: -1 });
  await NotificationsCollection.createIndexAsync({ userId: 1, deletedAt: 1 });
  console.log('✓ Índices criados');
};

Meteor.startup(async () => {
  await initializeIndexes();
});
