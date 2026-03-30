import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Boxes,
  FilePenLine,
  IndianRupee,
  LayoutDashboard,
  Plus,
  Search,
  ShieldBan,
  ShoppingCart,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  X,
} from 'lucide-react';
import {
  AdminAnalytics,
  AdminCatalogSection,
  AdminOrder,
  AdminProduct,
  AdminUserRecord,
  Product,
  User,
} from '../types';
import {
  AdminProductFilters,
  AdminProductInput,
  createAdminProduct,
  deleteAdminProduct,
  getAdminAnalytics,
  getAdminOrders,
  getAdminProducts,
  getAdminUsers,
  setAdminUserBlocked,
  updateAdminOrderStatus,
  updateAdminProduct,
} from '../services/adminService';
import { formatPrice } from '../utils/currency';
import { INDIAN_LOCATION_OPTIONS } from '../utils/india';

type AdminPage = 'dashboard' | 'products' | 'orders' | 'users';

interface AdminPanelProps {
  user: User;
  onCatalogUpdated: (products: Product[]) => void;
}

interface ProductFormState {
  name: string;
  price: number;
  section: AdminCatalogSection;
  gender: Product['gender'];
  category: string;
  description: string;
  stock: number;
  rating: number;
  location: Product['location'];
  images: string[];
}

const ADMIN_PAGES: Array<{ id: AdminPage; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Boxes },
  { id: 'orders', label: 'Orders', icon: ShoppingCart },
  { id: 'users', label: 'Users', icon: Users },
];

const PRODUCT_SECTIONS: AdminCatalogSection[] = ['Men', 'Women', 'Shoes', 'Suit'];
const ORDER_STATUS_OPTIONS: Array<Extract<AdminOrder['status'], 'packed' | 'shipped' | 'out_for_delivery' | 'delivered'>> = [
  'packed',
  'shipped',
  'out_for_delivery',
  'delivered',
];

const createEmptyProductForm = (): ProductFormState => ({
  name: '',
  price: 450,
  section: 'Men',
  gender: 'men',
  category: '',
  description: '',
  stock: 12,
  rating: 4.6,
  location: 'Kolkata',
  images: [],
});

const formatDateTime = (value: string | null) => {
  if (!value) {
    return 'No activity yet';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
    reader.readAsDataURL(file);
  });

const getStatusStyles = (status: AdminOrder['status']) => {
  if (status === 'delivered') {
    return 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100';
  }

  if (status === 'out_for_delivery') {
    return 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100';
  }

  if (status === 'shipped') {
    return 'border-indigo-300/20 bg-indigo-400/10 text-indigo-100';
  }

  return 'border-amber-300/20 bg-amber-300/10 text-amber-50';
};

const formatStatus = (status: AdminOrder['status']) =>
  status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const ChartPanel: React.FC<{
  title: string;
  subtitle: string;
  data: Array<{ label: string; revenue: number; orders: number }>;
  variant: 'line' | 'bar';
  metric?: 'revenue' | 'orders';
}> = ({ title, subtitle, data, variant, metric = 'revenue' }) => {
  const chartData = data.length > 0 ? data : [{ label: 'No data', revenue: 0, orders: 0 }];
  const getValue = (point: { label: string; revenue: number; orders: number }) =>
    metric === 'orders' ? point.orders : point.revenue;
  const maxValue = Math.max(...chartData.map((point) => getValue(point)), 1);
  const points = chartData.map((point, index) => {
    const pointValue = getValue(point);
    const x = chartData.length === 1 ? 150 : (index / Math.max(chartData.length - 1, 1)) * 280 + 10;
    const y = 120 - (pointValue / maxValue) * 95 + 10;
    return { x, y, ...point };
  });

  return (
    <section className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{subtitle}</p>
        </div>
        <BarChart3 className="h-5 w-5 text-cyan-100" />
      </div>

      <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/35 p-4">
        <svg viewBox="0 0 320 150" className="h-44 w-full">
          {[20, 50, 80, 110].map((y) => (
            <line key={`${title}-${y}`} x1="10" y1={y} x2="300" y2={y} stroke="rgba(148,163,184,0.18)" strokeDasharray="4 4" />
          ))}
          {variant === 'line' ? (
            <>
              <polyline
                fill="none"
                stroke="rgba(34,211,238,0.9)"
                strokeWidth="4"
                points={points.map((point) => `${point.x},${point.y}`).join(' ')}
              />
              {points.map((point) => (
                <circle key={`${title}-${point.label}`} cx={point.x} cy={point.y} r="4.5" fill="rgba(236,72,153,0.9)" />
              ))}
            </>
          ) : (
            points.map((point, index) => (
              <rect
                key={`${title}-${point.label}`}
                x={20 + index * 40}
                y={130 - (getValue(point) / maxValue) * 95}
                width="24"
                height={(getValue(point) / maxValue) * 95}
                rx="10"
                fill="rgba(125,211,252,0.8)"
              />
            ))
          )}
        </svg>

        <div className="mt-4 flex flex-wrap gap-2">
          {chartData.map((point) => (
            <span key={`${title}-${point.label}-legend`} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-semibold text-slate-300">
              {point.label}: {metric === 'orders' ? `${point.orders} orders` : formatPrice(point.revenue)}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};

const AdminPanel: React.FC<AdminPanelProps> = ({ user, onCatalogUpdated }) => {
  const [activePage, setActivePage] = useState<AdminPage>('dashboard');
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);
  const [panelNotice, setPanelNotice] = useState<string | null>(null);
  const [productFilters, setProductFilters] = useState<AdminProductFilters>({
    q: '',
    section: 'All',
    minPrice: 400,
    maxPrice: 500,
    stock: 'all',
  });
  const [isProductEditorOpen, setIsProductEditorOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductFormState>(createEmptyProductForm);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isProductSubmitting, setIsProductSubmitting] = useState(false);
  const [isOrderUpdatingId, setIsOrderUpdatingId] = useState<string | null>(null);
  const [isUserUpdatingId, setIsUserUpdatingId] = useState<string | null>(null);
  const [isProductDeletingId, setIsProductDeletingId] = useState<string | null>(null);

  const metricCards = useMemo(
    () =>
      analytics
        ? [
            { label: 'Total Users', value: analytics.summary.totalUsers.toLocaleString('en-IN'), icon: Users },
            { label: 'Total Orders', value: analytics.summary.totalOrders.toLocaleString('en-IN'), icon: ShoppingCart },
            { label: 'Total Revenue', value: formatPrice(analytics.summary.totalRevenue), icon: IndianRupee },
            { label: 'Total Products', value: analytics.summary.totalProducts.toLocaleString('en-IN'), icon: Boxes },
          ]
        : [],
    [analytics]
  );

  const syncStorefrontCatalog = async () => {
    const nextCatalog = await getAdminProducts();
    onCatalogUpdated(nextCatalog);
  };

  const loadProducts = async (filters: AdminProductFilters) => {
    setIsProductsLoading(true);

    try {
      setProducts(await getAdminProducts(filters));
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Unable to load products.');
    } finally {
      setIsProductsLoading(false);
    }
  };

  const loadAllAdminData = async () => {
    setIsBootstrapping(true);
    setPanelError(null);

    try {
      const [nextAnalytics, nextProducts, nextOrders, nextUsers] = await Promise.all([
        getAdminAnalytics(),
        getAdminProducts(productFilters),
        getAdminOrders(),
        getAdminUsers(),
      ]);

      setAnalytics(nextAnalytics);
      setProducts(nextProducts);
      setOrders(nextOrders);
      setUsers(nextUsers);
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Unable to load admin data.');
    } finally {
      setIsBootstrapping(false);
    }
  };

  useEffect(() => {
    void loadAllAdminData();
  }, []);

  useEffect(() => {
    if (isBootstrapping) {
      return;
    }

    void loadProducts(productFilters);
  }, [productFilters.q, productFilters.section, productFilters.minPrice, productFilters.maxPrice, productFilters.stock]);

  const closeProductEditor = () => {
    setIsProductEditorOpen(false);
    setEditingProductId(null);
    setProductForm(createEmptyProductForm());
    setImageUrlInput('');
  };

  const openCreateProduct = () => {
    setPanelError(null);
    setPanelNotice(null);
    setEditingProductId(null);
    setProductForm(createEmptyProductForm());
    setImageUrlInput('');
    setIsProductEditorOpen(true);
  };

  const openEditProduct = (product: AdminProduct) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      price: product.price,
      section: product.section,
      gender: product.gender,
      category: product.category,
      description: product.description,
      stock: product.stock,
      rating: product.rating,
      location: product.location,
      images: product.images && product.images.length > 0 ? [...product.images] : [product.image],
    });
    setImageUrlInput('');
    setIsProductEditorOpen(true);
  };

  const handleProductFieldChange = <K extends keyof ProductFormState>(field: K, value: ProductFormState[K]) => {
    setProductForm((current) => {
      const nextState = { ...current, [field]: value };
      if (field === 'section') {
        if (value === 'Women') {
          nextState.gender = 'women';
        }
        if (value === 'Men' || value === 'Suit') {
          nextState.gender = 'men';
        }
      }
      return nextState;
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []).slice(0, 6);
    if (files.length === 0) {
      return;
    }

    try {
      const uploadedImages = await Promise.all(files.map((file) => readFileAsDataUrl(file)));
      setProductForm((current) => ({
        ...current,
        images: Array.from(new Set([...current.images, ...uploadedImages])).slice(0, 6),
      }));
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Unable to upload images.');
    } finally {
      event.target.value = '';
    }
  };

  const handleAddImageUrls = () => {
    const nextUrls = imageUrlInput
      .split(/\r?\n|,/)
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (nextUrls.length === 0) {
      return;
    }

    setProductForm((current) => ({
      ...current,
      images: Array.from(new Set([...current.images, ...nextUrls])).slice(0, 6),
    }));
    setImageUrlInput('');
  };

  const handleRemoveImage = (image: string) => {
    setProductForm((current) => ({
      ...current,
      images: current.images.filter((entry) => entry !== image),
    }));
  };

  const handleSaveProduct = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPanelError(null);
    setPanelNotice(null);
    setIsProductSubmitting(true);

    const payload: AdminProductInput = {
      ...productForm,
      gender: productForm.section === 'Shoes' ? productForm.gender : productForm.section === 'Women' ? 'women' : 'men',
    };

    try {
      if (editingProductId) {
        await updateAdminProduct(editingProductId, payload);
        setPanelNotice('Product updated successfully.');
      } else {
        await createAdminProduct(payload);
        setPanelNotice('Product created successfully.');
      }

      await Promise.all([loadProducts(productFilters), syncStorefrontCatalog()]);
      setAnalytics(await getAdminAnalytics());
      closeProductEditor();
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Unable to save product.');
    } finally {
      setIsProductSubmitting(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    setPanelError(null);
    setPanelNotice(null);
    setIsProductDeletingId(productId);

    try {
      await deleteAdminProduct(productId);
      await Promise.all([loadProducts(productFilters), syncStorefrontCatalog()]);
      setAnalytics(await getAdminAnalytics());
      setPanelNotice('Product deleted successfully.');
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Unable to delete product.');
    } finally {
      setIsProductDeletingId(null);
    }
  };

  const handleOrderStatusChange = async (orderId: string, status: Extract<AdminOrder['status'], 'packed' | 'shipped' | 'out_for_delivery' | 'delivered'>) => {
    setPanelError(null);
    setPanelNotice(null);
    setIsOrderUpdatingId(orderId);

    try {
      const updatedOrder = await updateAdminOrderStatus(orderId, status);
      setOrders((current) => current.map((order) => (order.id === updatedOrder.id ? updatedOrder : order)));
      setAnalytics(await getAdminAnalytics());
      setPanelNotice(`Order marked as ${formatStatus(status)}.`);
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Unable to update order status.');
    } finally {
      setIsOrderUpdatingId(null);
    }
  };

  const handleToggleUserBlock = async (account: AdminUserRecord) => {
    setPanelError(null);
    setPanelNotice(null);
    setIsUserUpdatingId(account.id);

    try {
      const updatedUser = await setAdminUserBlocked(account.id, !account.isBlocked);
      setUsers((current) => current.map((entry) => (entry.id === updatedUser.id ? updatedUser : entry)));
      setAnalytics(await getAdminAnalytics());
      setPanelNotice(updatedUser.isBlocked ? 'User blocked successfully.' : 'User unblocked successfully.');
    } catch (error) {
      setPanelError(error instanceof Error ? error.message : 'Unable to update user access.');
    } finally {
      setIsUserUpdatingId(null);
    }
  };

  const dashboardContent = (
    <div className="space-y-5">
      <section className="commerce-card-surface rounded-[2rem] border border-white/10 p-6 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-100/70">Business Snapshot</p>
            <h2 className="mt-3 text-3xl font-black text-white">Monitor store health in real time</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Track revenue, orders, catalog volume, and customer activity from one admin surface built for quick decisions.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-cyan-200/15 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-50">
            <p className="font-black uppercase tracking-[0.22em] text-cyan-100/80">Signed in</p>
            <p className="mt-1 font-semibold">{user.email}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((card) => {
            const Icon = card.icon;

            return (
              <article key={card.label} className="rounded-[1.7rem] border border-white/10 bg-white/[0.05] p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">{card.label}</p>
                    <p className="mt-4 text-3xl font-black text-white">{card.value}</p>
                  </div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.08] text-cyan-100">
                    <Icon className="h-6 w-6" />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
        <div className="space-y-5">
          <div className="grid gap-5 xl:grid-cols-2">
            <ChartPanel
              title="Sales Over Time"
              subtitle="Daily revenue over the last seven days."
              data={analytics?.salesOverTime ?? []}
              variant="line"
              metric="revenue"
            />
            <ChartPanel
              title="Orders Per Day"
              subtitle="Daily order flow over the last seven days."
              data={analytics?.salesOverTime ?? []}
              variant="bar"
              metric="orders"
            />
          </div>

          <section className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Recent Orders</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Latest purchases with fulfillment visibility and customer details.</p>
              </div>
              <ShoppingCart className="h-5 w-5 text-cyan-100" />
            </div>

            <div className="mt-6 space-y-3">
              {(analytics?.recentOrders ?? []).length > 0 ? (
                analytics?.recentOrders.map((order) => (
                  <article
                    key={order.id}
                    className="rounded-[1.45rem] border border-white/10 bg-slate-950/30 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-black text-white">{order.orderNumber}</p>
                          <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${getStatusStyles(order.status)}`}>
                            {formatStatus(order.status)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">
                          {order.customer?.name ?? 'Unknown customer'} | {order.itemCount} items | {formatPrice(order.total)}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {order.shippingAddress.city}, {order.shippingAddress.state} | {formatDateTime(order.createdAt)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Delivery</p>
                        <p className="mt-1 text-sm font-semibold text-slate-200">{order.estimatedDelivery.label}</p>
                        <p className="mt-1 text-xs text-slate-400">
                          Agent: {order.deliveryAgent?.name ?? 'Assignment pending'}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.45rem] border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center text-sm text-slate-400">
                  Orders will appear here once customers begin checking out.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">New Users</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Fresh registrations and their early account activity.</p>
              </div>
              <Users className="h-5 w-5 text-cyan-100" />
            </div>

            <div className="mt-6 space-y-3">
              {(analytics?.newUsers ?? []).length > 0 ? (
                analytics?.newUsers.map((account) => (
                  <article key={account.id} className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">{account.name}</p>
                        <p className="mt-1 truncate text-xs text-slate-400">{account.email}</p>
                      </div>
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${account.isBlocked ? 'border-rose-300/20 bg-rose-400/10 text-rose-100' : 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'}`}>
                        {account.isBlocked ? 'Blocked' : account.role}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                      <span>{account.ordersCount} orders</span>
                      <span>{formatDateTime(account.createdAt)}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.45rem] border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center text-sm text-slate-400">
                  New registrations will populate here automatically.
                </div>
              )}
            </div>
          </section>

          <section className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Weekly Revenue</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Four-week trend for quick health checks.</p>
              </div>
              <TrendingUp className="h-5 w-5 text-cyan-100" />
            </div>

            <div className="mt-6 space-y-3">
              {(analytics?.weeklySales ?? []).length > 0 ? (
                analytics?.weeklySales.map((point) => (
                  <div key={point.label} className="rounded-[1.35rem] border border-white/10 bg-slate-950/25 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-white">{point.label}</p>
                      <p className="text-sm font-semibold text-cyan-100">{formatPrice(point.revenue)}</p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300"
                        style={{
                          width: `${Math.max(
                            12,
                            analytics
                              ? (point.revenue / Math.max(...analytics.weeklySales.map((entry) => entry.revenue), 1)) * 100
                              : 12
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{point.orders} orders</p>
                  </div>
                ))
              ) : (
                <div className="rounded-[1.45rem] border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center text-sm text-slate-400">
                  Weekly sales analytics will show after orders are placed.
                </div>
              )}
            </div>
          </section>

          <section className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Best Sellers</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">Top movers by units sold and revenue contribution.</p>
              </div>
              <Boxes className="h-5 w-5 text-cyan-100" />
            </div>

            <div className="mt-6 space-y-3">
              {(analytics?.bestSellingProducts ?? []).length > 0 ? (
                analytics?.bestSellingProducts.map((product, index) => (
                  <article key={product.productId} className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">#{index + 1} performer</p>
                        <p className="mt-2 truncate text-sm font-black text-white">{product.name}</p>
                      </div>
                      <p className="text-sm font-semibold text-cyan-100">{formatPrice(product.revenue)}</p>
                    </div>
                    <p className="mt-3 text-xs text-slate-400">{product.unitsSold} units sold</p>
                  </article>
                ))
              ) : (
                <div className="rounded-[1.45rem] border border-dashed border-white/10 bg-white/[0.03] px-5 py-10 text-center text-sm text-slate-400">
                  Best sellers will populate after checkout data accumulates.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
  const productsContent = (
    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
      <div className="space-y-5">
        <section className="commerce-card-surface rounded-[2rem] border border-white/10 p-5 sm:p-6">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Catalog System</p>
              <h2 className="mt-3 text-3xl font-black text-white">Manage premium product listings</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Create, refine, and retire products while keeping pricing, Indian delivery coverage, and catalog placement consistent.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateProduct}
              className="inline-flex items-center justify-center gap-2 rounded-[1.25rem] bg-white px-5 py-3 text-sm font-black text-slate-950 transition-all duration-300 hover:translate-y-[-1px] hover:bg-cyan-100"
            >
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="md:col-span-2 xl:col-span-2">
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Search</span>
              <div className="flex items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  value={productFilters.q ?? ''}
                  onChange={(event) =>
                    setProductFilters((current) => ({
                      ...current,
                      q: event.target.value,
                    }))
                  }
                  placeholder="Search by name, section, or description"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>
            </label>

            <label>
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Section</span>
              <select
                value={productFilters.section ?? 'All'}
                onChange={(event) =>
                  setProductFilters((current) => ({
                    ...current,
                    section: event.target.value as AdminProductFilters['section'],
                  }))
                }
                className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white outline-none"
              >
                <option value="All">All sections</option>
                {PRODUCT_SECTIONS.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Min Price</span>
              <input
                type="number"
                min={400}
                max={500}
                value={productFilters.minPrice ?? 400}
                onChange={(event) =>
                  setProductFilters((current) => ({
                    ...current,
                    minPrice: Number(event.target.value || 400),
                  }))
                }
                className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white outline-none"
              />
            </label>

            <label>
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Max Price</span>
              <input
                type="number"
                min={400}
                max={500}
                value={productFilters.maxPrice ?? 500}
                onChange={(event) =>
                  setProductFilters((current) => ({
                    ...current,
                    maxPrice: Number(event.target.value || 500),
                  }))
                }
                className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white outline-none"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <label>
              <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Stock Status</span>
              <select
                value={productFilters.stock ?? 'all'}
                onChange={(event) =>
                  setProductFilters((current) => ({
                    ...current,
                    stock: event.target.value as AdminProductFilters['stock'],
                  }))
                }
                className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white outline-none"
              >
                <option value="all">All inventory</option>
                <option value="in_stock">In stock</option>
                <option value="low_stock">Low stock</option>
                <option value="out_of_stock">Out of stock</option>
              </select>
            </label>

            <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Visible Results</p>
              <p className="mt-2 text-2xl font-black text-white">{products.length}</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          {isProductsLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`product-skeleton-${index}`}
                  className="overflow-hidden rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="h-52 animate-pulse rounded-[1.4rem] bg-white/10" />
                  <div className="mt-4 h-4 w-32 animate-pulse rounded-full bg-white/10" />
                  <div className="mt-3 h-3 w-full animate-pulse rounded-full bg-white/10" />
                  <div className="mt-2 h-3 w-4/5 animate-pulse rounded-full bg-white/10" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="commerce-card-surface overflow-hidden rounded-[1.9rem] border border-white/10"
                >
                  <div className="relative">
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      className="h-56 w-full object-cover"
                    />
                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-100">
                        {product.section}
                      </span>
                      {(product.badges ?? []).map((badge) => (
                        <span
                          key={`${product.id}-${badge}`}
                          className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${
                            badge === 'Out of Stock'
                              ? 'border-rose-300/20 bg-rose-400/15 text-rose-100'
                              : badge === 'Trending'
                                ? 'border-amber-300/20 bg-amber-300/15 text-amber-50'
                                : 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'
                          }`}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-lg font-black text-white">{product.name}</p>
                        <p className="mt-1 text-sm font-semibold text-cyan-100">{formatPrice(product.price)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-200">{product.rating.toFixed(1)} / 5</p>
                        <p className="text-xs text-slate-400">{product.reviewsCount} reviews</p>
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-300">{product.description}</p>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{product.category}</span>
                      <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">{product.location}</span>
                      <span className={`rounded-full border px-3 py-1 ${product.stock <= 0 ? 'border-rose-300/20 bg-rose-400/10 text-rose-100' : product.stock <= 8 ? 'border-amber-300/20 bg-amber-300/10 text-amber-50' : 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'}`}>
                        {product.stock} in stock
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => openEditProduct(product)}
                        className="inline-flex items-center justify-center gap-2 rounded-[1.15rem] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08]"
                      >
                        <FilePenLine className="h-4 w-4" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteProduct(product.id)}
                        disabled={isProductDeletingId === product.id}
                        className="inline-flex items-center justify-center gap-2 rounded-[1.15rem] border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm font-bold text-rose-100 transition-all duration-300 hover:border-rose-300/40 hover:bg-rose-400/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        {isProductDeletingId === product.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center">
              <p className="text-lg font-black text-white">No products matched these filters.</p>
              <p className="mt-3 text-sm text-slate-400">Try widening price or stock filters, or create a new product.</p>
            </div>
          )}
        </section>
      </div>

      <aside className="2xl:sticky 2xl:top-24 2xl:self-start">
        <section className="commerce-card-surface rounded-[2rem] border border-white/10 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">
                {editingProductId ? 'Edit Product' : 'Create Product'}
              </p>
              <h3 className="mt-3 text-2xl font-black text-white">
                {editingProductId ? 'Update listing details' : 'Add a new catalog item'}
              </h3>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Keep prices inside the ₹400 to ₹500 range and assign a valid India-only delivery location.
              </p>
            </div>

            {isProductEditorOpen && (
              <button
                type="button"
                onClick={closeProductEditor}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition-all duration-300 hover:border-white/20 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>

          {!isProductEditorOpen ? (
            <div className="mt-8 rounded-[1.6rem] border border-dashed border-white/10 bg-white/[0.03] px-5 py-12 text-center">
              <p className="text-lg font-black text-white">Open the product editor</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Choose any product card to edit it, or start a new listing from scratch.
              </p>
              <button
                type="button"
                onClick={openCreateProduct}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-[1.2rem] bg-white px-5 py-3 text-sm font-black text-slate-950 transition-all duration-300 hover:translate-y-[-1px] hover:bg-cyan-100"
              >
                <Plus className="h-4 w-4" />
                New Product
              </button>
            </div>
          ) : (
            <form onSubmit={(event) => void handleSaveProduct(event)} className="mt-8 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="md:col-span-2">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Product Name</span>
                  <input
                    value={productForm.name}
                    onChange={(event) => handleProductFieldChange('name', event.target.value)}
                    placeholder="Example: Kolkata Street Sneaker"
                    className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Section</span>
                  <select
                    value={productForm.section}
                    onChange={(event) => handleProductFieldChange('section', event.target.value as AdminCatalogSection)}
                    className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white outline-none"
                  >
                    {PRODUCT_SECTIONS.map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Category</span>
                  <input
                    value={productForm.category}
                    onChange={(event) => handleProductFieldChange('category', event.target.value)}
                    placeholder="Men, Women, Shoes, Suit"
                    className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Price (₹)</span>
                  <input
                    type="number"
                    min={400}
                    max={500}
                    value={productForm.price}
                    onChange={(event) => handleProductFieldChange('price', Number(event.target.value || 450))}
                    className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Stock</span>
                  <input
                    type="number"
                    min={0}
                    value={productForm.stock}
                    onChange={(event) => handleProductFieldChange('stock', Number(event.target.value || 0))}
                    className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Rating</span>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    step={0.1}
                    value={productForm.rating}
                    onChange={(event) => handleProductFieldChange('rating', Number(event.target.value || 0))}
                    className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none"
                  />
                </label>

                <label>
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Gender Mapping</span>
                  <select
                    value={productForm.gender}
                    onChange={(event) => handleProductFieldChange('gender', event.target.value as Product['gender'])}
                    className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white outline-none"
                  >
                    <option value="men">Men</option>
                    <option value="women">Women</option>
                  </select>
                </label>

                <label className="md:col-span-2">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Fulfillment City</span>
                  <select
                    value={productForm.location}
                    onChange={(event) => handleProductFieldChange('location', event.target.value as Product['location'])}
                    className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white outline-none"
                  >
                    {INDIAN_LOCATION_OPTIONS.map((location) => (
                      <option key={location.city} value={location.city}>
                        {location.city}, {location.state}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="md:col-span-2">
                  <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Description</span>
                  <textarea
                    rows={4}
                    value={productForm.description}
                    onChange={(event) => handleProductFieldChange('description', event.target.value)}
                    placeholder="Add a short premium description for the product card and PDP."
                    className="w-full rounded-[1.25rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                </label>
              </div>

              <div className="space-y-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-white">Product Images</p>
                    <p className="mt-1 text-xs text-slate-400">Upload files or paste image URLs. Up to 6 images supported.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-[1.1rem] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-white transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08]">
                    <Upload className="h-4 w-4" />
                    Upload Images
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      multiple
                      onChange={(event) => void handleImageUpload(event)}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <textarea
                    rows={3}
                    value={imageUrlInput}
                    onChange={(event) => setImageUrlInput(event.target.value)}
                    placeholder="Paste one or more image URLs, separated by commas or new lines"
                    className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/35 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrls}
                    className="rounded-[1.2rem] border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-bold text-white transition-all duration-300 hover:border-white/20 hover:bg-white/[0.08]"
                  >
                    Add URLs
                  </button>
                </div>

                {productForm.images.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {productForm.images.map((image, index) => (
                      <div key={`${image}-${index}`} className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-slate-950/30">
                        <img src={image} alt={`Preview ${index + 1}`} className="h-36 w-full object-cover" />
                        <div className="flex items-center justify-between px-3 py-3">
                          <p className="text-xs font-semibold text-slate-300">Image {index + 1}</p>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(image)}
                            className="inline-flex items-center gap-1 rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-rose-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[1.25rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-8 text-center text-sm text-slate-400">
                    Add at least one product image to publish the listing.
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isProductSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-white px-5 py-3.5 text-sm font-black text-slate-950 transition-all duration-300 hover:translate-y-[-1px] hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {editingProductId ? <FilePenLine className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {isProductSubmitting ? 'Saving product...' : editingProductId ? 'Update Product' : 'Create Product'}
              </button>
            </form>
          )}
        </section>
      </aside>
    </div>
  );
  const ordersContent = (
    <div className="space-y-5">
      <section className="commerce-card-surface rounded-[2rem] border border-white/10 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Fulfillment Control</p>
            <h2 className="mt-3 text-3xl font-black text-white">Track and move orders forward</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Review customer details, shipping destinations, assigned agents, and update order status with no page reload.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Total Orders</p>
            <p className="mt-2 text-2xl font-black text-white">{orders.length}</p>
          </div>
        </div>
      </section>

      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => {
            const editableStatus = ORDER_STATUS_OPTIONS.includes(order.status as (typeof ORDER_STATUS_OPTIONS)[number])
              ? (order.status as (typeof ORDER_STATUS_OPTIONS)[number])
              : 'packed';

            return (
              <article key={order.id} className="commerce-card-surface rounded-[2rem] border border-white/10 p-5 sm:p-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-black text-white">{order.orderNumber}</h3>
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${getStatusStyles(order.status)}`}>
                        {formatStatus(order.status)}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Customer</p>
                        <p className="mt-2 text-sm font-black text-white">{order.customer?.name ?? 'Unknown customer'}</p>
                        <p className="mt-1 text-xs text-slate-400">{order.customer?.email ?? 'No email available'}</p>
                      </div>

                      <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Order Value</p>
                        <p className="mt-2 text-sm font-black text-white">{formatPrice(order.total)}</p>
                        <p className="mt-1 text-xs text-slate-400">{order.itemCount} items</p>
                      </div>

                      <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Ship To</p>
                        <p className="mt-2 text-sm font-black text-white">{order.shippingAddress.city}</p>
                        <p className="mt-1 text-xs text-slate-400">{order.shippingAddress.state}</p>
                      </div>

                      <div className="rounded-[1.35rem] border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">ETA</p>
                        <p className="mt-2 text-sm font-black text-white">{order.estimatedDelivery.label}</p>
                        <p className="mt-1 text-xs text-slate-400">{formatDateTime(order.updatedAt)}</p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-slate-950/30 p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Ordered Items</p>
                          <div className="mt-3 space-y-3">
                            {order.items.map((item) => (
                              <div key={`${order.id}-${item.productId}`} className="flex items-center gap-3 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-3">
                                <img src={item.image} alt={item.name} className="h-14 w-14 rounded-2xl object-cover" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-black text-white">{item.name}</p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    Qty {item.quantity} | {item.location} | {formatPrice(item.lineTotal)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="w-full lg:max-w-xs">
                          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Shipment & Agent</p>
                          <div className="mt-3 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                            <p className="text-sm font-black text-white">{order.deliveryAgent?.name ?? 'Agent pending'}</p>
                            <p className="mt-1 text-xs text-slate-400">{order.deliveryAgent?.email ?? 'Agent will be assigned automatically.'}</p>
                            <p className="mt-3 text-xs text-slate-300">
                              {order.latestAgentLocation
                                ? `${order.latestAgentLocation.label} | ${order.latestAgentLocation.city}, ${order.latestAgentLocation.state}`
                                : 'Live location not shared yet.'}
                            </p>
                            {order.latestAgentLocation && (
                              <p className="mt-1 text-[11px] text-slate-500">
                                Updated {formatDateTime(order.latestAgentLocation.updatedAt)}
                              </p>
                            )}
                          </div>

                          <label className="mt-4 block">
                            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Update Status</span>
                            <select
                              value={editableStatus}
                              onChange={(event) =>
                                void handleOrderStatusChange(
                                  order.id,
                                  event.target.value as (typeof ORDER_STATUS_OPTIONS)[number]
                                )
                              }
                              disabled={isOrderUpdatingId === order.id || order.status === 'delivered'}
                              className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/35 px-4 py-3 text-sm font-semibold text-white outline-none disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {ORDER_STATUS_OPTIONS.map((status) => (
                                <option key={status} value={status}>
                                  {formatStatus(status)}
                                </option>
                              ))}
                            </select>
                          </label>
                          {isOrderUpdatingId === order.id && (
                            <p className="mt-2 text-xs text-cyan-100">Updating order status...</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center">
          <p className="text-lg font-black text-white">No orders yet.</p>
          <p className="mt-3 text-sm text-slate-400">Once customers check out, order management controls will appear here.</p>
        </div>
      )}
    </div>
  );
  const usersContent = (
    <div className="space-y-5">
      <section className="commerce-card-surface rounded-[2rem] border border-white/10 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Account Access</p>
            <h2 className="mt-3 text-3xl font-black text-white">Manage user permissions safely</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              Review customer activity, spot high-value members, and block or unblock access without touching admin accounts.
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Accounts</p>
            <p className="mt-2 text-2xl font-black text-white">{users.length}</p>
          </div>
        </div>
      </section>

      {users.length > 0 ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {users.map((account) => {
            const isProtectedAccount = account.id === user.id || account.role === 'admin';

            return (
              <article key={account.id} className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-lg font-black text-white">{account.name}</p>
                      <span className={`rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${account.isBlocked ? 'border-rose-300/20 bg-rose-400/10 text-rose-100' : 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'}`}>
                        {account.isBlocked ? 'Blocked' : account.role}
                      </span>
                    </div>
                    <p className="mt-2 truncate text-sm text-slate-400">{account.email}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleToggleUserBlock(account)}
                    disabled={isProtectedAccount || isUserUpdatingId === account.id}
                    className={`inline-flex items-center justify-center gap-2 rounded-[1.1rem] border px-4 py-3 text-sm font-bold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-60 ${
                      account.isBlocked
                        ? 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100 hover:border-emerald-300/40 hover:bg-emerald-400/15'
                        : 'border-rose-300/20 bg-rose-400/10 text-rose-100 hover:border-rose-300/40 hover:bg-rose-400/15'
                    }`}
                  >
                    <ShieldBan className="h-4 w-4" />
                    {isUserUpdatingId === account.id ? 'Saving...' : account.isBlocked ? 'Unblock' : 'Block'}
                  </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Orders</p>
                    <p className="mt-2 text-lg font-black text-white">{account.ordersCount}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Total Spend</p>
                    <p className="mt-2 text-lg font-black text-white">{formatPrice(account.totalSpend)}</p>
                  </div>
                  <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Last Order</p>
                    <p className="mt-2 text-sm font-black text-white">{formatDateTime(account.lastOrderAt)}</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                  <span>Joined {formatDateTime(account.createdAt)}</span>
                  <span>{isProtectedAccount ? 'Protected account' : 'Standard customer access'}</span>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-white/10 bg-white/[0.03] px-6 py-16 text-center">
          <p className="text-lg font-black text-white">No user records available.</p>
          <p className="mt-3 text-sm text-slate-400">User registrations will appear here as soon as accounts are created.</p>
        </div>
      )}
    </div>
  );

  if (isBootstrapping) {
    return (
      <div className="py-12">
        <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
            <div className="mt-5 h-8 w-40 animate-pulse rounded-full bg-white/10" />
            <div className="mt-8 space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`admin-nav-skeleton-${index}`} className="h-20 animate-pulse rounded-[1.4rem] bg-white/10" />
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6">
              <div className="h-4 w-28 animate-pulse rounded-full bg-white/10" />
              <div className="mt-4 h-9 w-72 animate-pulse rounded-full bg-white/10" />
              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`admin-metric-skeleton-${index}`} className="h-32 animate-pulse rounded-[1.6rem] bg-white/10" />
                ))}
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={`admin-chart-skeleton-${index}`} className="h-80 animate-pulse rounded-[1.9rem] border border-white/10 bg-white/[0.04]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12">
      <div className="flex flex-col gap-6 xl:flex-row">
        <aside className="xl:w-80 xl:shrink-0">
          <div className="commerce-card-surface sticky top-28 rounded-[2rem] border border-white/10 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-100/70">Admin Panel</p>
            <h1 className="mt-4 text-3xl font-black text-white">Control Center</h1>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Signed in as {user.name}. Manage catalog, shipments, customers, and business health from one workspace.
            </p>

            <div className="mt-6 space-y-2">
              {ADMIN_PAGES.map((page) => {
                const Icon = page.icon;
                const isActive = activePage === page.id;

                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => setActivePage(page.id)}
                    className={`flex w-full items-center gap-3 rounded-[1.35rem] border px-4 py-4 text-left transition-all duration-300 ${
                      isActive
                        ? 'border-cyan-200/25 bg-white text-slate-950 shadow-[0_18px_40px_-28px_rgba(103,232,249,0.95)]'
                        : 'border-white/10 bg-white/[0.05] text-slate-100 hover:border-white/20 hover:bg-white/[0.08]'
                    }`}
                  >
                    <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${isActive ? 'bg-slate-950 text-white' : 'bg-white/[0.06] text-cyan-100'}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-black">{page.label}</span>
                      <span className={`mt-1 block text-xs ${isActive ? 'text-slate-500' : 'text-slate-400'}`}>
                        {page.id === 'dashboard' ? 'Analytics and trends' : page.id === 'products' ? 'Catalog operations' : page.id === 'orders' ? 'Fulfillment control' : 'Account access'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-5">
          {(panelError || panelNotice) && (
            <div className={`rounded-[1.4rem] border px-5 py-4 text-sm font-semibold ${panelError ? 'border-rose-300/20 bg-rose-400/10 text-rose-100' : 'border-emerald-300/20 bg-emerald-400/10 text-emerald-100'}`}>
              {panelError || panelNotice}
            </div>
          )}

          {activePage === 'dashboard' && dashboardContent}
          {activePage === 'products' && productsContent}
          {activePage === 'orders' && ordersContent}
          {activePage === 'users' && usersContent}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
