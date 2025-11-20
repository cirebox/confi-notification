import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

export const initializeRateLimiting = () => {
  const RATE_LIMIT_REQUESTS = 10;
  const RATE_LIMIT_INTERVAL = 1000;

  // Rate limiting para métodos de notificação
  DDPRateLimiter.addRule(
    {
      type: 'method',
      name: 'notifications.create',
    },
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_INTERVAL
  );

  DDPRateLimiter.addRule(
    {
      type: 'method',
      name: 'notifications.markAsRead',
    },
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_INTERVAL
  );

  DDPRateLimiter.addRule(
    {
      type: 'method',
      name: 'notifications.remove',
    },
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_INTERVAL
  );

  // Rate limiting mais generoso para login/registro
  DDPRateLimiter.addRule(
    {
      type: 'method',
      name: 'login',
    },
    5,
    5000 // 5 tentativas a cada 5 segundos
  );

  DDPRateLimiter.addRule(
    {
      type: 'method',
      name: 'auth.register',
    },
    5,
    10000 // 5 registros a cada 10 segundos
  );

  console.log('✓ Rate limiting configurado');
};

initializeRateLimiting();
