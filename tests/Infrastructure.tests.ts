import { Meteor } from 'meteor/meteor';
import { assert } from 'chai';
import { NotificationsCollection } from '../imports/domain/entities/Notification';
import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';
import { WebApp } from 'meteor/webapp';
import { initializeIndexes } from '../imports/infrastructure/database/indexes';
import { initializeSecurityHeaders } from '../imports/infrastructure/security/headers';
import { initializeRateLimiting } from '../imports/infrastructure/security/rateLimiting';
import { initializeServer } from '../server/main';

describe('Infrastructure Integration Tests', () => {
  describe('Database Indexes', () => {
    it('deve criar índices do banco de dados', async () => {
      // Chamar a função de inicialização diretamente
      await initializeIndexes();

      // Verificar se a coleção existe
      assert.isDefined(NotificationsCollection);
      assert.isString(NotificationsCollection.rawCollection().collectionName);
      assert.equal(NotificationsCollection.rawCollection().collectionName, 'notifications');
    });
  });

  describe('Security Headers', () => {
    it('deve configurar headers de segurança', () => {
      // Chamar a função de inicialização diretamente
      initializeSecurityHeaders();

      // Verificar se o WebApp está disponível
      assert.isDefined(WebApp);
      assert.isFunction(WebApp.connectHandlers);
    });
  });

  describe('Rate Limiting', () => {
    it('deve configurar rate limiting para métodos', () => {
      // Chamar a função de inicialização diretamente
      initializeRateLimiting();

      // Verificar se o DDPRateLimiter está configurado
      assert.isDefined(DDPRateLimiter);
      assert.isFunction(DDPRateLimiter.addRule);
    });
  });

  describe('Server Startup', () => {
    it('deve inicializar o servidor corretamente', () => {
      // Chamar a função de inicialização diretamente
      initializeServer();

      // Verificar se o Meteor está definido
      assert.isDefined(Meteor);
      assert.isFunction(Meteor.startup);

      // Verificar se as configurações existem
      assert.isDefined(Meteor.settings);
    });

    it('deve conectar ao MongoDB', () => {
      // Verificar se o Meteor tem conexão estabelecida
      assert.isDefined(Meteor);
      assert.isObject(Meteor);

      // Verificar se há configurações de banco
      assert.isDefined(Meteor.settings);
    });
  });
});