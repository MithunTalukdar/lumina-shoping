import React, { useState } from 'react';
import {
  ArrowRight,
  Heart,
  LogOut,
  Menu,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AppView, User } from '../types';
import GoogleIcon from './GoogleIcon';
import LuminaMark from './LuminaMark';

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
  onProfileClick: () => void;
  onLogout: () => void;
}

const getUserInitials = (name: string) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() ?? '')
    .join('');

  return initials || 'LU';
};

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
  onProfileClick,
  onLogout,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems: { label: string; eyebrow: string; view: AppView }[] = user
    ? [{ label: 'Store', eyebrow: 'Curated drops', view: 'shop' }]
    : [
        { label: 'Home', eyebrow: 'Brand world', view: 'home' },
        { label: 'Store', eyebrow: 'New season', view: 'shop' },
      ];

  if (user?.role === 'admin') {
    navItems.push({ label: 'Admin', eyebrow: 'Control room', view: 'admin' });
  }

  const quickActions: {
    label: string;
    caption: string;
    count: number;
    view: AppView;
    icon: LucideIcon;
    tone: string;
  }[] = [
    {
      label: 'Wishlist',
      caption: 'Saved picks',
      count: wishlistCount,
      view: 'wishlist',
      icon: Heart,
      tone: 'from-rose-400/30 via-pink-400/[0.15] to-orange-300/20',
    },
    {
      label: 'Cart',
      caption: 'Ready to ship',
      count: cartCount,
      view: 'cart',
      icon: ShoppingBag,
      tone: 'from-cyan-400/30 via-sky-300/[0.15] to-indigo-400/20',
    },
  ];

  const isNavItemActive = (view: AppView) => currentView === view || (view === 'shop' && currentView === 'product');
  const isQuickActionActive = (view: AppView) => currentView === view;
  const isProfileActive = currentView === 'profile';

  const handleViewChange = (view: AppView) => {
    setView(view);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    setIsMobileMenuOpen(false);
    onLogout();
  };

  const handleProfileClick = () => {
    setIsMobileMenuOpen(false);
    onProfileClick();
  };

  return (
    <nav className="sticky top-0 z-50 px-3 pt-3 sm:px-4 lg:px-6">
      <div className="lumina-nav-shell relative mx-auto max-w-7xl overflow-hidden rounded-[30px] border border-white/10">
        <div className="lumina-nav-grid pointer-events-none absolute inset-0 opacity-60" />
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />

        <div className="relative px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 xl:gap-5">
            <button
              type="button"
              className="group flex min-w-0 items-center gap-3 text-left"
              onClick={() => handleViewChange(user ? 'shop' : 'home')}
            >
              <LuminaMark className="h-14 w-14 shrink-0 rounded-[22px] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105" />

              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[10px] font-semibold uppercase tracking-[0.34em] text-cyan-100/80 sm:text-[11px]">
                    Lumina Commerce
                  </span>
                  <span className="hidden rounded-full border border-cyan-200/25 bg-cyan-200/10 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.28em] text-cyan-50 sm:inline-flex">
                    Runway mode
                  </span>
                </span>
                <span className="lumina-brand-title mt-1 block truncate text-xl font-black tracking-[0.24em] sm:text-2xl">
                  LUMINA
                </span>
                <span className="hidden text-xs text-slate-300 sm:block">
                  Styled for discovery, built to feel premium.
                </span>
              </span>
            </button>

            <div className="hidden flex-1 justify-center xl:flex">
              <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_22px_45px_-34px_rgba(2,6,23,0.95)]">
                {navItems.map(item => {
                  const isActive = isNavItemActive(item.view);

                  return (
                    <button
                      key={item.view}
                      type="button"
                      onClick={() => handleViewChange(item.view)}
                      className={`relative overflow-hidden rounded-full px-4 py-3 text-left transition-all duration-300 ${
                        isActive
                          ? 'lumina-nav-active bg-white text-slate-950'
                          : 'text-slate-200 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className={`block text-[10px] font-semibold uppercase tracking-[0.28em] ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                        {item.eyebrow}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-sm font-semibold">
                        {item.label}
                        {isActive && <ArrowRight className="h-4 w-4" />}
                      </span>
                      {isActive && (
                        <span className="pointer-events-none absolute inset-x-4 bottom-1 h-px bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <div className="hidden 2xl:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-300">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-cyan-200" />
                </span>
                Style in motion
              </div>

              {quickActions.map(action => {
                const Icon = action.icon;
                const isActive = isQuickActionActive(action.view);

                return (
                  <button
                    key={action.view}
                    type="button"
                    onClick={() => handleViewChange(action.view)}
                    className={`relative inline-flex h-12 items-center gap-3 rounded-2xl border px-3 text-left transition-all duration-300 hover:-translate-y-0.5 ${
                      isActive
                        ? 'border-white/[0.30] bg-white/[0.16] text-white shadow-[0_18px_34px_-24px_rgba(34,211,238,0.65)]'
                        : 'border-white/10 bg-white/[0.08] text-slate-200 hover:border-white/[0.25] hover:bg-white/[0.12] hover:text-white'
                    }`}
                    aria-label={action.label}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${action.tone} shadow-inner`}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="hidden text-left xl:block">
                      <span className="block text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                        {action.caption}
                      </span>
                      <span className="text-sm font-semibold text-white">{action.label}</span>
                    </span>
                    {action.count > 0 && (
                      <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-slate-950/40 bg-white px-1.5 text-[10px] font-black text-slate-950">
                        {action.count}
                      </span>
                    )}
                  </button>
                );
              })}

              {user ? (
                <>
                  <button
                    type="button"
                    onClick={handleProfileClick}
                    className={`hidden items-center gap-3 rounded-[24px] border px-3 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-300 xl:flex ${
                      isProfileActive
                        ? 'border-cyan-200/30 bg-cyan-200/12 text-white shadow-[0_20px_38px_-30px_rgba(103,232,249,0.9)]'
                        : 'border-white/10 bg-white/[0.08] text-white hover:border-white/20 hover:bg-white/[0.12]'
                    }`}
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300/25 via-white/10 to-indigo-400/25 text-sm font-black text-white">
                      {getUserInitials(user.name)}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-cyan-100/70">
                        {user.role === 'admin' ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
                        {user.role === 'admin' ? 'Admin access' : 'Member access'}
                      </span>
                      <span className="mt-1 block max-w-[9rem] truncate text-sm font-semibold text-white">{user.name}</span>
                    </span>
                    <span className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl border ${isProfileActive ? 'border-cyan-200/30 bg-cyan-200/10' : 'border-white/10 bg-white/[0.05]'}`}>
                      <ArrowRight className={`h-4 w-4 transition-transform duration-300 ${isProfileActive ? 'translate-x-0.5' : ''}`} />
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-slate-200 transition-all duration-300 hover:border-rose-300/[0.40] hover:bg-rose-400/[0.10] hover:text-white sm:inline-flex"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden 2xl:inline">Logout</span>
                  </button>
                </>
              ) : (
                <div className="hidden items-center gap-2 md:flex">
                  <button
                    type="button"
                    onClick={handleProfileClick}
                    className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-white/[0.25] hover:bg-white/[0.12] lg:inline-flex"
                  >
                    <UserRound className="h-4 w-4" />
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={onGoogle}
                    disabled={isAuthLoading}
                    className="hidden items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-white/[0.25] hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-70 2xl:inline-flex"
                  >
                    <GoogleIcon className="h-4 w-4" />
                    Google
                  </button>
                  <button
                    type="button"
                    onClick={onLogin}
                    disabled={isAuthLoading}
                    className="hidden rounded-2xl border border-cyan-200/25 bg-cyan-200/[0.08] px-4 py-3 text-sm font-semibold text-cyan-50 transition-all duration-300 hover:border-cyan-200/[0.45] hover:bg-cyan-200/[0.14] disabled:cursor-not-allowed disabled:opacity-70 xl:inline-flex"
                  >
                    {isAuthLoading ? 'Loading...' : 'Login'}
                  </button>
                  <button
                    type="button"
                    onClick={onRegister}
                    disabled={isAuthLoading}
                    className="hidden items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 px-4 py-3 text-sm font-black text-slate-950 shadow-[0_22px_40px_-26px_rgba(103,232,249,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_46px_-28px_rgba(236,72,153,0.75)] disabled:cursor-not-allowed disabled:opacity-70 lg:inline-flex"
                  >
                    Start shopping
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(prev => !prev)}
                className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-slate-100 transition-all duration-300 hover:border-white/[0.25] hover:bg-white/[0.12] xl:hidden"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {isMobileMenuOpen && (
            <div className="lumina-nav-mobile-panel mt-4 border-t border-white/10 pt-4 xl:hidden">
              <div className="rounded-[28px] border border-white/10 bg-black/[0.15] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_50px_-38px_rgba(2,6,23,0.95)] sm:p-4">
                <div className="flex items-center justify-between gap-3 rounded-[24px] border border-white/10 bg-white/[0.06] px-4 py-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-cyan-100/80">Navigation</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {user ? 'Your storefront is primed and ready.' : 'Explore the collection and unlock premium access.'}
                    </p>
                  </div>
                  <LuminaMark className="h-11 w-11 shrink-0 rounded-2xl" />
                </div>

                <div className="mt-3 grid gap-2">
                  {navItems.map(item => {
                    const isActive = isNavItemActive(item.view);

                    return (
                      <button
                        key={item.view}
                        type="button"
                        onClick={() => handleViewChange(item.view)}
                        className={`rounded-[22px] border px-4 py-4 text-left transition-all duration-300 ${
                          isActive
                            ? 'border-cyan-200/[0.35] bg-white text-slate-950 shadow-[0_18px_36px_-28px_rgba(103,232,249,0.95)]'
                            : 'border-white/10 bg-white/[0.06] text-slate-100 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <span className={`block text-[10px] font-semibold uppercase tracking-[0.28em] ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                          {item.eyebrow}
                        </span>
                        <span className="mt-1 flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold">{item.label}</span>
                          <ArrowRight className={`h-4 w-4 ${isActive ? 'text-cyan-600' : 'text-slate-500'}`} />
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {quickActions.map(action => {
                    const Icon = action.icon;
                    const isActive = isQuickActionActive(action.view);

                    return (
                      <button
                        key={action.view}
                        type="button"
                        onClick={() => handleViewChange(action.view)}
                        className={`rounded-[22px] border px-4 py-4 text-left transition-all duration-300 ${
                          isActive
                            ? 'border-white/[0.30] bg-white/[0.12] text-white'
                            : 'border-white/10 bg-white/[0.06] text-slate-100 hover:border-white/20 hover:bg-white/10'
                        }`}
                      >
                        <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${action.tone}`}>
                          <Icon className="h-[18px] w-[18px]" />
                        </span>
                        <span className="block text-[10px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                          {action.caption}
                        </span>
                        <span className="mt-1 block text-sm font-semibold">{action.label}</span>
                        <span className="mt-1 block text-xs text-slate-400">
                          {action.count > 0 ? `${action.count} item${action.count > 1 ? 's' : ''}` : 'Nothing waiting yet'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {user ? (
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={handleProfileClick}
                      className={`flex items-center gap-3 rounded-[24px] border px-4 py-4 text-left transition-all duration-300 ${
                        isProfileActive
                          ? 'border-cyan-200/30 bg-cyan-200/10 text-white'
                          : 'border-white/10 bg-white/[0.06] text-white hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300/25 via-white/10 to-indigo-400/25 text-sm font-black text-white">
                        {getUserInitials(user.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-100/75">
                          {user.role === 'admin' ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
                          Profile page
                        </span>
                        <span className="mt-1 block truncate text-sm font-semibold text-white">{user.name}</span>
                      </span>
                      <ArrowRight className={`h-4 w-4 transition-transform duration-300 ${isProfileActive ? 'translate-x-0.5' : ''}`} />
                    </button>

                    <div className="flex items-center gap-3 rounded-[24px] border border-white/10 bg-white/[0.06] px-4 py-4">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-300/25 via-white/10 to-indigo-400/25 text-sm font-black text-white">
                        {getUserInitials(user.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-100/75">
                          {user.role === 'admin' ? <ShieldCheck className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
                          {user.role === 'admin' ? 'Admin access' : 'Member access'}
                        </span>
                        <span className="mt-1 block truncate text-sm font-semibold text-white">{user.name}</span>
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] border border-rose-300/[0.20] bg-rose-400/[0.10] px-4 py-4 text-sm font-semibold text-rose-100 transition-all duration-300 hover:border-rose-300/[0.40] hover:bg-rose-400/[0.15]"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={handleProfileClick}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.08] px-4 py-4 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-white/[0.25] hover:bg-white/[0.12]"
                    >
                      <UserRound className="h-4 w-4" />
                      Open Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onGoogle();
                        setIsMobileMenuOpen(false);
                      }}
                      disabled={isAuthLoading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] border border-white/10 bg-white/[0.08] px-4 py-4 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-white/[0.25] hover:bg-white/[0.12] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      <GoogleIcon className="h-4 w-4" />
                      Continue with Google
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onLogin();
                        setIsMobileMenuOpen(false);
                      }}
                      disabled={isAuthLoading}
                      className="w-full rounded-[22px] border border-cyan-200/25 bg-cyan-200/[0.08] px-4 py-4 text-sm font-semibold text-cyan-50 transition-all duration-300 hover:border-cyan-200/[0.45] hover:bg-cyan-200/[0.14] disabled:cursor-not-allowed disabled:opacity-70"
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
                      className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 px-4 py-4 text-sm font-black text-slate-950 shadow-[0_20px_40px_-28px_rgba(103,232,249,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_26px_46px_-30px_rgba(236,72,153,0.8)] disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      Start shopping
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
