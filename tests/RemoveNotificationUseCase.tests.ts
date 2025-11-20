import { expect } from 'chai';
import { RemoveNotificationUseCase } from '../imports/application/usecases/RemoveNotificationUseCase';
import { NotificationRepository } from '../imports/infrastructure/repositories/NotificationRepository';
import { NotFoundError, ValidationError } from '../imports/domain/errors/DomainErrors';
import { Meteor } from 'meteor/meteor';

if (Meteor.isServer) {
  // Mock do Meteor para testes
  const originalUserId = Meteor.userId;
  Meteor.userId = () => 'user123';

  describe('RemoveNotificationUseCase', function () {
    let useCase: RemoveNotificationUseCase;
    let repository: NotificationRepository;
    let notificationId: string;

    beforeEach(async function () {
      repository = new NotificationRepository();
      useCase = new RemoveNotificationUseCase(repository);

      // Criar notificação de teste
      notificationId = await repository.create('user123', 'Test notification');
    });

    after(function () {
      // Restaurar o método original
      Meteor.userId = originalUserId;
    });

    it('deve remover notificação (soft delete)', async function () {
      const result = await useCase.execute(notificationId);

      expect(result).to.equal(1);

      const notification = await repository.findById(notificationId);
      expect(notification?.deletedAt).to.be.a('date');
    });

    it('deve retornar 0 se notificação já estiver deletada', async function () {
      // Deletar pela primeira vez
      await useCase.execute(notificationId);

      // Tentar deletar novamente
      const result = await useCase.execute(notificationId);

      expect(result).to.equal(0);
    });

    it('deve rejeitar ID inválido', async function () {
      try {
        await useCase.execute('');
        throw new Error('Deveria ter lançado erro');
      } catch (error: any) {
        expect(error).to.be.instanceOf(ValidationError);
        expect(error.message).to.include('ID da notificação é obrigatório');
      }
    });

    it('deve rejeitar notificação inexistente', async function () {
      try {
        await useCase.execute('inexistente');
        throw new Error('Deveria ter lançado erro');
      } catch (error: any) {
        expect(error).to.be.instanceOf(NotFoundError);
        expect(error.message).to.equal('Notificação não encontrada');
      }
    });
  });
}