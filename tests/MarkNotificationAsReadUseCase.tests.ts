import { expect } from 'chai';
import { MarkNotificationAsReadUseCase } from '../imports/application/usecases/MarkNotificationAsReadUseCase';
import { NotificationRepository } from '../imports/infrastructure/repositories/NotificationRepository';
import { NotFoundError, BusinessRuleError, ValidationError } from '../imports/domain/errors/DomainErrors';

if (Meteor.isServer) {
  describe('MarkNotificationAsReadUseCase', function () {
    let useCase: MarkNotificationAsReadUseCase;
    let repository: NotificationRepository;
    let notificationId: string;

    beforeEach(async function () {
      repository = new NotificationRepository();
      useCase = new MarkNotificationAsReadUseCase(repository);

      // Criar notificação de teste
      notificationId = await repository.create('user123', 'Test notification');
    });

    it('deve marcar notificação como lida', async function () {
      const result = await useCase.execute(notificationId);

      expect(result).to.equal(1);

      const notification = await repository.findById(notificationId);
      expect(notification?.readAt).to.be.a('date');
    });

    it('deve retornar 0 se notificação já estiver lida', async function () {
      // Marcar como lida pela primeira vez
      await useCase.execute(notificationId);

      // Tentar marcar novamente
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

    it('deve rejeitar notificação deletada', async function () {
      // Deletar notificação
      await repository.softDelete(notificationId);

      try {
        await useCase.execute(notificationId);
        throw new Error('Deveria ter lançado erro');
      } catch (error: any) {
        expect(error).to.be.instanceOf(BusinessRuleError);
        expect(error.message).to.equal('Não é possível marcar como lida uma notificação deletada');
      }
    });
  });
}