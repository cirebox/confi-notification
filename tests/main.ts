import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import { expect } from 'chai';
import { NotificationsCollection } from '../domain/entities/Notification';
import '../api/methods/notificationMethods';

if (Meteor.isServer) {
  describe('Notification System - Use Cases', function () {
    describe('Create Notification', function () {
      beforeEach(async function () {
        await NotificationsCollection.removeAsync({});
      });

      it('deve criar notificação com dados válidos', async function () {
        const userId = Random.id();
        const message = 'Teste de notificação';

        const notificationId = await Meteor.callAsync('notifications.create', {
          userId,
          message,
        });

        expect(notificationId).to.be.a('string');

        const notification = await NotificationsCollection.findOneAsync({
          _id: notificationId,
        });

        expect(notification).to.exist;
        expect(notification?.userId).to.equal(userId);
        expect(notification?.message).to.equal(message);
        expect(notification?.createdAt).to.be.a('date');
      });

      it('deve rejeitar userId vazio', async function () {
        try {
          await Meteor.callAsync('notifications.create', {
            userId: '',
            message: 'Teste',
          });
          throw new Error('Deveria ter lançado erro');
        } catch (error: any) {
          expect(error.error).to.equal('validation-error');
        }
      });

      it('deve rejeitar message vazia', async function () {
        try {
          await Meteor.callAsync('notifications.create', {
            userId: Random.id(),
            message: '',
          });
          throw new Error('Deveria ter lançado erro');
        } catch (error: any) {
          expect(error.error).to.equal('validation-error');
        }
      });

      it('deve rejeitar message com mais de 500 caracteres', async function () {
        try {
          await Meteor.callAsync('notifications.create', {
            userId: Random.id(),
            message: 'a'.repeat(501),
          });
          throw new Error('Deveria ter lançado erro');
        } catch (error: any) {
          expect(error.error).to.equal('validation-error');
        }
      });
    });

    describe('Mark Notification As Read', function () {
      let notificationId: string;

      beforeEach(async function () {
        await NotificationsCollection.removeAsync({});

        notificationId = await NotificationsCollection.insertAsync({
          userId: Random.id(),
          message: 'Teste',
          createdAt: new Date(),
        });
      });

      it('deve marcar notificação como lida', async function () {
        const result = await Meteor.callAsync('notifications.markAsRead', notificationId);

        expect(result).to.equal(1);

        const notification = await NotificationsCollection.findOneAsync({
          _id: notificationId,
        });

        expect(notification?.readAt).to.be.a('date');
      });

      it('deve retornar 0 se já estiver lida', async function () {
        await Meteor.callAsync('notifications.markAsRead', notificationId);
        const result = await Meteor.callAsync('notifications.markAsRead', notificationId);

        expect(result).to.equal(0);
      });

      it('deve rejeitar ID inválido', async function () {
        try {
          await Meteor.callAsync('notifications.markAsRead', '');
          throw new Error('Deveria ter lançado erro');
        } catch (error: any) {
          expect(error.error).to.equal('validation-error');
        }
      });

      it('deve rejeitar notificação inexistente', async function () {
        try {
          await Meteor.callAsync('notifications.markAsRead', 'inexistente');
          throw new Error('Deveria ter lançado erro');
        } catch (error: any) {
          expect(error.error).to.equal('not-found');
        }
      });

      it('deve rejeitar notificação deletada', async function () {
        await NotificationsCollection.updateAsync(
          { _id: notificationId },
          { $set: { deletedAt: new Date() } }
        );

        try {
          await Meteor.callAsync('notifications.markAsRead', notificationId);
          throw new Error('Deveria ter lançado erro');
        } catch (error: any) {
          expect(error.error).to.equal('business-rule');
        }
      });
    });

    describe('Remove Notification', function () {
      let notificationId: string;

      beforeEach(async function () {
        await NotificationsCollection.removeAsync({});

        notificationId = await NotificationsCollection.insertAsync({
          userId: Random.id(),
          message: 'Teste',
          createdAt: new Date(),
        });
      });

      it('deve remover notificação (soft delete)', async function () {
        const result = await Meteor.callAsync('notifications.remove', notificationId);

        expect(result).to.equal(1);

        const notification = await NotificationsCollection.findOneAsync({
          _id: notificationId,
        });

        expect(notification?.deletedAt).to.be.a('date');
      });

      it('deve retornar 0 se já estiver deletada', async function () {
        await Meteor.callAsync('notifications.remove', notificationId);
        const result = await Meteor.callAsync('notifications.remove', notificationId);

        expect(result).to.equal(0);
      });
    });
  });
}
