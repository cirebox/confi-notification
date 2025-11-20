import React from 'react';
import { useTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import NotificationDashboard from './components/NotificationDashboard';
import LoginPage from './components/LoginPage';
import './styles.css';

export const App = () => {
  const { isLoggedIn, isLoading } = useTracker(() => {
    const user = Meteor.user();
    const loggingIn = Meteor.loggingIn();

    return {
      isLoggedIn: !!user,
      isLoading: loggingIn,
    };
  }, []);

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {isLoggedIn ? <NotificationDashboard /> : <LoginPage />}
    </div>
  );
};
