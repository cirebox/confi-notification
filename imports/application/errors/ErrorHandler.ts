import { Meteor } from 'meteor/meteor';

export enum ErrorCode {
  VALIDATION_ERROR = 'validation-error',
  NOT_FOUND = 'not-found',
  BUSINESS_RULE = 'business-rule',
  INTERNAL_ERROR = 'internal-error',
}

export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
}

const ERROR_STATUS_MAP: Record<ErrorCode, HttpStatus> = {
  [ErrorCode.VALIDATION_ERROR]: HttpStatus.BAD_REQUEST,
  [ErrorCode.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorCode.BUSINESS_RULE]: HttpStatus.CONFLICT,
  [ErrorCode.INTERNAL_ERROR]: HttpStatus.INTERNAL_SERVER_ERROR,
};

export class ErrorHandler {
  static createMeteorError(code: ErrorCode, message: string): Meteor.Error {
    const error = new Meteor.Error(code, message);
    (error as any).statusCode = ERROR_STATUS_MAP[code];
    return error;
  }

  static handleDomainError(error: Error): never {
    switch (error.name) {
      case 'ValidationError':
        throw this.createMeteorError(ErrorCode.VALIDATION_ERROR, error.message);
      case 'NotFoundError':
        throw this.createMeteorError(ErrorCode.NOT_FOUND, error.message);
      case 'BusinessRuleError':
        throw this.createMeteorError(ErrorCode.BUSINESS_RULE, error.message);
      default:
        console.error('Erro inesperado:', error);
        throw this.createMeteorError(
          ErrorCode.INTERNAL_ERROR,
          'Erro interno do servidor'
        );
    }
  }
}
