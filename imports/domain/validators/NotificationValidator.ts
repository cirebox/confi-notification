import { ValidationError } from '../errors/DomainErrors';

export class NotificationValidator {
  static validateCreate(userId: string, message: string): void {
    const errors: string[] = [];

    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      errors.push('userId é obrigatório e não pode estar vazio');
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      errors.push('message é obrigatório e não pode estar vazio');
    }

    if (message && message.length > 500) {
      errors.push('message não pode exceder 500 caracteres');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join('; '));
    }
  }

  static validateId(id: string): void {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new ValidationError('ID da notificação é obrigatório');
    }
  }

  static validatePagination(page: number, limit: number): { page: number; limit: number; skip: number } {
    const safePage = Math.max(1, parseInt(String(page)) || 1);
    const safeLimit = Math.min(100, Math.max(1, parseInt(String(limit)) || 10));

    return {
      page: safePage,
      limit: safeLimit,
      skip: (safePage - 1) * safeLimit,
    };
  }

  static sanitizeString(str: string): string {
    return typeof str === 'string' ? str.trim() : '';
  }
}
