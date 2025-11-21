import React, { useState } from 'react';
import { Meteor } from 'meteor/meteor';

const LoginPage: React.FC = () => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authForm, setAuthForm] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (authMode === 'register') {
        // Registrar novo usuário
        await new Promise<void>((resolve, reject) => {
          Meteor.call(
            'auth.register',
            authForm.email,
            authForm.password,
            { name: authForm.name },
            (error: Meteor.Error | undefined) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            }
          );
        });

        // Após registrar, fazer login automático
        await new Promise<void>((resolve, reject) => {
          Meteor.loginWithPassword(
            authForm.email,
            authForm.password,
            (error: Meteor.Error | undefined) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            }
          );
        });
      } else {
        // Login direto
        await new Promise<void>((resolve, reject) => {
          Meteor.loginWithPassword(
            authForm.email,
            authForm.password,
            (error: Meteor.Error | undefined) => {
              if (error) {
                reject(error);
              } else {
                resolve();
              }
            }
          );
        });
      }
    } catch (error) {
      const errorMessage =
        error && typeof error === 'object' && 'reason' in error
          ? String(error.reason)
          : error instanceof Error
            ? error.message
            : 'Erro na autenticação';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await new Promise<void>((resolve, reject) => {
        Meteor.loginWithPassword('demo@example.com', 'demo', (error: Meteor.Error | undefined) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      const errorMessage =
        error && typeof error === 'object' && 'reason' in error
          ? String(error.reason)
          : 'Erro no login demo';
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <span className="header-icon">🔔</span>
          <h1>Sistema de Notificações</h1>
          <p className="login-subtitle">
            Faça login para acessar suas notificações
          </p>
        </div>

        <div className="login-card">
          <div className="login-tabs">
            <button
              className={`tab ${authMode === 'login' ? 'active' : ''}`}
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              className={`tab ${authMode === 'register' ? 'active' : ''}`}
              onClick={() => setAuthMode('register')}
            >
              Registrar
            </button>
          </div>

          <form onSubmit={handleAuth} className="login-form">
            {authMode === 'register' && (
              <div className="form-group">
                <label htmlFor="name">Nome</label>
                <input
                  id="name"
                  type="text"
                  value={authForm.name}
                  onChange={(e) =>
                    setAuthForm({ ...authForm, name: e.target.value })
                  }
                  placeholder="Seu nome"
                  required
                  disabled={loading}
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={authForm.email}
                onChange={(e) =>
                  setAuthForm({ ...authForm, email: e.target.value })
                }
                placeholder="seu@email.com"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                value={authForm.password}
                onChange={(e) =>
                  setAuthForm({ ...authForm, password: e.target.value })
                }
                placeholder="Sua senha"
                required
                disabled={loading}
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
            >
              {loading
                ? '⏳ Processando...'
                : authMode === 'login'
                  ? '🔐 Entrar'
                  : '📝 Criar Conta'}
            </button>
          </form>

          <div className="login-divider">ou</div>

          <button
            className="btn btn-secondary btn-block"
            onClick={handleDemoLogin}
            disabled={loading}
          >
            🎭 Login com Usuário Demo
          </button>

          <div className="demo-info">
            <p>
              <strong>Usuário Demo:</strong>
            </p>
            <p>Email: demo@example.com</p>
            <p>Senha: demo</p>
            <p className="demo-note">
              30 notificações já criadas para demonstração
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
