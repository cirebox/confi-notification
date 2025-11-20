import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Notification {
  _id: string;
  userId: string;
  message: string;
  readAt?: Date;
  createdAt: Date;
  deletedAt?: Date;
}

interface NotificationListProps {
  notifications: Notification[];
  isLoading: boolean;
  onMarkAsRead: (notificationId: string) => Promise<void>;
  onDelete: (notificationId: string) => Promise<void>;
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  isLoading,
  onMarkAsRead,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Carregando notificações...</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📭</div>
        <div className="empty-title">Nenhuma notificação encontrada</div>
        <div className="empty-text">Crie uma nova notificação para começar</div>
      </div>
    );
  }

  return (
    <div className="notification-list">
      {notifications.map((notification) => {
        const isUnread = !notification.readAt;
        const timeAgo = formatDistanceToNow(notification.createdAt, {
          addSuffix: true,
          locale: ptBR,
        });

        return (
          <div
            key={notification._id}
            className={`notification-item ${isUnread ? 'unread' : 'read'}`}
          >
            <div className="notification-content">
              <div className="notification-header">
                {isUnread && (
                  <span className="notification-badge-new">Nova</span>
                )}
                <span className="notification-time">🕐 {timeAgo}</span>
              </div>

              <div
                className={`notification-message ${isUnread ? 'unread' : 'read'}`}
              >
                {notification.message}
              </div>

              <div className="notification-id">ID: {notification._id}</div>
            </div>

            <div className="notification-actions">
              {isUnread && (
                <button
                  className="icon-btn icon-btn-success"
                  onClick={() => onMarkAsRead(notification._id)}
                  title="Marcar como lida"
                >
                  ✓
                </button>
              )}
              <button
                className="icon-btn icon-btn-danger"
                onClick={() => onDelete(notification._id)}
                title="Remover"
              >
                🗑️
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationList;
