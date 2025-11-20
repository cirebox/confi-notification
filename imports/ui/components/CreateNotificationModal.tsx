import React, { useState } from 'react';

interface CreateNotificationModalProps {
  onClose: () => void;
  onSubmit: (data: { message: string }) => Promise<void>;
}

interface FormErrors {
  message?: string;
}

const CreateNotificationModal: React.FC<CreateNotificationModalProps> = ({
  onClose,
  onSubmit,
}) => {
  const [message, setMessage] = useState<string>('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!message.trim()) {
      newErrors.message = 'Mensagem é obrigatória';
    } else if (message.length < 5) {
      newErrors.message = 'Mensagem deve ter no mínimo 5 caracteres';
    } else if (message.length > 500) {
      newErrors.message = 'Mensagem deve ter no máximo 500 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({ message: message.trim() });

      // Limpar formulário após envio
      setMessage('');
      setErrors({});
    } catch (error) {
      // Erro já tratado no componente pai
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = (): void => {
    setMessage('');
    setErrors({});
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📝 Nova Notificação</h2>
          <button className="modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="message" className="form-label">
              Mensagem *
            </label>
            <textarea
              id="message"
              className={`form-textarea ${errors.message ? 'error' : ''}`}
              placeholder="Digite a mensagem da notificação"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
            />
            <div className="char-count">{message.length}/500</div>
            {errors.message && (
              <div className="error-text">{errors.message}</div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-sm"></span> Criando...
                </>
              ) : (
                '✓ Criar Notificação'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateNotificationModal;
