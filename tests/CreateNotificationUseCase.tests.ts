import { expect } from 'chai';
import { CreateNotificationUseCase } from '../imports/application/usecases/CreateNotificationUseCase';
import { NotificationRepository } from '../imports/infrastructure/repositories/NotificationRepository';
import { ValidationError } from '../imports/domain/errors/DomainErrors';

if (Meteor.isServer) {
  describe('CreateNotificationUseCase', function () {
    let useCase: CreateNotificationUseCase;
    let repository: NotificationRepository;

    beforeEach(function () {
      repository = new NotificationRepository();
      useCase = new CreateNotificationUseCase(repository);
    });

    it('deve criar notificação com dados válidos', async function () {
      const userId = 'user123';
      const message = 'Mensagem de teste';

      const result = await useCase.execute(userId, message);

      expect(result).to.be.a('string');
      expect(result).to.have.length.greaterThan(0);
    });

    it('deve rejeitar userId vazio', async function () {
      try {
        await useCase.execute('', 'Mensagem válida');
        throw new Error('Deveria ter lançado erro');
      } catch (error: any) {
        expect(error).to.be.instanceOf(ValidationError);
        expect(error.message).to.include('userId é obrigatório');
      }
    });

    it('deve rejeitar message vazia', async function () {
      try {
        await useCase.execute('user123', '');
        throw new Error('Deveria ter lançado erro');
      } catch (error: any) {
        expect(error).to.be.instanceOf(ValidationError);
        expect(error.message).to.include('message é obrigatório');
      }
    });

    it('deve rejeitar message com mais de 500 caracteres', async function () {
      const longMessage = 'a'.repeat(501);

      try {
        await useCase.execute('user123', longMessage);
        throw new Error('Deveria ter lançado erro');
      } catch (error: any) {
        expect(error).to.be.instanceOf(ValidationError);
        expect(error.message).to.include('não pode exceder 500 caracteres');
      }
    });

    it('deve sanitizar userId e message', async function () {
      const userId = '  user123  ';
      const message = '  Mensagem com espaços  ';

      const result = await useCase.execute(userId, message);

      expect(result).to.be.a('string');

      // Verificar se foi sanitizado no repositório
      const notification = await repository.findById(result);
      expect(notification?.userId).to.equal('user123');
      expect(notification?.message).to.equal('Mensagem com espaços');
    });
  });
}