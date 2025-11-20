import React, { useState } from 'react';
import { useTracker } from 'meteor/react-meteor-data';
import { Mongo } from 'meteor/mongo';
import { NotificationsCollection } from '../../domain/entities/Notification';
import NotificationList from './NotificationList';
import CreateNotificationModal from './CreateNotificationModal';
import Toast from './Toast';

// Importar Meteor corretamente para TypeScript
import { Meteor } from 'meteor/meteor';

interface Notification {
  _id: string;
  userId: string;
  message: string;
  readAt?: Date;
  createdAt: Date;
  deletedAt?: Date;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface ToastState {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface User {
  _id: string;
  emails?: { address: string; verified: boolean }[];
  profile?: { name?: string };
}

// Collection local para metadados de paginação
const PaginationCollection = new Mongo.Collection('pagination');
// Collection local para contadores globais
const CountsCollection = new Mongo.Collection('counts');

const NotificationDashboard: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const {
    notifications,
    isLoading,
    totalUnreadGlobal,
    pagination,
    currentUser,
  } = useTracker(() => {
    const user = Meteor.user() as User | null;
    const userId = user?._id;

    if (!userId) {
      return {
        notifications: [],
        isLoading: false,
        totalUnreadGlobal: 0,
        pagination: null,
        currentUser: null,
      };
    }

    const handle = Meteor.subscribe('notifications.list', {
      page: currentPage,
      limit: 10,
    });

    const unreadHandle = Meteor.subscribe('notifications.unreadCount');

    const notifs = NotificationsCollection.find(
      { userId, deletedAt: { $exists: false } },
      { sort: { createdAt: -1 } }
    ).fetch();

    // Buscar total geral de não lidas
    const unreadGlobalDoc = CountsCollection.findOne('notifications_unread') as
      | { count: number }
      | undefined;

    // Buscar informações de paginação
    const paginationDoc = PaginationCollection.findOne(
      `notifications_${userId}`
    ) as PaginationInfo | undefined;

    return {
      notifications: notifs as Notification[],
      isLoading: !handle.ready() || !unreadHandle.ready(),
      totalUnreadGlobal: unreadGlobalDoc?.count || 0,
      pagination: paginationDoc,
      currentUser: user,
    };
  }, [currentPage, refreshTrigger]);

  const forceRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleLogout = () => {
    Meteor.logout();
    showToast('info', 'Logout realizado com sucesso!');
  };

  const showToast = (type: ToastState['type'], message: string): void => {
    setToast({ type, message });
  };

  const handleCreateNotification = async (data: {
    message: string;
  }): Promise<void> => {
    try {
      await Meteor.callAsync('notifications.create', {
        ...data,
      });
      showToast('success', 'Notificação criada com sucesso');
      setIsCreateModalOpen(false);
      forceRefresh();
    } catch (error: unknown) {
      const meteorError = error as { reason?: string; message?: string };
      showToast(
        'error',
        meteorError.reason || meteorError.message || 'Erro ao criar notificação'
      );
    }
  };

  const handleMarkAsRead = async (notificationId: string): Promise<void> => {
    try {
      await Meteor.callAsync('notifications.markAsRead', notificationId);
      showToast('success', 'Notificação marcada como lida');
      forceRefresh();
    } catch (error: unknown) {
      const meteorError = error as { reason?: string; message?: string };
      showToast(
        'error',
        meteorError.reason ||
          meteorError.message ||
          'Erro ao marcar notificação como lida'
      );
    }
  };

  const handleDelete = async (notificationId: string): Promise<void> => {
    try {
      await Meteor.callAsync('notifications.remove', notificationId);
      showToast('info', 'Notificação removida com sucesso');
      forceRefresh();
    } catch (error: unknown) {
      const meteorError = error as { reason?: string; message?: string };
      showToast(
        'error',
        meteorError.reason ||
          meteorError.message ||
          'Erro ao remover notificação'
      );
    }
  };

  return (
    <div className="container">
      <div className="header">
        <div className="header-title">
          <span className="header-icon">🔔</span>
          <h1>Sistema de Notificações</h1>
        </div>
        <div className="badge">{totalUnreadGlobal} não lidas</div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Total de Notificações</div>
          <div className="stat-number">
            {pagination?.total || notifications.length}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Não Lidas</div>
          <div className="stat-number">{totalUnreadGlobal}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Usuário Atual</div>
          <div className="stat-number-small">
            {currentUser?.emails?.[0]?.address || 'Não logado'}
          </div>
          <div className="stat-help">Email do usuário</div>
        </div>
      </div>

      <div className="button-group">
        <button
          className="btn btn-primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          ➕ Nova Notificação
        </button>
        <button
          className="btn btn-outline"
          onClick={() => {
            setCurrentPage(1);
            forceRefresh();
          }}
        >
          🔄 Atualizar
        </button>
        <button className="btn btn-danger" onClick={handleLogout}>
          🚪 Logout
        </button>
      </div>

      <div className="notification-container">
        <NotificationList
          notifications={notifications}
          isLoading={isLoading}
          onMarkAsRead={handleMarkAsRead}
          onDelete={handleDelete}
        />

        {notifications.length > 0 && (
          <div className="pagination">
            <button
              className="btn btn-outline"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              title="Ir para primeira página"
            >
              ⇤ Primeira
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ← Anterior
            </button>
            <span className="pagination-info">
              Página {currentPage} de {pagination?.totalPages || 1}
            </span>
            <button
              className="btn btn-outline"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={!pagination?.hasMore}
            >
              Próxima →
            </button>
            <button
              className="btn btn-outline"
              onClick={() => setCurrentPage(pagination?.totalPages || 1)}
              disabled={currentPage === (pagination?.totalPages || 1)}
              title="Ir para última página"
            >
              Última ⇥
            </button>
          </div>
        )}
      </div>

      {isCreateModalOpen && (
        <CreateNotificationModal
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={handleCreateNotification}
        />
      )}

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  );
};

export default NotificationDashboard;
