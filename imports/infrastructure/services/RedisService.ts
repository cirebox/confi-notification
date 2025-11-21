import { createClient, RedisClientType } from 'redis';
import { Meteor } from 'meteor/meteor';

class RedisService {
  private client: RedisClientType | null = null;
  private isConnected = false;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis() {
    try {
      // Configurações do Redis do Meteor.settings
      const redisConfig = Meteor.settings.redis || {};
      const host = redisConfig.host || process.env.REDIS_HOST || 'localhost';
      const port =
        redisConfig.port || parseInt(process.env.REDIS_PORT || '6379');
      const password =
        redisConfig.password || process.env.REDIS_PASSWORD || undefined;
      const database = redisConfig.db || parseInt(process.env.REDIS_DB || '0');

      // Conectar ao Redis
      this.client = createClient({
        socket: {
          host,
          port,
        },
        password,
        database,
      });

      this.client.on('connect', () => {
        console.log('✅ Redis conectado');
        this.isConnected = true;
      });

      this.client.on('error', (err: Error) => {
        console.error('❌ Erro no Redis:', err);
        this.isConnected = false;
      });

      this.client.on('ready', () => {
        console.log('🚀 Redis pronto para uso');
      });

      // Conectar
      await this.client.connect();

      // Testar conexão
      await this.client.ping();
    } catch (error) {
      console.error('❌ Falha ao conectar ao Redis:', error);
      // Fallback: continuar sem Redis (usar MongoDB)
      this.isConnected = false;
    }
  }

  /**
   * Incrementa o contador de notificações não lidas para um usuário
   */
  async incrementUnreadCount(userId: string): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis não disponível, pulando atualização do contador');
      return;
    }

    try {
      const key = `user:${userId}:unread_count`;
      await this.client.incr(key);
      console.log(`📈 Contador incrementado para usuário ${userId}`);
    } catch (error) {
      console.error('❌ Erro ao incrementar contador Redis:', error);
    }
  }

  /**
   * Decrementa o contador de notificações não lidas para um usuário
   */
  async decrementUnreadCount(userId: string): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis não disponível, pulando atualização do contador');
      return;
    }

    try {
      const key = `user:${userId}:unread_count`;
      const currentValue = await this.client.get(key);

      if (currentValue && parseInt(currentValue) > 0) {
        await this.client.decr(key);
        console.log(`📉 Contador decrementado para usuário ${userId}`);
      }
    } catch (error) {
      console.error('❌ Erro ao decrementar contador Redis:', error);
    }
  }

  /**
   * Define o contador de notificações não lidas para um usuário
   */
  async setUnreadCount(userId: string, count: number): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis não disponível, pulando atualização do contador');
      return;
    }

    try {
      const key = `user:${userId}:unread_count`;
      await this.client.set(key, count.toString());
      console.log(`📊 Contador definido para ${count} para usuário ${userId}`);
    } catch (error) {
      console.error('❌ Erro ao definir contador Redis:', error);
    }
  }

  /**
   * Obtém o contador de notificações não lidas para um usuário
   */
  async getUnreadCount(userId: string): Promise<number> {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis não disponível, retornando 0');
      return 0;
    }

    try {
      const key = `user:${userId}:unread_count`;
      const value = await this.client.get(key);
      const count = value ? parseInt(value) : 0;
      console.log(`📊 Contador obtido: ${count} para usuário ${userId}`);
      return count;
    } catch (error) {
      console.error('❌ Erro ao obter contador Redis:', error);
      return 0;
    }
  }

  /**
   * Remove o contador de notificações não lidas para um usuário
   */
  async removeUnreadCount(userId: string): Promise<void> {
    if (!this.isConnected || !this.client) {
      console.warn('⚠️ Redis não disponível, pulando remoção do contador');
      return;
    }

    try {
      const key = `user:${userId}:unread_count`;
      await this.client.del(key);
      console.log(`🗑️ Contador removido para usuário ${userId}`);
    } catch (error) {
      console.error('❌ Erro ao remover contador Redis:', error);
    }
  }

  /**
   * Sincroniza o contador Redis com o MongoDB (usar em inicialização ou recuperação)
   */
  async syncUnreadCountWithMongoDB(
    userId: string,
    mongoCount: number
  ): Promise<void> {
    if (!this.isConnected || !this.client) {
      return;
    }

    try {
      await this.setUnreadCount(userId, mongoCount);
      console.log(
        `🔄 Contador sincronizado com MongoDB para usuário ${userId}: ${mongoCount}`
      );
    } catch (error) {
      console.error('❌ Erro ao sincronizar contador Redis:', error);
    }
  }

  /**
   * Verifica se o Redis está conectado
   */
  isRedisConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Fecha a conexão com Redis
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
      console.log('🔌 Conexão Redis fechada');
    }
  }
}

// Singleton instance
const redisService = new RedisService();

export default redisService;
