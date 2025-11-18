import { Meteor } from 'meteor/meteor';
import { NotificationsCollection } from '../../domain/entities/Notification';

Meteor.startup(() => {
  NotificationsCollection.createIndexAsync({ userId: 1, createdAt: -1 });
  NotificationsCollection.createIndexAsync({ userId: 1, deletedAt: 1 });
  console.log('✓ Índices criados');
});
