import { DDPRateLimiter } from 'meteor/ddp-rate-limiter';

const RATE_LIMIT_REQUESTS = 10;
const RATE_LIMIT_INTERVAL = 1000;

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

console.log('✓ Rate limiting configurado');
