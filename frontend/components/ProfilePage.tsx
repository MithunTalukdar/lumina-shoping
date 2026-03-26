import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  KeyRound,
  Mail,
  PackageSearch,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import { Order, OrderStatus, User } from '../types';
import { changePassword, getOrders } from '../services/profileService';
import { formatPrice } from '../utils/currency';

export type ProfilePageTab = 'profile' | 'orders' | 'password';

interface ProfilePageProps {
  user: User;
  initialTab?: ProfilePageTab;
  onBrowseShop: () => void;
}

type PasswordFormState = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const EMPTY_PASSWORD_FORM: PasswordFormState = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const PROFILE_TABS: { id: ProfilePageTab; label: string }[] = [
  { id: 'profile', label: 'Profile Info' },
  { id: 'orders', label: 'My Orders' },
  { id: 'password', label: 'Change Password' },
];

function getUserInitials(name: string) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return initials || 'LU';
}

function formatOrderDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatOrderProducts(order: Order) {
  const productNames = order.items.map((item) => item.name).filter(Boolean);

  if (productNames.length === 0) {
    return 'No products attached';
  }

  if (productNames.length <= 2) {
    return productNames.join(', ');
  }

  return `${productNames.slice(0, 2).join(', ')} +${productNames.length - 2} more`;
}

function getStatusStyles(status: OrderStatus) {
  if (status === 'delivered') {
    return 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100';
  }

  if (status === 'cancelled') {
    return 'border-rose-300/20 bg-rose-400/10 text-rose-100';
  }

  return 'border-amber-300/20 bg-amber-300/10 text-amber-50';
}

function formatStatus(status: OrderStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  initialTab = 'profile',
  onBrowseShop,
}) => {
  const [activeTab, setActiveTab] = useState<ProfilePageTab>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(EMPTY_PASSWORD_FORM);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null;
  const totalSpend = useMemo(() => orders.reduce((sum, order) => sum + order.total, 0), [orders]);
  const lastOrderDate = orders[0] ? formatOrderDate(orders[0].createdAt) : 'No orders yet';

  const loadOrders = async () => {
    setIsOrdersLoading(true);
    setOrdersError(null);

    try {
      const nextOrders = await getOrders();
      setOrders(nextOrders);
      setSelectedOrderId((current) =>
        current && nextOrders.some((order) => order.id === current) ? current : nextOrders[0]?.id ?? null
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load orders.';
      setOrdersError(message);
      setOrders([]);
      setSelectedOrderId(null);
    } finally {
      setIsOrdersLoading(false);
    }
  };

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    void loadOrders();
  }, [user.id]);

  const handlePasswordFieldChange = (field: keyof PasswordFormState, value: string) => {
    setPasswordForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password must match.');
      return;
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password must be different from the current password.');
      return;
    }

    setIsPasswordSubmitting(true);

    try {
      const response = await changePassword(passwordForm);
      setPasswordSuccess(response.message);
      setPasswordForm(EMPTY_PASSWORD_FORM);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to change password.';
      setPasswordError(message);
    } finally {
      setIsPasswordSubmitting(false);
    }
  };

  return (
    <div className="py-10">
      <section className="commerce-luxe-panel relative overflow-hidden rounded-[2.6rem] border border-white/10">
        <div className="commerce-surface-grid pointer-events-none absolute inset-0 opacity-70" />

        <div className="relative border-b border-white/10 px-5 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-gradient-to-br from-cyan-300/25 via-white/10 to-fuchsia-400/20 text-xl font-black text-white">
                {getUserInitials(user.name)}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-cyan-100/80">Member Profile</p>
                <h1 className="mt-2 truncate text-3xl font-black text-white sm:text-4xl">{user.name}</h1>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                  <Mail className="h-4 w-4 text-cyan-100" />
                  <span className="truncate">{user.email}</span>
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Orders</p>
                <p className="mt-2 text-2xl font-black text-white">{orders.length}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Lifetime Spend</p>
                <p className="mt-2 text-2xl font-black text-white">{formatPrice(totalSpend)}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Latest Order</p>
                <p className="mt-2 text-sm font-semibold text-white">{lastOrderDate}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-4 sm:px-6 lg:px-8">
          {PROFILE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-300 ${
                activeTab === tab.id
                  ? 'profile-tab-active bg-white text-slate-950 shadow-[0_18px_34px_-26px_rgba(125,211,252,0.95)]'
                  : 'border border-white/10 bg-white/[0.05] text-slate-200 hover:border-white/20 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative px-5 py-6 sm:px-6 lg:px-8">
          {activeTab === 'profile' && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_340px]">
              <section className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5 sm:p-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-50">
                  <UserRound className="h-4 w-4" />
                  Profile Dashboard
                </span>
                <h2 className="mt-6 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Your account, orders, and security live in one polished space.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Review your profile details, jump into order history, and update password security from the same modern dashboard.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Status</p>
                    <p className="mt-3 text-lg font-black text-white">{user.role === 'admin' ? 'Administrator' : 'Verified member'}</p>
                  </div>
                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Orders Tracked</p>
                    <p className="mt-3 text-lg font-black text-white">{orders.length}</p>
                  </div>
                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Security</p>
                    <p className="mt-3 text-lg font-black text-white">Protected</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_22px_42px_-30px_rgba(103,232,249,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_46px_-30px_rgba(236,72,153,0.75)]"
                  >
                    View My Orders
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('password')}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.1]"
                  >
                    Change Password
                    <KeyRound className="h-4 w-4" />
                  </button>
                </div>
              </section>

              <aside className="space-y-5">
                <div className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Basic Info</p>
                  <div className="mt-5 space-y-3">
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Name</p>
                      <p className="mt-2 text-sm font-semibold text-white">{user.name}</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Email</p>
                      <p className="mt-2 text-sm font-semibold text-white">{user.email}</p>
                    </div>
                    <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Access</p>
                      <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-white">
                        <ShieldCheck className="h-4 w-4 text-emerald-300" />
                        {user.role === 'admin' ? 'Admin access' : 'Verified member'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Quick Actions</p>
                  <div className="mt-5 grid gap-2">
                    <button
                      type="button"
                      onClick={onBrowseShop}
                      className="inline-flex items-center justify-between rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-4 py-4 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.1]"
                    >
                      Continue Shopping
                      <ShoppingBag className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('orders')}
                      className="inline-flex items-center justify-between rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-4 py-4 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.1]"
                    >
                      Review Orders
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">My Orders</p>
                    <h2 className="mt-2 text-2xl font-black text-white">Everything you have ordered, in one place</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadOrders()}
                    disabled={isOrdersLoading}
                    className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.1] ${isOrdersLoading ? 'opacity-70' : ''}`}
                  >
                    <RefreshCw className={`h-4 w-4 ${isOrdersLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {ordersError && (
                  <p className="rounded-[1.2rem] border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
                    {ordersError}
                  </p>
                )}

                <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                  {isOrdersLoading ? (
                    [0, 1, 2].map((index) => (
                      <div key={index} className="rounded-[1.6rem] border border-white/10 bg-white/[0.05] px-5 py-5">
                        <div className="h-3 w-24 rounded-full bg-white/10" />
                        <div className="mt-4 h-6 w-3/4 rounded-full bg-white/10" />
                        <div className="mt-6 h-4 w-1/2 rounded-full bg-white/10" />
                      </div>
                    ))
                  ) : orders.length === 0 ? (
                    <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.04] px-5 py-10 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-white/10 bg-white/[0.05] text-cyan-100">
                        <PackageSearch className="h-8 w-8" />
                      </div>
                      <h3 className="mt-5 text-xl font-black text-white">No orders yet</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">Your completed checkouts will appear here as soon as you place an order.</p>
                      <button
                        type="button"
                        onClick={onBrowseShop}
                        className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_22px_42px_-30px_rgba(103,232,249,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_46px_-30px_rgba(236,72,153,0.75)]"
                      >
                        Browse the Shop
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    orders.map((order) => {
                      const isActive = selectedOrder?.id === order.id;

                      return (
                        <button
                          key={order.id}
                          type="button"
                          onClick={() => setSelectedOrderId(order.id)}
                          className={`w-full rounded-[1.6rem] border px-5 py-5 text-left transition-all duration-300 ${
                            isActive
                              ? 'border-cyan-200/25 bg-cyan-200/10 shadow-[0_18px_40px_-28px_rgba(103,232,249,0.6)]'
                              : 'border-white/10 bg-white/[0.05] hover:border-white/20 hover:bg-white/[0.08]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Order #{order.id.slice(-6).toUpperCase()}</p>
                              <h3 className="mt-3 text-base font-black leading-6 text-white">{formatOrderProducts(order)}</h3>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${getStatusStyles(order.status)}`}>
                              {formatStatus(order.status)}
                            </span>
                          </div>
                          <div className="mt-5 grid gap-2 text-sm text-slate-300">
                            <span>{formatOrderDate(order.createdAt)}</span>
                            <span className="font-black text-white">{formatPrice(order.total)}</span>
                            <span className="inline-flex items-center gap-2 font-semibold text-cyan-100">
                              View Details
                              <ArrowRight className="h-4 w-4" />
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5 sm:p-6">
                {selectedOrder ? (
                  <>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-slate-400">Order Details</p>
                        <h2 className="mt-3 text-3xl font-black text-white">#{selectedOrder.id.slice(-8).toUpperCase()}</h2>
                        <p className="mt-2 text-sm text-slate-300">{formatOrderDate(selectedOrder.createdAt)}</p>
                      </div>
                      <div className="space-y-3">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${getStatusStyles(selectedOrder.status)}`}>
                          {formatStatus(selectedOrder.status)}
                        </span>
                        <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/40 px-4 py-3 text-right">
                          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Grand Total</p>
                          <p className="mt-2 text-2xl font-black text-white">{formatPrice(selectedOrder.total)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 max-h-[38vh] space-y-3 overflow-y-auto pr-1">
                      {selectedOrder.items.map((item) => (
                        <article
                          key={`${selectedOrder.id}-${item.productId}`}
                          className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-slate-950/40 p-4 sm:flex-row sm:items-center"
                        >
                          <div className="h-24 w-full overflow-hidden rounded-[1.25rem] border border-white/10 sm:w-24">
                            <img src={item.image} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg font-black text-white">{item.name}</h3>
                            <p className="copy-clamp-2 mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                            <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                              {item.category} - {item.location}
                            </p>
                          </div>
                          <div className="shrink-0 rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4 sm:text-right">
                            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Qty x Price</p>
                            <p className="mt-2 text-sm font-semibold text-slate-100">
                              {item.quantity} x {formatPrice(item.price)}
                            </p>
                            <p className="mt-3 text-lg font-black text-white">{formatPrice(item.lineTotal)}</p>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="mt-6 grid gap-3 sm:grid-cols-4">
                      <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Subtotal</p>
                        <p className="mt-2 text-lg font-black text-white">{formatPrice(selectedOrder.subtotal)}</p>
                      </div>
                      <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Shipping</p>
                        <p className="mt-2 text-lg font-black text-white">{formatPrice(selectedOrder.shipping)}</p>
                      </div>
                      <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Tax</p>
                        <p className="mt-2 text-lg font-black text-white">{formatPrice(selectedOrder.tax)}</p>
                      </div>
                      <div className="rounded-[1.25rem] border border-cyan-200/20 bg-cyan-200/10 px-4 py-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-100/70">Grand Total</p>
                        <p className="mt-2 text-lg font-black text-white">{formatPrice(selectedOrder.total)}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[24rem] flex-col items-center justify-center text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-white/10 bg-white/[0.05] text-cyan-100">
                      <PackageSearch className="h-10 w-10" />
                    </div>
                    <h3 className="mt-6 text-2xl font-black text-white">Choose an order</h3>
                    <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">
                      Select an order card to review full product details, totals, status, and purchase date.
                    </p>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_320px]">
              <section className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Change Password</p>
                    <h2 className="mt-3 text-3xl font-black text-white">Update your account security</h2>
                  </div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-200/10 text-cyan-100">
                    <KeyRound className="h-5 w-5" />
                  </span>
                </div>

                <form className="mt-6 space-y-4" onSubmit={handlePasswordSubmit}>
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Current Password</span>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(event) => handlePasswordFieldChange('currentPassword', event.target.value)}
                      className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300/40"
                      autoComplete="current-password"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">New Password</span>
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(event) => handlePasswordFieldChange('newPassword', event.target.value)}
                      className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300/40"
                      autoComplete="new-password"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Confirm Password</span>
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(event) => handlePasswordFieldChange('confirmPassword', event.target.value)}
                      className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300/40"
                      autoComplete="new-password"
                    />
                  </label>

                  {passwordError && (
                    <p className="rounded-[1.2rem] border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
                      {passwordError}
                    </p>
                  )}

                  {passwordSuccess && (
                    <p className="rounded-[1.2rem] border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100">
                      {passwordSuccess}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isPasswordSubmitting}
                    className={`inline-flex w-full items-center justify-center gap-2 rounded-[1.35rem] bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 px-5 py-4 text-sm font-black text-slate-950 shadow-[0_22px_42px_-30px_rgba(103,232,249,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_48px_-30px_rgba(236,72,153,0.75)] ${isPasswordSubmitting ? 'opacity-70' : ''}`}
                  >
                    {isPasswordSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Updating Password
                      </span>
                    ) : (
                      <>
                        <ShieldCheck className="h-4 w-4" />
                        Save New Password
                      </>
                    )}
                  </button>
                </form>
              </section>

              <aside className="space-y-5">
                <div className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Security Notes</p>
                  <div className="mt-5 space-y-4 text-sm leading-6 text-slate-300">
                    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                      <p className="font-semibold text-white">Minimum 8 characters</p>
                      <p className="mt-2">Choose a new password that is strong, memorable, and different from your current one.</p>
                    </div>
                    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                      <p className="font-semibold text-white">Protected backend update</p>
                      <p className="mt-2">This form calls the authenticated password API so your password hash is updated securely on the server.</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[1.35rem] border border-white/10 bg-white/[0.06] px-4 py-4 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.1]"
                >
                  Back to Profile
                  <ArrowRight className="h-4 w-4" />
                </button>
              </aside>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
