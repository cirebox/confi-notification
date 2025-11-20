import { NotificationsCollection } from '../../domain/entities/Notification';
import { Accounts } from 'meteor/accounts-base';

export const seedNotifications = async (): Promise<void> => {
  console.log('🌱 Verificando seeds...');

  // Buscar usuário demo diretamente no banco (usando async)
  let demoUser = await Meteor.users.findOneAsync({
    'emails.address': 'demo@example.com',
  });

  if (!demoUser) {
    try {
      const demoUserId = Accounts.createUser({
        email: 'demo@example.com',
        password: 'demo',
        profile: { name: 'Usuário Demo' },
      });
      console.log('✅ Usuário demo criado com ID:', demoUserId);
      demoUser = await Meteor.users.findOneAsync(demoUserId);

      if (!demoUser) {
        console.error('❌ Usuário criado mas não encontrado no banco');
        return;
      }
    } catch (error: any) {
      console.error('❌ Erro ao criar usuário demo:', error.message);
      // Tentar buscar novamente
      demoUser = await Meteor.users.findOneAsync({
        'emails.address': 'demo@example.com',
      });
    }
  } else {
    console.log('ℹ️  Usuário demo já existe com ID:', demoUser._id);
  }

  if (!demoUser || !demoUser._id) {
    console.error('❌ Não foi possível obter/criar usuário demo');
    return;
  }

  const userId = demoUser._id;
  console.log('✅ Usando userId para seeds:', userId);

  // Verificar se já existem notificações para o usuário demo
  const existingCount = await NotificationsCollection.find({
    userId,
    deletedAt: { $exists: false },
  }).countAsync();

  if (existingCount >= 30) {
    console.log(
      `ℹ️  Seeds já executados - ${existingCount} notificações existentes para o usuário demo`
    );
    return;
  }

  // Migrar notificações antigas para o usuário demo (se houver)
  const oldNotifications = NotificationsCollection.find({
    userId: 'user-demo-001',
  }).fetch();
  if (oldNotifications.length > 0) {
    console.log(
      `🔄 Migrando ${oldNotifications.length} notificações antigas para usuário demo...`
    );
    for (const notif of oldNotifications) {
      await NotificationsCollection.updateAsync(notif._id, {
        $set: { userId },
      });
    }
    console.log('✅ Notificações migradas');
  }
  const messages: string[] = [
    'Bem-vindo ao sistema de notificações!',
    'Sua conta foi verificada com sucesso.',
    'Novo recurso disponível: Dashboard aprimorado.',
    'Lembrete: Atualize suas preferências.',
    'Notificação de teste enviada.',
    'Sistema atualizado para versão 2.0.',
    'Convite para participar do evento.',
    'Pagamento processado com sucesso.',
    'Sua senha foi alterada.',
    'Novo comentário em seu post.',
    'Solicitação de amizade aceita.',
    'Evento cancelado devido ao mau tempo.',
    'Cupom de desconto disponível.',
    'Relatório mensal gerado.',
    'Backup concluído com sucesso.',
    'Nova mensagem recebida.',
    'Atualização de segurança aplicada.',
    'Perfil atualizado com sucesso.',
    'Convite para webinar aceito.',
    'Notificação de manutenção programada.',
    'Pontos de fidelidade creditados.',
    'Pedido enviado para entrega.',
    'Avaliação pendente aguardando resposta.',
    'Novo follower no seu perfil.',
    'Atualização de política de privacidade.',
    'Certificado emitido com sucesso.',
    'Reunião agendada para amanhã.',
    'Arquivo compartilhado com você.',
    'Notificação de aniversário.',
    'Sistema offline para manutenção.',
  ];

  console.log(
    `🌱 Executando seeds de notificações para usuário demo (${userId})...`
  );

  // Gerar 30 notificações
  for (let i = 0; i < 30; i++) {
    const isRead = Math.random() < 0.5; // 50% chance de ser lida
    const createdAt = new Date(
      Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000
    ); // Últimos 30 dias
    const readAt = isRead
      ? new Date(
          createdAt.getTime() +
            Math.random() * (Date.now() - createdAt.getTime())
        )
      : undefined;

    await NotificationsCollection.insertAsync({
      userId,
      message: messages[i % messages.length], // Reutilizar mensagens se necessário
      createdAt,
      readAt,
      deletedAt: undefined,
    });
  }

  console.log(
    `✅ Seeds executados - 30 notificações criadas para o usuário demo (${userId})`
  );
};
