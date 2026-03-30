import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import {
  clearPostAuthRedirectPath,
  consumeGoogleAuthRedirect,
  getCurrentUser,
  login,
  logout,
  register,
  startGoogleAuth,
} from '../services/authService';

export type AuthMode = 'login' | 'register';

interface AuthContextValue {
  user: User | null;
  isAuthLoading: boolean;
  isAuthSubmitting: boolean;
  isLoginModalOpen: boolean;
  authMode: AuthMode;
  authError: string | null;
  authPromptMessage: string | null;
  openAuthModal: (mode?: AuthMode, promptMessage?: string | null) => void;
  closeAuthModal: () => void;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  registerWithPassword: (name: string, email: string, password: string) => Promise<void>;
  handleLogout: () => Promise<void>;
  handleGoogleAuth: (mode?: AuthMode) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authPromptMessage, setAuthPromptMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const bootstrapAuth = async () => {
      const googleRedirect = consumeGoogleAuthRedirect();
      const currentUser = await getCurrentUser();

      if (!mounted) {
        return;
      }

      setUser(currentUser);
      if (googleRedirect?.type === 'error') {
        setAuthMode(googleRedirect.mode);
        setAuthError(googleRedirect.message ?? 'Unable to continue with Google right now.');
        setAuthPromptMessage('Continue with Google again or use your email and password.');
        setIsLoginModalOpen(true);
      } else if (googleRedirect?.type === 'success' && !currentUser) {
        setAuthMode(googleRedirect.mode);
        setAuthError('Google sign-in finished, but we could not load your account. Please try again.');
        setAuthPromptMessage('Continue with Google again or use your email and password.');
        setIsLoginModalOpen(true);
      }
      setIsAuthLoading(false);
    };

    bootstrapAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const openAuthModal = (mode: AuthMode = 'login', promptMessage: string | null = null) => {
    if (!isLoginModalOpen) {
      setAuthError(null);
    }
    setAuthPromptMessage(promptMessage);
    setAuthMode(mode);
    setIsLoginModalOpen(true);
  };

  const closeAuthModal = () => {
    if (isAuthSubmitting) {
      return;
    }

    setAuthError(null);
    setAuthPromptMessage(null);
    setIsLoginModalOpen(false);
  };

  const loginWithPassword = async (email: string, password: string) => {
    setAuthPromptMessage(null);
    setAuthError(null);
    setIsAuthSubmitting(true);

    try {
      const loggedInUser = await login(email, password);
      clearPostAuthRedirectPath();
      setUser(loggedInUser);
      setIsLoginModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed.';
      setAuthError(message);
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const registerWithPassword = async (name: string, email: string, password: string) => {
    setAuthPromptMessage(null);
    setAuthError(null);
    setIsAuthSubmitting(true);

    try {
      const createdUser = await register(name, email, password);
      clearPostAuthRedirectPath();
      setUser(createdUser);
      setIsLoginModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed.';
      setAuthError(message);
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }

    setUser(null);
    setAuthError(null);
    setAuthPromptMessage(null);
    setIsLoginModalOpen(false);
    clearPostAuthRedirectPath();
  };

  const handleGoogleAuth = (mode: AuthMode = authMode) => {
    setAuthError(null);
    setAuthPromptMessage(null);
    startGoogleAuth(mode);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthLoading,
        isAuthSubmitting,
        isLoginModalOpen,
        authMode,
        authError,
        authPromptMessage,
        openAuthModal,
        closeAuthModal,
        loginWithPassword,
        registerWithPassword,
        handleLogout,
        handleGoogleAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
