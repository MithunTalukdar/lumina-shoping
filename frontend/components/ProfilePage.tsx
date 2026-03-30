import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BellRing,
  KeyRound,
  Mail,
  MapPinned,
  PackageSearch,
  Phone,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
} from 'lucide-react';
import { NotificationItem, Order, OrderStatus, ShippingAddress, User } from '../types';
import {
  ChangePasswordInput,
  changePassword,
  getOrders,
  subscribeToOrderTracking,
} from '../services/profileService';
import { formatPrice } from '../utils/currency';
import { getIndianLocationMeta, validateIndianAddressInput, type ShippingAddressInput } from '../utils/india';

export type ProfilePageTab = 'profile' | 'addresses' | 'orders' | 'password';

interface ProfilePageProps {
  user: User;
  initialTab?: ProfilePageTab;
  onBrowseShop: () => void;
  addresses: ShippingAddress[];
  selectedAddressId: string | null;
  isAddressesLoading: boolean;
  addressError: string | null;
  onSelectAddress: (addressId: string) => void;
  onSaveAddress: (input: ShippingAddressInput) => Promise<void>;
  onDeleteAddress: (addressId: string) => Promise<void>;
}

const EMPTY_PASSWORD_FORM: ChangePasswordInput = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const createEmptyAddressForm = (): ShippingAddressInput => ({
  name: '',
  phone: '',
  addressLine: '',
  city: 'Kolkata',
  state: 'West Bengal',
  pincode: '',
  isDefault: false,
});

const PROFILE_TABS: { id: ProfilePageTab; label: string }[] = [
  { id: 'profile', label: 'Profile Info' },
  { id: 'addresses', label: 'Addresses' },
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

  if (status === 'out_for_delivery') {
    return 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100';
  }

  if (status === 'shipped') {
    return 'border-indigo-300/20 bg-indigo-400/10 text-indigo-100';
  }

  return 'border-amber-300/20 bg-amber-300/10 text-amber-50';
}

function formatStatus(status: OrderStatus) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

const ProfilePage: React.FC<ProfilePageProps> = ({
  user,
  initialTab = 'profile',
  onBrowseShop,
  addresses,
  selectedAddressId,
  isAddressesLoading,
  addressError,
  onSelectAddress,
  onSaveAddress,
  onDeleteAddress,
}) => {
  const [activeTab, setActiveTab] = useState<ProfilePageTab>(initialTab);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState<ChangePasswordInput>(EMPTY_PASSWORD_FORM);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false);
  const [addressForm, setAddressForm] = useState<ShippingAddressInput>(createEmptyAddressForm);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressFormError, setAddressFormError] = useState<string | null>(null);
  const [addressFormSuccess, setAddressFormSuccess] = useState<string | null>(null);
  const [isAddressSubmitting, setIsAddressSubmitting] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0] ?? null;
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) ?? addresses.find((address) => address.isDefault) ?? addresses[0] ?? null;
  const totalSpend = useMemo(() => orders.reduce((sum, order) => sum + order.total, 0), [orders]);
  const lastOrderDate = orders[0] ? formatOrderDate(orders[0].createdAt) : 'No orders yet';
  const latestNotifications = useMemo(
    () =>
      orders
        .flatMap((order) => order.notifications)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        .slice(0, 4),
    [orders]
  );
  const liveOrder = orders.find((order) => order.status === 'out_for_delivery') ?? orders.find((order) => order.status === 'shipped') ?? orders[0] ?? null;

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

  useEffect(() => {
    if (activeTab !== 'orders' || !selectedOrderId) {
      return;
    }

    setTrackingError(null);
    return subscribeToOrderTracking(
      selectedOrderId,
      (nextOrder) => {
        setOrders((current) => current.map((order) => (order.id === nextOrder.id ? nextOrder : order)));
      },
      (message) => {
        setTrackingError(message);
      }
    );
  }, [activeTab, selectedOrderId]);

  useEffect(() => {
    if (editingAddressId && !addresses.some((address) => address.id === editingAddressId)) {
      setEditingAddressId(null);
      setAddressForm(createEmptyAddressForm());
    }
  }, [addresses, editingAddressId]);

  const handlePasswordFieldChange = (field: keyof ChangePasswordInput, value: string) => {
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

  const resetAddressForm = () => {
    setEditingAddressId(null);
    setAddressForm(createEmptyAddressForm());
    setAddressFormError(null);
    setAddressFormSuccess(null);
  };

  const handleAddressFieldChange = (field: keyof ShippingAddressInput, value: string | boolean) => {
    setAddressForm((current) => {
      const nextValue = {
        ...current,
        [field]: value,
      };

      if (field === 'city' && typeof value === 'string') {
        const meta = getIndianLocationMeta(value);
        nextValue.state = meta?.state ?? '';
      }

      return nextValue;
    });
  };

  const handleEditAddress = (address: ShippingAddress) => {
    setEditingAddressId(address.id);
    setAddressForm({
      id: address.id,
      name: address.name,
      phone: address.phone,
      addressLine: address.addressLine,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      isDefault: address.isDefault,
    });
    setAddressFormError(null);
    setAddressFormSuccess(null);
    setActiveTab('addresses');
  };

  const handleAddressSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAddressFormError(null);
    setAddressFormSuccess(null);

    const validationMessage = validateIndianAddressInput(addressForm);
    if (validationMessage) {
      setAddressFormError(validationMessage);
      return;
    }

    setIsAddressSubmitting(true);

    try {
      await onSaveAddress({
        ...addressForm,
        id: editingAddressId ?? undefined,
      });
      resetAddressForm();
      setAddressFormSuccess(editingAddressId ? 'Shipping address updated.' : 'Shipping address saved.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save shipping address.';
      setAddressFormError(message);
    } finally {
      setIsAddressSubmitting(false);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    setDeletingAddressId(addressId);
    setAddressFormError(null);
    setAddressFormSuccess(null);

    try {
      await onDeleteAddress(addressId);
      if (editingAddressId === addressId) {
        resetAddressForm();
      }
      setAddressFormSuccess('Shipping address removed.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to remove shipping address.';
      setAddressFormError(message);
    } finally {
      setDeletingAddressId(null);
    }
  };

  const trackingMapPoint = selectedOrder?.latestAgentLocation ?? (selectedOrder ? getIndianLocationMeta(selectedOrder.shippingAddress.city) : null);
  const timelineProgress = selectedOrder
    ? Math.max(0, selectedOrder.trackingSteps.reduce((lastIndex, step, index) => (step.completedAt ? index : lastIndex), -1))
    : -1;

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
                <p className="text-[11px] font-bold uppercase tracking-[0.34em] text-cyan-100/80">
                  {user.role === 'delivery_agent' ? 'Delivery Profile' : 'Member Profile'}
                </p>
                <h1 className="mt-2 truncate text-3xl font-black text-white sm:text-4xl">{user.name}</h1>
                <p className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                  <Mail className="h-4 w-4 text-cyan-100" />
                  <span className="truncate">{user.email}</span>
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Orders</p>
                <p className="mt-2 text-2xl font-black text-white">{orders.length}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Addresses</p>
                <p className="mt-2 text-2xl font-black text-white">{addresses.length}</p>
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
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_360px]">
              <section className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5 sm:p-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-50">
                  <UserRound className="h-4 w-4" />
                  Account Dashboard
                </span>
                <h2 className="mt-6 text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Orders, addresses, and secure delivery tracking live in one place.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                  Manage your India-only shipping addresses, watch tracked orders progress in real time, and keep your account security polished from the same dashboard.
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Status</p>
                    <p className="mt-3 text-lg font-black text-white">{user.role === 'admin' ? 'Administrator' : user.role === 'delivery_agent' ? 'Delivery partner' : 'Verified member'}</p>
                  </div>
                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Default Address</p>
                    <p className="mt-3 text-lg font-black text-white">{selectedAddress ? selectedAddress.city : 'Not set'}</p>
                  </div>
                  <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                    <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Live Tracking</p>
                    <p className="mt-3 text-lg font-black text-white">{liveOrder ? formatStatus(liveOrder.status) : 'Standby'}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_22px_42px_-30px_rgba(103,232,249,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_46px_-30px_rgba(236,72,153,0.75)]"
                  >
                    Track Orders
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('addresses')}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.1]"
                  >
                    Manage Addresses
                    <MapPinned className="h-4 w-4" />
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
                        {user.role === 'admin' ? 'Admin access' : user.role === 'delivery_agent' ? 'Delivery operations' : 'Verified member'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Latest Updates</p>
                    <BellRing className="h-4 w-4 text-cyan-100" />
                  </div>
                  <div className="mt-5 space-y-3">
                    {latestNotifications.length === 0 ? (
                      <p className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-4 py-4 text-sm leading-6 text-slate-300">
                        Order placed, shipped, out-for-delivery, and delivered updates will appear here.
                      </p>
                    ) : (
                      latestNotifications.map((notification) => (
                        <article key={notification.id} className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-4 py-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-black text-white">{notification.title}</p>
                              <p className="mt-2 text-sm leading-6 text-slate-300">{notification.message}</p>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${getStatusStyles(notification.status)}`}>
                              {formatStatus(notification.status)}
                            </span>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {notification.channels.map((channel) => (
                              <span key={`${notification.id}-${channel}`} className="rounded-full border border-white/10 bg-slate-950/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                                {channel}
                              </span>
                            ))}
                          </div>
                          <p className="mt-3 text-xs font-semibold text-slate-400">{formatNotificationTime(notification.createdAt)}</p>
                        </article>
                      ))
                    )}
                  </div>
                </div>
              </aside>
            </div>
          )}

          {activeTab === 'addresses' && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <section className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Shipping Addresses</p>
                    <h2 className="mt-3 text-3xl font-black text-white">Manage India-only delivery destinations</h2>
                  </div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-200/10 text-cyan-100">
                    <MapPinned className="h-5 w-5" />
                  </span>
                </div>

                <form className="mt-6 space-y-4" onSubmit={handleAddressSubmit}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Full Name</span>
                      <input type="text" value={addressForm.name} onChange={(event) => handleAddressFieldChange('name', event.target.value)} className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300/40" />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Phone</span>
                      <input type="tel" value={addressForm.phone} onChange={(event) => handleAddressFieldChange('phone', event.target.value)} placeholder="+91 98xxxxxx" className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300/40" />
                    </label>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Address</span>
                    <textarea value={addressForm.addressLine} onChange={(event) => handleAddressFieldChange('addressLine', event.target.value)} rows={4} className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300/40" />
                  </label>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">City</span>
                      <select value={addressForm.city} onChange={(event) => handleAddressFieldChange('city', event.target.value)} className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300/40">
                        {['Kolkata', 'Mumbai', 'Delhi', 'Bengaluru', 'Chennai', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'].map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">State</span>
                      <input type="text" value={addressForm.state} readOnly className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/40 px-4 py-3 text-slate-200 outline-none" />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Pincode</span>
                      <input type="text" inputMode="numeric" maxLength={6} value={addressForm.pincode} onChange={(event) => handleAddressFieldChange('pincode', event.target.value.replace(/[^\d]/g, ''))} className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300/40" />
                    </label>
                  </div>

                  <label className="inline-flex items-center gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-100">
                    <input type="checkbox" checked={Boolean(addressForm.isDefault)} onChange={(event) => handleAddressFieldChange('isDefault', event.target.checked)} className="h-4 w-4 rounded border-white/20 bg-slate-950/40 text-cyan-300" />
                    Make this my default shipping address
                  </label>

                  {addressError && <p className="rounded-[1.2rem] border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">{addressError}</p>}
                  {addressFormError && <p className="rounded-[1.2rem] border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">{addressFormError}</p>}
                  {addressFormSuccess && <p className="rounded-[1.2rem] border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100">{addressFormSuccess}</p>}

                  <div className="flex flex-wrap gap-3">
                    <button type="submit" disabled={isAddressSubmitting} className={`inline-flex items-center gap-2 rounded-[1.35rem] bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 px-5 py-4 text-sm font-black text-slate-950 shadow-[0_22px_42px_-30px_rgba(103,232,249,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_48px_-30px_rgba(236,72,153,0.75)] ${isAddressSubmitting ? 'opacity-70' : ''}`}>
                      {isAddressSubmitting ? 'Saving...' : editingAddressId ? 'Update Address' : 'Save Address'}
                    </button>
                    {editingAddressId && <button type="button" onClick={resetAddressForm} className="inline-flex items-center gap-2 rounded-[1.35rem] border border-white/10 bg-white/[0.06] px-5 py-4 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.1]">Cancel Edit</button>}
                  </div>
                </form>
              </section>

              <aside className="space-y-5">
                <div className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Saved Addresses</p>
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-200">{addresses.length}</span>
                  </div>

                  {isAddressesLoading ? (
                    <div className="mt-5 space-y-3">{[0, 1].map((index) => <div key={index} className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-4 py-4"><div className="h-4 w-28 rounded-full bg-white/10" /><div className="mt-3 h-4 w-3/4 rounded-full bg-white/10" /></div>)}</div>
                  ) : addresses.length === 0 ? (
                    <p className="mt-5 rounded-[1.2rem] border border-dashed border-white/10 bg-white/[0.04] px-4 py-6 text-sm leading-6 text-slate-300">Add your first Indian shipping address to activate checkout and live delivery estimates.</p>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {addresses.map((address) => {
                        const isSelected = selectedAddress?.id === address.id;
                        return (
                          <article key={address.id} className={`rounded-[1.2rem] border px-4 py-4 ${isSelected ? 'border-cyan-200/25 bg-cyan-200/10' : 'border-white/10 bg-white/[0.05]'}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-white">{address.name}</p>
                                <p className="mt-1 text-sm text-slate-300">{address.city}, {address.state}</p>
                              </div>
                              {address.isDefault && <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">Default</span>}
                            </div>
                            <p className="mt-3 text-sm leading-6 text-slate-300">{address.addressLine}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <button type="button" onClick={() => onSelectAddress(address.id)} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-100 transition-colors hover:border-white/20 hover:bg-white/[0.1]">Use for Checkout</button>
                              <button type="button" onClick={() => handleEditAddress(address)} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-100 transition-colors hover:border-white/20 hover:bg-white/[0.1]">Edit</button>
                              <button type="button" onClick={() => void handleDeleteAddress(address.id)} disabled={deletingAddressId === address.id} className="rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-rose-100 transition-colors hover:border-rose-300/40 hover:bg-rose-400/[0.16] disabled:opacity-70">{deletingAddressId === address.id ? 'Removing...' : 'Delete'}</button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
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
                    <h2 className="mt-2 text-2xl font-black text-white">Timeline, notifications, and live route updates</h2>
                  </div>
                  <button type="button" onClick={() => void loadOrders()} disabled={isOrdersLoading} className={`inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.1] ${isOrdersLoading ? 'opacity-70' : ''}`}>
                    <RefreshCw className={`h-4 w-4 ${isOrdersLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {ordersError && <p className="rounded-[1.2rem] border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">{ordersError}</p>}

                <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
                  {isOrdersLoading ? (
                    [0, 1, 2].map((index) => <div key={index} className="rounded-[1.6rem] border border-white/10 bg-white/[0.05] px-5 py-5"><div className="h-3 w-24 rounded-full bg-white/10" /><div className="mt-4 h-6 w-3/4 rounded-full bg-white/10" /><div className="mt-6 h-4 w-1/2 rounded-full bg-white/10" /></div>)
                  ) : orders.length === 0 ? (
                    <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.04] px-5 py-10 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.4rem] border border-white/10 bg-white/[0.05] text-cyan-100"><PackageSearch className="h-8 w-8" /></div>
                      <h3 className="mt-5 text-xl font-black text-white">No orders yet</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-300">Your completed checkouts will appear here as soon as you place an order.</p>
                      <button type="button" onClick={onBrowseShop} className="mt-5 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_22px_42px_-30px_rgba(103,232,249,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_46px_-30px_rgba(236,72,153,0.75)]">Browse the Shop<ArrowRight className="h-4 w-4" /></button>
                    </div>
                  ) : (
                    orders.map((order) => {
                      const isActive = selectedOrder?.id === order.id;
                      return (
                        <button key={order.id} type="button" onClick={() => setSelectedOrderId(order.id)} className={`w-full rounded-[1.6rem] border px-5 py-5 text-left transition-all duration-300 ${isActive ? 'border-cyan-200/25 bg-cyan-200/10 shadow-[0_18px_40px_-28px_rgba(103,232,249,0.6)]' : 'border-white/10 bg-white/[0.05] hover:border-white/20 hover:bg-white/[0.08]'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">{order.orderNumber}</p>
                              <h3 className="mt-3 text-base font-black leading-6 text-white">{formatOrderProducts(order)}</h3>
                            </div>
                            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${getStatusStyles(order.status)}`}>{formatStatus(order.status)}</span>
                          </div>
                          <div className="mt-5 grid gap-2 text-sm text-slate-300">
                            <span>{formatOrderDate(order.createdAt)}</span>
                            <span className="font-black text-white">{formatPrice(order.total)}</span>
                            <span className="inline-flex items-center gap-2 font-semibold text-cyan-100">Open Tracking<ArrowRight className="h-4 w-4" /></span>
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
                        <h2 className="mt-3 text-3xl font-black text-white">{selectedOrder.orderNumber}</h2>
                        <p className="mt-2 text-sm text-slate-300">{formatOrderDate(selectedOrder.createdAt)}</p>
                      </div>
                      <div className="space-y-3">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${getStatusStyles(selectedOrder.status)}`}>{formatStatus(selectedOrder.status)}</span>
                        <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/40 px-4 py-3 text-right"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Grand Total</p><p className="mt-2 text-2xl font-black text-white">{formatPrice(selectedOrder.total)}</p></div>
                      </div>
                    </div>

                    {trackingError && <p className="mt-5 rounded-[1.2rem] border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">{trackingError}</p>}

                    <div className="mt-6 rounded-[1.6rem] border border-white/10 bg-white/[0.04] p-5">
                      <div className="flex items-center justify-between gap-3">
                        <div><p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Tracking Timeline</p><p className="mt-2 text-sm text-slate-300">Progress indicator updates live while the order moves through fulfillment.</p></div>
                        <Truck className="h-5 w-5 text-cyan-100" />
                      </div>
                      <div className="mt-6 grid gap-4 md:grid-cols-4">
                        {selectedOrder.trackingSteps.map((step, index) => {
                          const isCompleted = Boolean(step.completedAt);
                          const isCurrent = index === timelineProgress;
                          return (
                            <article key={step.status} className={`rounded-[1.3rem] border px-4 py-4 ${isCompleted ? 'border-cyan-300/25 bg-cyan-300/10' : 'border-white/10 bg-white/[0.04]'}`}>
                              <div className="flex items-center gap-3">
                                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-black ${isCompleted ? 'bg-cyan-200/20 text-cyan-50' : 'bg-white/10 text-slate-300'}`}>{index + 1}</span>
                                <div>
                                  <p className="text-sm font-black text-white">{step.label}</p>
                                  <p className="mt-1 text-xs font-semibold text-slate-300">{isCompleted ? formatOrderDate(step.completedAt as string) : isCurrent ? 'In progress' : 'Waiting'}</p>
                                </div>
                              </div>
                              <p className="mt-4 text-sm leading-6 text-slate-300">{step.description}</p>
                            </article>
                          );
                        })}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_320px]">
                      <div className="space-y-5">
                        <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/35 p-5">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Live Map View</p>
                              <p className="mt-2 text-sm text-slate-300">{selectedOrder.latestAgentLocation ? `${selectedOrder.latestAgentLocation.label} near ${selectedOrder.latestAgentLocation.city}.` : `Map centered on ${selectedOrder.shippingAddress.city}, ${selectedOrder.shippingAddress.state}.`}</p>
                            </div>
                            <MapPinned className="h-5 w-5 text-cyan-100" />
                          </div>
                          <div className="mt-5 overflow-hidden rounded-[1.4rem] border border-white/10">
                            {trackingMapPoint ? <iframe title={`Live map for ${selectedOrder.orderNumber}`} src={`https://www.google.com/maps?q=${trackingMapPoint.lat},${trackingMapPoint.lng}&z=13&output=embed`} className="h-[320px] w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /> : <div className="flex h-[320px] items-center justify-center bg-slate-950/50 text-sm text-slate-300">Live map becomes available after a delivery route is assigned.</div>}
                          </div>
                        </div>

                        <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/35 p-5">
                          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Order Items</p>
                          <div className="mt-5 max-h-[34vh] space-y-3 overflow-y-auto pr-1">
                            {selectedOrder.items.map((item) => (
                              <article key={`${selectedOrder.id}-${item.productId}`} className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-4 sm:flex-row sm:items-center">
                                <div className="h-24 w-full overflow-hidden rounded-[1.25rem] border border-white/10 sm:w-24"><img src={item.image} alt={item.name} loading="lazy" decoding="async" className="h-full w-full object-cover" /></div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="text-lg font-black text-white">{item.name}</h3>
                                  <p className="copy-clamp-2 mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                                  <p className="mt-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">{item.category} · {item.location}</p>
                                </div>
                                <div className="shrink-0 rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4 sm:text-right">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Qty x Price</p>
                                  <p className="mt-2 text-sm font-semibold text-slate-100">{item.quantity} x {formatPrice(item.price)}</p>
                                  <p className="mt-3 text-lg font-black text-white">{formatPrice(item.lineTotal)}</p>
                                </div>
                              </article>
                            ))}
                          </div>
                        </div>
                      </div>

                      <aside className="space-y-5">
                        <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-5">
                          <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Delivery Estimate</p><p className="mt-2 text-2xl font-black text-white">{selectedOrder.estimatedDelivery.label}</p></div><Truck className="h-5 w-5 text-cyan-100" /></div>
                          <p className="mt-3 text-sm leading-6 text-slate-300">Between {formatOrderDate(selectedOrder.estimatedDelivery.etaStart)} and {formatOrderDate(selectedOrder.estimatedDelivery.etaEnd)}.</p>
                        </div>
                        <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-5">
                          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Shipping Address</p>
                          <p className="mt-4 text-sm font-semibold text-white">{selectedOrder.shippingAddress.name}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{selectedOrder.shippingAddress.addressLine}</p>
                          <p className="mt-2 text-sm text-slate-300">{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.pincode}</p>
                          <div className="mt-3 flex items-center gap-2 text-sm text-slate-300"><Phone className="h-4 w-4 text-cyan-100" />{selectedOrder.shippingAddress.phone}</div>
                        </div>
                        <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-5">
                          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Delivery Agent</p>
                          {selectedOrder.deliveryAgent ? (<><p className="mt-4 text-lg font-black text-white">{selectedOrder.deliveryAgent.name}</p><p className="mt-2 text-sm text-slate-300">{selectedOrder.deliveryAgent.email}</p><div className="mt-3 flex items-center gap-2 text-sm text-slate-300"><Phone className="h-4 w-4 text-cyan-100" />{selectedOrder.deliveryAgent.phone}</div></>) : <p className="mt-4 text-sm leading-6 text-slate-300">Nearest available delivery partner will be assigned automatically.</p>}
                        </div>
                        <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-5">
                          <div className="flex items-center justify-between gap-3"><p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Notifications</p><BellRing className="h-4 w-4 text-cyan-100" /></div>
                          <div className="mt-4 space-y-3">
                            {selectedOrder.notifications.length === 0 ? <p className="text-sm leading-6 text-slate-300">Email, SMS, and push delivery updates will appear here.</p> : selectedOrder.notifications.map((notification: NotificationItem) => (
                              <article key={notification.id} className="rounded-[1.2rem] border border-white/10 bg-slate-950/35 px-4 py-4">
                                <p className="text-sm font-black text-white">{notification.title}</p>
                                <p className="mt-2 text-sm leading-6 text-slate-300">{notification.message}</p>
                                <div className="mt-3 flex flex-wrap gap-2">{notification.channels.map((channel) => <span key={`${notification.id}-${channel}`} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-200">{channel}</span>)}</div>
                              </article>
                            ))}
                          </div>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-4 xl:grid-cols-2">
                          <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Subtotal</p><p className="mt-2 text-lg font-black text-white">{formatPrice(selectedOrder.subtotal)}</p></div>
                          <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Shipping</p><p className="mt-2 text-lg font-black text-white">{formatPrice(selectedOrder.shipping)}</p></div>
                          <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.05] px-4 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Tax</p><p className="mt-2 text-lg font-black text-white">{formatPrice(selectedOrder.tax)}</p></div>
                          <div className="rounded-[1.25rem] border border-cyan-200/20 bg-cyan-200/10 px-4 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.24em] text-cyan-100/70">Grand Total</p><p className="mt-2 text-lg font-black text-white">{formatPrice(selectedOrder.total)}</p></div>
                        </div>
                      </aside>
                    </div>
                  </>
                ) : (
                  <div className="flex min-h-[24rem] flex-col items-center justify-center text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-white/10 bg-white/[0.05] text-cyan-100"><PackageSearch className="h-10 w-10" /></div>
                    <h3 className="mt-6 text-2xl font-black text-white">Choose an order</h3>
                    <p className="mt-3 max-w-md text-sm leading-6 text-slate-300">Select an order card to review the timeline, live map, notifications, and delivery details.</p>
                  </div>
                )}
              </section>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_320px]">
              <section className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3"><div><p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Change Password</p><h2 className="mt-3 text-3xl font-black text-white">Update your account security</h2></div><span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-200/10 text-cyan-100"><KeyRound className="h-5 w-5" /></span></div>
                <form className="mt-6 space-y-4" onSubmit={handlePasswordSubmit}>
                  <label className="block"><span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Current Password</span><input type="password" value={passwordForm.currentPassword} onChange={(event) => handlePasswordFieldChange('currentPassword', event.target.value)} className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300/40" autoComplete="current-password" /></label>
                  <label className="block"><span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">New Password</span><input type="password" value={passwordForm.newPassword} onChange={(event) => handlePasswordFieldChange('newPassword', event.target.value)} className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300/40" autoComplete="new-password" /></label>
                  <label className="block"><span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Confirm Password</span><input type="password" value={passwordForm.confirmPassword} onChange={(event) => handlePasswordFieldChange('confirmPassword', event.target.value)} className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none transition-colors focus:border-cyan-300/40" autoComplete="new-password" /></label>
                  {passwordError && <p className="rounded-[1.2rem] border border-red-300/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">{passwordError}</p>}
                  {passwordSuccess && <p className="rounded-[1.2rem] border border-emerald-300/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100">{passwordSuccess}</p>}
                  <button type="submit" disabled={isPasswordSubmitting} className={`inline-flex w-full items-center justify-center gap-2 rounded-[1.35rem] bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 px-5 py-4 text-sm font-black text-slate-950 shadow-[0_22px_42px_-30px_rgba(103,232,249,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_48px_-30px_rgba(236,72,153,0.75)] ${isPasswordSubmitting ? 'opacity-70' : ''}`}>{isPasswordSubmitting ? <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" />Updating Password</span> : <><ShieldCheck className="h-4 w-4" />Save New Password</>}</button>
                </form>
              </section>

              <aside className="space-y-5">
                <div className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Security Notes</p>
                  <div className="mt-5 space-y-4 text-sm leading-6 text-slate-300">
                    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-4 py-4"><p className="font-semibold text-white">Minimum 8 characters</p><p className="mt-2">Choose a new password that is strong, memorable, and different from your current one.</p></div>
                    <div className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-4 py-4"><p className="font-semibold text-white">Protected backend update</p><p className="mt-2">This form calls the authenticated password API so your password hash is updated securely on the server.</p></div>
                  </div>
                </div>
                <button type="button" onClick={() => setActiveTab('profile')} className="inline-flex w-full items-center justify-center gap-2 rounded-[1.35rem] border border-white/10 bg-white/[0.06] px-4 py-4 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.1]">Back to Profile<ArrowRight className="h-4 w-4" /></button>
              </aside>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProfilePage;
