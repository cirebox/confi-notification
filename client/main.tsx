import React from 'react';
import { createRoot } from 'react-dom/client';
import { Meteor } from 'meteor/meteor';
import { App } from '../imports/ui/App';

Meteor.startup(() => {
  // Aguardar o DOM estar completamente carregado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
});

function initApp() {
  try {
    // Criar o container dinamicamente se não existir
    let container = document.getElementById('react-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'react-root';
      document.body.appendChild(container);
    }

    const root = createRoot(container);
    root.render(<App />);
  } catch (error) {
    console.error('❌ Erro ao iniciar aplicação:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Erro desconhecido';
    const errorStack = error instanceof Error ? error.stack : '';

    // Criar container de erro se necessário
    let container = document.getElementById('react-root');
    if (!container) {
      container = document.createElement('div');
      container.id = 'react-root';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div style="padding: 20px; font-family: monospace; background: #ffebee; border: 1px solid #f44336; border-radius: 4px;">
        <h1 style="color: #d32f2f;">Erro ao carregar aplicação</h1>
        <pre style="color: #d32f2f;">${errorMessage}\n${errorStack}</pre>
      </div>
    `;
  }
}
