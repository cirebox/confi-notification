import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import '../imports/domain/entities/Notification';
import '../imports/api/methods/notificationMethods';
import '../imports/api/publications/notificationPublications';
import '../imports/api/restEndpoints'; // Adicionar endpoints REST
import '../imports/infrastructure/database/indexes';
import '../imports/infrastructure/security/rateLimiting';
import '../imports/infrastructure/security/headers';
import { seedNotifications } from '../imports/startup/server/seeds'; // Adicionar seeds
import redisService from '../imports/infrastructure/services/RedisService';
import { NotificationRepositoryWithRedis } from '../imports/infrastructure/repositories/NotificationRepositoryWithRedis';

// Configurar Accounts
Accounts.config({
  forbidClientAccountCreation: false, // Permitir criação de conta no cliente
  loginExpirationInDays: 30,
  passwordResetTokenExpirationInDays: 3,
  passwordEnrollTokenExpirationInDays: 30,
});

// Validação de novos usuários (opcional)
Accounts.validateNewUser(() => {
  // Você pode adicionar validações customizadas aqui
  return true;
});

// Log de tentativas de login (para debug)
Accounts.onLogin((loginInfo: { user?: Meteor.User; connection?: unknown }) => {
  console.log('✅ Login bem-sucedido:', loginInfo.user?.emails?.[0]?.address);
});

Accounts.onLoginFailure(
  (loginInfo: {
    user?: Meteor.User;
    connection?: unknown;
    error?: { reason?: string };
    allowed?: boolean;
    type?: string;
    methodName?: string;
  }) => {
    console.log('❌ Falha no login:', {
      error: loginInfo.error?.reason,
      allowed: loginInfo.allowed,
      type: loginInfo.type,
      methodName: loginInfo.methodName,
    });
  }
);

export const initializeServer = () => {
  console.log('🚀 Servidor iniciado');
  console.log(`✓ MongoDB: ${Meteor.settings.private?.MONGO_URL || 'padrão'}`);
};

const syncRedisCounters = async () => {
  try {
    console.log('🔄 Sincronizando contadores Redis com MongoDB...');

    const repository = new NotificationRepositoryWithRedis();

    // Obter todos os usuários que têm notificações
    const userIds = await Meteor.users
      .find({}, { fields: { _id: 1 } })
      .mapAsync((user) => user._id);

    for (const userId of userIds) {
      await repository.syncUnreadCountWithMongoDB(userId);
    }

    console.log('✅ Contadores Redis sincronizados');
  } catch (error) {
    console.error('❌ Erro ao sincronizar contadores Redis:', error);
  }
};

Meteor.startup(async () => {
  initializeServer();
  await seedNotifications(); // Executar seeds na inicialização

  // Aguardar um pouco para garantir que o Redis esteja conectado
  setTimeout(async () => {
    if (redisService.isRedisConnected()) {
      await syncRedisCounters();
    } else {
      console.log(
        '⚠️ Redis não disponível, pulando sincronização de contadores'
      );
    }
  }, 2000);
});
