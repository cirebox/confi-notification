import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { expect } from 'chai';
import { NotificationsCollection } from '../imports/domain/entities/Notification';
import '../imports/api/methods/notificationMethods';
import './Infrastructure.tests';

if (Meteor.isServer) {
  describe('Notification System - Use Cases', function () {
    let testUserId: string;

    before(async function () {
      // Criar um usuário de teste
      testUserId = Random.id();
      await Meteor.users.removeAsync({});
      await Meteor.users.insertAsync({
        _id: testUserId,
        username: 'testuser',
        createdAt: new Date(),
      });
    });

    describe('Create Notification', function () {
      beforeEach(async function () {
        await NotificationsCollection.removeAsync({});
      });

      it('deve criar notificação com dados válidos', async function () {
        const message = 'Teste de notificação';

        // Simular contexto de usuário autenticado
        const originalUserId = Meteor.userId;
        Meteor.userId = () => testUserId;

        try {
          const notificationId = await Meteor.callAsync('notifications.create', {
            message,
          });

          expect(notificationId).to.be.a('string');

          const notification = await NotificationsCollection.findOneAsync({
            _id: notificationId,
          });

          expect(notification).to.exist;
          expect(notification?.userId).to.equal(testUserId);
          expect(notification?.message).to.equal(message);
          expect(notification?.createdAt).to.be.a('date');
        } finally {
          Meteor.userId = originalUserId;
        }
      });

      it('deve rejeitar message vazia', async function () {
        const originalUserId = Meteor.userId;
        Meteor.userId = () => testUserId;

        try {
          await Meteor.callAsync('notifications.create', {
            message: '',
          });
          throw new Error('Deveria ter lançado erro');
        } catch (error: any) {
          expect(error.error).to.equal('validation-error');
        } finally {
          Meteor.userId = originalUserId;
        }
      });

      it('deve rejeitar message com mais de 500 caracteres', async function () {
        const originalUserId = Meteor.userId;
        Meteor.userId = () => testUserId;

        try {
          await Meteor.callAsync('notifications.create', {
            message: 'a'.repeat(501),
          });
          throw new Error('Deveria ter lançado erro');
        } catch (error: any) {
          expect(error.error).to.equal('validation-error');
        } finally {
          Meteor.userId = originalUserId;
        }
      });
    });

    describe('Mark Notification As Read', function () {
      let notificationId: string;

      beforeEach(async function () {
        await NotificationsCollection.removeAsync({});

        notificationId = await NotificationsCollection.insertAsync({
          userId: testUserId,
          message: 'Teste',
          createdAt: new Date(),
        });
      });

      it('deve marcar notificação como lida', async function () {
        const originalUserId = Meteor.userId;
        Meteor.userId = () => testUserId;

        try {
          const result = await Meteor.callAsync('notifications.markAsRead', notificationId);

          expect(result).to.equal(1);

          const notification = await NotificationsCollection.findOneAsync({
            _id: notificationId,
          });

          expect(notification?.readAt).to.be.a('date');
        } finally {
          Meteor.userId = originalUserId;
        }
      });

      it('deve retornar 0 se já estiver lida', async function () {
        const originalUserId = Meteor.userId;
        Meteor.userId = () => testUserId;

        try {
          await Meteor.callAsync('notifications.markAsRead', notificationId);
          const result = await Meteor.callAsync('notifications.markAsRead', notificationId);

          expect(result).to.equal(0);
        } finally {
          Meteor.userId = originalUserId;
        }
      });

      it('deve rejeitar ID inválido', async function () {
        const originalUserId = Meteor.userId;
        Meteor.userId = () => testUserId;

        try {
          await Meteor.callAsync('notifications.markAsRead', '');
          throw new Error('Deveria ter lançado erro');
        } catch (error: any) {
          expect(error.error).to.equal('validation-error');
        } finally {
          Meteor.userId = originalUserId;
        }
      });

      it('deve rejeitar notificação inexistente', async function () {
        const originalUserId = Meteor.userId;
        Meteor.userId = () => testUserId;

        try {
          await Meteor.callAsync('notifications.markAsRead', 'inexistente');
          throw new Error('Deveria ter lançado erro');
        } catch (error: any) {
          expect(error.error).to.equal('not-found');
        } finally {
          Meteor.userId = originalUserId;
        }
      });

      it('deve rejeitar notificação deletada', async function () {
        await NotificationsCollection.updateAsync(
          { _id: notificationId },
          { $set: { deletedAt: new Date() } }
        );

        const originalUserId = Meteor.userId;
        Meteor.userId = () => testUserId;

        try {
          await Meteor.callAsync('notifications.markAsRead', notificationId);
          throw new Error('Deveria ter lançado erro');
        } catch (error: any) {
          expect(error.error).to.equal('business-rule');
        } finally {
          Meteor.userId = originalUserId;
        }
      });
    });

    describe('Remove Notification', function () {
      let notificationId: string;

      beforeEach(async function () {
        await NotificationsCollection.removeAsync({});

        notificationId = await NotificationsCollection.insertAsync({
          userId: testUserId,
          message: 'Teste',
          createdAt: new Date(),
        });
      });

      it('deve remover notificação (soft delete)', async function () {
        const originalUserId = Meteor.userId;
        Meteor.userId = () => testUserId;

        try {
          const result = await Meteor.callAsync('notifications.remove', notificationId);

          expect(result).to.equal(1);

          const notification = await NotificationsCollection.findOneAsync({
            _id: notificationId,
          });

          expect(notification?.deletedAt).to.be.a('date');
        } finally {
          Meteor.userId = originalUserId;
        }
      });

      it('deve retornar 0 se já estiver deletada', async function () {
        const originalUserId = Meteor.userId;
        Meteor.userId = () => testUserId;

        try {
          await Meteor.callAsync('notifications.remove', notificationId);
          const result = await Meteor.callAsync('notifications.remove', notificationId);

          expect(result).to.equal(0);
        } finally {
          Meteor.userId = originalUserId;
        }
      });
    });
  });
}
