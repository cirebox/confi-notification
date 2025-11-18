import { Meteor } from 'meteor/meteor';
import '../domain/entities/Notification';
import '../api/methods/notificationMethods';
import '../api/publications/notificationPublications';
import '../infrastructure/database/indexes';
import '../infrastructure/security/rateLimiting';
import '../infrastructure/security/headers';

Meteor.startup(() => {
  console.log('🚀 Servidor iniciado');
  console.log(`✓ MongoDB: ${Meteor.settings.private?.MONGO_URL || 'padrão'}`);
});
