
import React, { useState } from 'react';
import { AppView, User } from '../types';
import GoogleIcon from './GoogleIcon';

interface NavbarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  cartCount: number;
  wishlistCount: number;
  user: User | null;
  isAuthLoading: boolean;
  onLogin: () => void;
  onRegister: () => void;
  onGoogle: () => void;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setView,
  cartCount,
  wishlistCount,
  user,
  isAuthLoading,
  onLogin,
  onRegister,
  onGoogle,
  onLogout,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: { label: string; view: AppView }[] = user
    ? [
        { label: 'Shop', view: 'shop' },
      ]
    : [
        { label: 'Home', view: 'home' },
        { label: 'Shop', view: 'shop' },
      ];

  if (user?.role === 'admin') {
    navItems.push({ label: 'Admin', view: 'admin' });
  }

  const handleViewChange = (view: AppView) => {
    setView(view);
    setIsMobileMenuOpen(false);
  };

  const toggleMenu = () => {
    setIsMobileMenuOpen(prev => !prev);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_12px_30px_-22px_rgba(15,23,42,0.65)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center gap-3">
          <button
            type="button"
            className="flex items-center cursor-pointer group"
            onClick={() => handleViewChange(user ? 'shop' : 'home')}
          >
            <span className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-cyan-500">
              Lumina
            </span>
            <span className="ml-2 rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-700 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
              Prime
            </span>
          </button>

          <div className="hidden md:flex items-center ml-8 rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm">
            {navItems.map(item => (
              <button
                key={item.view}
                type="button"
                onClick={() => handleViewChange(item.view)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-all ${
                  currentView === item.view
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleViewChange('wishlist')}
              className="relative inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 transition-all hover:border-pink-300 hover:text-pink-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-pink-500 px-1.5 text-[10px] font-bold text-white">
                  {wishlistCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleViewChange('cart')}
              className="relative inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 transition-all hover:border-indigo-300 hover:text-indigo-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                  {cartCount}
                </span>
              )}
            </button>

            {user ? (
              <div className="hidden sm:flex items-center space-x-3">
                <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
                  {user.name}
                </span>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-500 transition-colors hover:text-red-500"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={onGoogle}
                  disabled={isAuthLoading}
                  className="hidden lg:inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <GoogleIcon className="h-4 w-4" />
                  Google
                </button>
                <button
                  type="button"
                  onClick={onLogin}
                  disabled={isAuthLoading}
                  className="hidden md:inline-flex rounded-xl border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isAuthLoading ? 'Loading...' : 'Login'}
                </button>
                <button
                  type="button"
                  onClick={onRegister}
                  disabled={isAuthLoading}
                  className="hidden md:inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  Register
                </button>
              </>
            )}

            <button
              type="button"
              onClick={toggleMenu}
              className="inline-flex md:hidden items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-700"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm1 4a1 1 0 100 2h12a1 1 0 100-2H4z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="border-t border-slate-200 py-4 md:hidden">
            <div className="space-y-2">
              {navItems.map(item => (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => handleViewChange(item.view)}
                  className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors ${
                    currentView === item.view
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}

              {!user && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onGoogle();
                      setIsMobileMenuOpen(false);
                    }}
                    disabled={isAuthLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    <GoogleIcon className="h-4 w-4" />
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onLogin();
                      setIsMobileMenuOpen(false);
                    }}
                    disabled={isAuthLoading}
                    className="w-full rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-700"
                  >
                    {isAuthLoading ? 'Loading...' : 'Login'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onRegister();
                      setIsMobileMenuOpen(false);
                    }}
                    disabled={isAuthLoading}
                    className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white"
                  >
                    Register
                  </button>
                </>
              )}

              {user && (
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-red-600"
                >
                  Logout
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
