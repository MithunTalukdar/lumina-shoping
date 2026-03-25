
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, CartItem, User, AppView } from './types';
import { INITIAL_PRODUCTS } from './constants';
import FilterBar from './components/FilterBar';
import GitPushPanel from './components/GitPushPanel';
import Navbar from './components/Navbar';
import ProductSection from './components/ProductSection';
import ShoppingAssistant from './components/ShoppingAssistant';
import LoginModal from './components/LoginModal';
import { getCurrentUser, login, logout, register } from './services/authService';
import { checkoutCart, getCart, saveCart } from './services/cartService';
import { getProducts } from './services/productService';
import { formatPrice } from './utils/currency';

type LocationFilter = 'All' | 'India' | 'NRI' | 'Dhaka';

const SHOP_SECTIONS = [
  {
    id: 'men-collection',
    title: 'Men Collection',
    subtitle: 'Shirts, T-Shirts, Jeans, Formal Suits',
    gender: 'men',
    type: 'clothing',
    accentClass: 'from-cyan-300/20 via-transparent to-transparent',
  },
  {
    id: 'women-collection',
    title: 'Women Collection',
    subtitle: 'Dresses, Tops, Skirts, Ethnic Wear',
    gender: 'women',
    type: 'clothing',
    accentClass: 'from-rose-300/20 via-transparent to-transparent',
  },
  {
    id: 'men-shoes',
    title: 'Men Shoes',
    subtitle: 'Sneakers, Formal Shoes, Running Shoes, Boots',
    gender: 'men',
    type: 'shoes',
    accentClass: 'from-amber-300/20 via-transparent to-transparent',
  },
  {
    id: 'women-shoes',
    title: 'Women Shoes',
    subtitle: 'Heels, Flats, Sneakers, Sandals',
    gender: 'women',
    type: 'shoes',
    accentClass: 'from-fuchsia-300/20 via-transparent to-transparent',
  },
] as const;

const SECTION_PAGE_SIZE = 8;
const SECTION_PAGE_STEP = 4;

const createInitialVisibleCounts = () =>
  SHOP_SECTIONS.reduce<Record<string, number>>((accumulator, section) => {
    accumulator[section.id] = SECTION_PAGE_SIZE;
    return accumulator;
  }, {});

const isStorefrontProduct = (item: Product) =>
  (item.gender === 'men' || item.gender === 'women') &&
  (item.type === 'clothing' || item.type === 'shoes') &&
  (item.location === 'India' || item.location === 'NRI' || item.location === 'Dhaka') &&
  typeof item.category === 'string' &&
  item.category.length > 0;

const buildCartSummary = (items: CartItem[]) => {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 0;
  const tax = Math.round(subtotal * 0.1);

  return {
    subtotal,
    shipping,
    tax,
    total: subtotal + shipping + tax,
  };
};

const mergeCartItems = (serverItems: CartItem[], localItems: CartItem[]) => {
  const mergedItems = new Map<string, CartItem>();

  serverItems.forEach((item) => {
    mergedItems.set(item.id, item);
  });

  localItems.forEach((item) => {
    const existing = mergedItems.get(item.id);

    if (existing) {
      mergedItems.set(item.id, {
        ...existing,
        quantity: Math.min(20, existing.quantity + item.quantity),
      });
      return;
    }

    mergedItems.set(item.id, item);
  });

  return Array.from(mergedItems.values());
};

const App: React.FC = () => {
  // State
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [view, setView] = useState<AppView>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationFilter>('All');
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productsSource, setProductsSource] = useState<'api' | 'fallback'>('fallback');
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>(() => createInitialVisibleCounts());
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isCartSyncing, setIsCartSyncing] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const cartRef = useRef<CartItem[]>([]);
  const skipNextCartSyncRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const bootstrapAuth = async () => {
      const currentUser = await getCurrentUser();

      if (!mounted) {
        return;
      }

      setUser(currentUser);
      setIsAuthLoading(false);
    };

    bootstrapAuth();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadProducts = async () => {
      setIsProductsLoading(true);

      try {
        const apiProducts = await getProducts({
          location: selectedLocation !== 'All' ? selectedLocation : undefined,
        });

        if (!mounted) {
          return;
        }

        const fashionProducts = apiProducts.filter(isStorefrontProduct);

        setProducts(fashionProducts);
        setProductsSource('api');
        return;
      } catch (error) {
        if (!mounted) {
          return;
        }

        console.error('Product API unavailable, using fallback data:', error);
        const fallbackProducts = INITIAL_PRODUCTS.filter((product) =>
          selectedLocation === 'All' ? true : product.location === selectedLocation
        );
        setProducts(fallbackProducts);
        setProductsSource('fallback');
      } finally {
        if (mounted) {
          setIsProductsLoading(false);
        }
      }
    };

    loadProducts();

    return () => {
      mounted = false;
    };
  }, [selectedLocation]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (user && view === 'home') {
      setView('shop');
    }
  }, [isAuthLoading, user, view]);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    setVisibleCounts(createInitialVisibleCounts());
  }, [searchQuery, selectedLocation]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      setIsCartLoading(false);
      setIsCartSyncing(false);
      setCartError(null);
      return;
    }

    let mounted = true;

    const loadAccountCart = async () => {
      skipNextCartSyncRef.current = true;
      setIsCartLoading(true);
      setCartError(null);

      try {
        const response = await getCart();

        if (!mounted) {
          return;
        }

        const mergedCart = mergeCartItems(response.items, cartRef.current);

        if (cartRef.current.length > 0) {
          await saveCart(mergedCart);

          if (!mounted) {
            return;
          }
        }

        skipNextCartSyncRef.current = true;
        setCart(mergedCart);
      } catch (error) {
        if (!mounted) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Unable to load your bag.';
        setCartError(message);
      } finally {
        if (mounted) {
          setIsCartLoading(false);
        }
      }
    };

    loadAccountCart();

    return () => {
      mounted = false;
    };
  }, [isAuthLoading, user]);

  useEffect(() => {
    if (!user || isCartLoading) {
      return;
    }

    if (skipNextCartSyncRef.current) {
      skipNextCartSyncRef.current = false;
      return;
    }

    let mounted = true;

    const syncCart = async () => {
      setIsCartSyncing(true);

      try {
        await saveCart(cart);

        if (!mounted) {
          return;
        }

        setCartError(null);
      } catch (error) {
        if (!mounted) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Unable to sync your bag.';
        setCartError(message);
      } finally {
        if (mounted) {
          setIsCartSyncing(false);
        }
      }
    };

    syncCart();

    return () => {
      mounted = false;
    };
  }, [cart, user, isCartLoading]);

  // Derived State
  const shopProducts = useMemo(
    () => products.filter(isStorefrontProduct),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim();

    return shopProducts.filter(p => {
      const matchesSearch =
        normalizedQuery.length === 0 ||
        p.name.toLowerCase().includes(normalizedQuery) ||
        p.category.toLowerCase().includes(normalizedQuery) ||
        p.gender.toLowerCase().includes(normalizedQuery) ||
        p.type.toLowerCase().includes(normalizedQuery) ||
        p.location.toLowerCase().includes(normalizedQuery) ||
        p.description.toLowerCase().includes(normalizedQuery) ||
        `${p.gender} ${p.type}`.includes(normalizedQuery);

      return matchesSearch;
    });
  }, [shopProducts, searchQuery]);

  const cartSummary = useMemo(() => buildCartSummary(cart), [cart]);
  const cartCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);
  const wishlistCount = useMemo(() => wishlist.length, [wishlist]);
  const canAccessAdmin = user?.role === 'admin';
  const currentView = user && view === 'home' ? 'shop' : view;

  // Handlers
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const toggleWishlist = (product: Product) => {
    setWishlist(prev => {
      const alreadyExists = prev.some(item => item.id === product.id);
      if (alreadyExists) {
        return prev.filter(item => item.id !== product.id);
      }
      return [...prev, product];
    });
  };

  const removeFromWishlist = (productId: string) => {
    setWishlist(prev => prev.filter(item => item.id !== productId));
  };

  const isWishlisted = (productId: string) => wishlist.some(item => item.id === productId);

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) {
      return;
    }

    setIsCheckoutLoading(true);

    try {
      if (user) {
        const response = await checkoutCart();
        skipNextCartSyncRef.current = true;
        setCart([]);
        setCartError(null);
        alert(`${response.message} Total charged: ${formatPrice(response.orderSummary.total)}`);
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
        setCart([]);
        alert('Order placed successfully! Sign in next time to keep your bag synced.');
      }

      setView(user ? 'shop' : 'home');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Checkout failed.';
      setCartError(message);
      alert(message);
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    setAuthError(null);
    setIsAuthSubmitting(true);

    try {
      const loggedInUser = await login(email, password);
      setCartError(null);
      setUser(loggedInUser);
      setIsLoginModalOpen(false);
      setView('shop');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed.';
      setAuthError(message);
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    setAuthError(null);
    setIsAuthSubmitting(true);

    try {
      const createdUser = await register(name, email, password);
      setCartError(null);
      setUser(createdUser);
      setIsLoginModalOpen(false);
      setView('shop');
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
    skipNextCartSyncRef.current = true;
    setCart([]);
    setIsCartLoading(false);
    setIsCartSyncing(false);
    setCartError(null);
    setUser(null);
    setView('home');
  };

  // Views
  const renderHome = () => {
    const heroProducts = products.slice(0, 3);
    const spotlightProducts = products.slice(0, 3);
    const shopperSignals = [
      { value: '12k+', label: 'Happy Shoppers', note: 'Returning every month' },
      { value: '4.9/5', label: 'Average Rating', note: 'Across premium collections' },
      { value: '48h', label: 'Fast Dispatch', note: 'For top metro cities' },
    ];
    const experienceSteps = [
      {
        title: 'Discover curated drops',
        description: 'Trend-matched products are organized by style and lifestyle moments.',
      },
      {
        title: 'Get AI-guided confidence',
        description: 'Lumina intelligence helps shoppers pick better options in less time.',
      },
      {
        title: 'Checkout with premium speed',
        description: 'Smooth cart flow, reliable delivery updates, and trusted payment rails.',
      },
    ];

    return (
      <div className="space-y-10 py-10">
        <section className="home-orbit-bg relative overflow-hidden rounded-[2.8rem] border border-white/70 px-6 py-10 shadow-2xl sm:px-10 lg:px-12">
          <div className="home-grid-overlay pointer-events-none absolute inset-0 opacity-70" />
          <div className="pointer-events-none absolute -left-14 top-12 h-52 w-52 rounded-full bg-[#ff7a59]/35 blur-3xl" />
          <div className="pointer-events-none absolute -right-8 top-8 h-56 w-56 rounded-full bg-[#14b8a6]/35 blur-3xl" />

          <div className="relative grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-7">
              <span className="inline-flex items-center rounded-full border border-white/70 bg-white/80 px-4 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-[#0f766e] shadow-sm">
                AI Curated Commerce
              </span>

              <h1 className="text-4xl font-black leading-tight text-[var(--lumina-ink)] sm:text-5xl lg:text-6xl">
                Turn Every Visit Into
                <span className="block bg-gradient-to-r from-[#ff7a59] via-[#0f766e] to-[#1d4ed8] bg-clip-text text-transparent">
                  A Wow Moment.
                </span>
              </h1>

              <p className="max-w-xl text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
                Lumina mixes trend research, design taste, and AI assistance to create a storefront that feels premium from the first
                second. Built to impress new customers and keep them coming back.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => setView('shop')}
                  className="rounded-2xl bg-[#102a43] px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition-all hover:-translate-y-0.5 hover:bg-[#0b1b2f] shadow-lg shadow-slate-900/20"
                >
                  Start Shopping
                </button>
                <button
                  onClick={() => setView('shop')}
                  className="rounded-2xl border border-[#14b8a6]/40 bg-white/70 px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-[#0f766e] transition-all hover:-translate-y-0.5 hover:border-[#0f766e] hover:bg-white"
                >
                  Explore New Drops
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {shopperSignals.map(signal => (
                  <article key={signal.label} className="rounded-2xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur-md">
                    <p className="text-2xl font-black text-slate-100">{signal.value}</p>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{signal.label}</p>
                    <p className="mt-1 text-xs text-slate-500">{signal.note}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                {heroProducts.map((product, index) => (
                  <article
                    key={product.id}
                    className={`group relative overflow-hidden rounded-3xl border border-white/70 bg-white/85 p-3 shadow-lg backdrop-blur-md ${
                      index === 0 ? 'col-span-2' : ''
                    }`}
                  >
                    <div className="overflow-hidden rounded-2xl">
                      <img
                        src={product.image}
                        alt={product.name}
                        className={`w-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                          index === 0 ? 'h-56' : 'h-40'
                        }`}
                      />
                    </div>
                    <div className="mt-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#0f766e]">{product.category}</p>
                        <h3 className="text-base font-black text-slate-900">{product.name}</h3>
                      </div>
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">{formatPrice(product.price)}</span>
                    </div>
                  </article>
                ))}
              </div>

              <div className="float-slow absolute -left-5 bottom-8 rounded-2xl border border-white/60 bg-white/85 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#0f766e] shadow-lg">
                48h Priority Dispatch
              </div>
              <div className="float-slower absolute -right-4 top-10 rounded-2xl border border-white/60 bg-white/85 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#ff7a59] shadow-lg">
                4.9 Customer Love
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <article className="rounded-[2.2rem] border border-white/70 bg-white/75 p-8 shadow-xl backdrop-blur-md">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">Why Customers Stay</p>
            <h2 className="mt-2 text-3xl font-black text-[var(--lumina-ink)]">A Memorable Journey, Not Just A Store</h2>
            <div className="mt-7 space-y-4">
              {experienceSteps.map((step, index) => (
                <div key={step.title} className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#102a43] text-xs font-black text-white">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-base font-bold text-slate-900">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-[2.2rem] border border-white/70 bg-gradient-to-br from-[#0f172a]/90 via-[#111827]/90 to-[#1e293b]/90 p-8 shadow-xl">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">Customer Favorites</p>
                <h2 className="mt-2 text-3xl font-black text-[var(--lumina-ink)]">Trending Spotlight</h2>
              </div>
              <button
                onClick={() => setView('shop')}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:border-[#0f766e] hover:text-[#0f766e]"
              >
                View All
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {spotlightProducts.map(product => (
                <article key={product.id} className="group rounded-2xl border border-white/80 bg-white/85 p-3 shadow-md backdrop-blur-sm">
                  <div className="relative overflow-hidden rounded-2xl">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <span className="absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.13em] text-white">
                      {product.category}
                    </span>
                  </div>
                  <div className="space-y-2 p-2">
                    <h3 className="text-base font-black text-slate-900">{product.name}</h3>
                    <p className="text-sm font-medium text-slate-500">Rated {product.rating.toFixed(1)} by {product.reviewsCount} shoppers</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-black text-cyan-200">{formatPrice(product.price)}</span>
                      <button
                        onClick={() => addToCart(product)}
                        className="rounded-xl bg-[#102a43] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#0b1b2f]"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </article>
        </section>
      </div>
    );
  };

  const renderShop = () => {
    const sourceLabel = productsSource === 'api' ? 'Live Fashion API' : 'Curated Fallback Catalog';
    const spotlightProducts = filteredProducts.slice(0, 2);
    const clothingCount = filteredProducts.filter(product => product.type === 'clothing').length;
    const shoeCount = filteredProducts.filter(product => product.type === 'shoes').length;
    const locationLabel = selectedLocation === 'All' ? 'All Regions' : selectedLocation;
    const sections = SHOP_SECTIONS.map((section) => ({
      ...section,
      products: filteredProducts.filter(
        (product) => product.gender === section.gender && product.type === section.type
      ),
    }));

    return (
      <div className="py-10 space-y-10">
        <section className="fashion-stage relative overflow-hidden rounded-[2.6rem] border border-white/10 px-6 py-8 shadow-2xl sm:px-8 lg:px-10">
          <div className="pointer-events-none absolute -left-16 top-8 h-44 w-44 rounded-full bg-cyan-400/20 blur-3xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-56 w-56 rounded-full bg-rose-400/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-44 w-44 rounded-full bg-amber-300/10 blur-3xl" />

          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] xl:items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-200">
                Premium Fashion Edit
              </div>

              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-black tracking-tight text-white sm:text-5xl xl:text-[4.25rem] xl:leading-[0.96]">
                  Dynamic fashion sections powered by your live product API.
                </h1>
                <p className="max-w-2xl text-base font-medium leading-relaxed text-slate-300 sm:text-lg">
                  Browse premium clothing and footwear by collection, filter the feed by location, and load more products section by section.
                </p>
              </div>

              <FilterBar
                searchQuery={searchQuery}
                selectedLocation={selectedLocation}
                resultCount={filteredProducts.length}
                isLoading={isProductsLoading}
                onSearchChange={setSearchQuery}
                onLocationChange={setSelectedLocation}
              />

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Source</p>
                  <p className="mt-2 text-lg font-black text-white">{sourceLabel}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Visible Feed</p>
                  <p className="mt-2 text-lg font-black text-white">{filteredProducts.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Clothing / Shoes</p>
                  <p className="mt-2 text-lg font-black text-white">{clothingCount} / {shoeCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Location</p>
                  <p className="mt-2 text-lg font-black text-white">{locationLabel}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {isProductsLoading && spotlightProducts.length === 0 ? (
                Array.from({ length: 2 }).map((_, index) => (
                  <div
                    key={`spotlight-skeleton-${index}`}
                    className={`overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/35 p-4 shadow-xl animate-pulse ${
                      index === 0 ? 'sm:translate-y-4' : ''
                    }`}
                  >
                    <div className="h-72 rounded-[1.7rem] bg-slate-800/80" />
                    <div className="space-y-3 px-1 pb-1 pt-5">
                      <div className="h-5 w-28 rounded-full bg-slate-700/80" />
                      <div className="h-8 w-2/3 rounded-full bg-slate-700/80" />
                      <div className="h-4 w-full rounded-full bg-slate-800/80" />
                    </div>
                  </div>
                ))
              ) : spotlightProducts.length > 0 ? (
                spotlightProducts.map((product, index) => (
                  <article
                    key={product.id}
                    className={`group relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/35 p-4 shadow-xl ${
                      index === 0 ? 'sm:translate-y-4' : ''
                    }`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-80" />
                    <div className="relative overflow-hidden rounded-[1.7rem]">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
                      <div className="absolute left-4 top-4 flex gap-2">
                        <span className="rounded-full border border-white/15 bg-black/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                          {product.gender}
                        </span>
                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-100">
                          {product.location}
                        </span>
                      </div>
                    </div>

                    <div className="relative space-y-3 px-1 pb-1 pt-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-black text-white">{product.name}</h3>
                          <p className="mt-1 text-sm font-medium text-slate-300">{product.category}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1.5 text-sm font-black text-slate-950">
                          {formatPrice(product.price)}
                        </span>
                      </div>
                      <p className="copy-clamp-2 text-sm leading-relaxed text-slate-400">{product.description}</p>
                    </div>
                  </article>
                ))
              ) : (
                <div className="sm:col-span-2 rounded-[2rem] border border-dashed border-white/15 bg-slate-950/35 px-6 py-20 text-center">
                  <p className="text-xl font-bold text-slate-300">No products found for the selected location and search.</p>
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="space-y-8">
          {sections.map((section) => (
            <ProductSection
              key={section.id}
              title={section.title}
              subtitle={section.subtitle}
              accentClass={section.accentClass}
              products={section.products}
              visibleCount={visibleCounts[section.id] ?? SECTION_PAGE_SIZE}
              isLoading={isProductsLoading}
              onLoadMore={() =>
                setVisibleCounts((current) => ({
                  ...current,
                  [section.id]: Math.min(
                    section.products.length,
                    (current[section.id] ?? SECTION_PAGE_SIZE) + SECTION_PAGE_STEP
                  ),
                }))
              }
              onViewAll={() =>
                setVisibleCounts((current) => ({
                  ...current,
                  [section.id]: Math.max(section.products.length, SECTION_PAGE_SIZE),
                }))
              }
              onAddToCart={addToCart}
              onToggleWishlist={toggleWishlist}
              isWishlisted={isWishlisted}
              onSelectProduct={(selected) => {
                setSelectedProduct(selected);
                setView('product');
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  const renderProductDetails = () => {
    if (!selectedProduct) return null;
    return (
      <div className="py-12">
        <button onClick={() => setView('shop')} className="mb-8 flex items-center text-gray-500 hover:text-indigo-600 transition-colors font-bold group">
          <svg className="h-5 w-5 mr-1 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Shop
        </button>
        
        <div className="fashion-section-shell grid grid-cols-1 items-start gap-12 rounded-[3rem] border border-white/10 p-8 shadow-2xl lg:grid-cols-2 lg:p-12">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-950/40 shadow-lg">
            <img src={selectedProduct.image} alt={selectedProduct.name} className="aspect-square w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/10 to-transparent" />
            <div className="absolute left-5 top-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                {selectedProduct.gender}
              </span>
              <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-100">
                {selectedProduct.category}
              </span>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-200">
                  {selectedProduct.location}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
                  {selectedProduct.stock} Left in Stock
                </span>
              </div>

              <h1 className="mt-3 text-5xl font-extrabold tracking-tight text-gray-900">{selectedProduct.name}</h1>

              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`w-5 h-5 ${i < Math.floor(selectedProduct.rating) ? 'fill-current' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-bold text-gray-500">
                  {selectedProduct.rating.toFixed(1)} rating from {selectedProduct.reviewsCount} reviews
                </span>
              </div>
            </div>

            <p className="text-4xl font-black text-gray-900 tracking-tighter">{formatPrice(selectedProduct.price)}</p>

            <p className="text-gray-600 text-lg leading-relaxed font-medium">
              {selectedProduct.description}
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Collection</p>
                <p className="mt-2 text-lg font-black text-white">{selectedProduct.gender}</p>
              </div>
              <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Type</p>
                <p className="mt-2 text-lg font-black text-white">{selectedProduct.type}</p>
              </div>
              <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Category</p>
                <p className="mt-2 text-lg font-black text-white">{selectedProduct.category}</p>
              </div>
            </div>

            <div className="flex flex-col gap-6 border-t border-white/10 pt-8 sm:flex-row">
              <button
                onClick={() => addToCart(selectedProduct)}
                className="flex-[2] rounded-[1.5rem] bg-white py-5 text-lg font-bold text-slate-950 transition-all flex items-center justify-center space-x-3 shadow-xl transform hover:-translate-y-1 hover:bg-cyan-300"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Add to Bag</span>
              </button>
              <button
                onClick={() => toggleWishlist(selectedProduct)}
                className={`flex-1 border-2 py-5 rounded-[1.5rem] font-bold text-lg transition-all ${
                  isWishlisted(selectedProduct.id)
                    ? 'border-pink-500 bg-pink-500 text-white hover:bg-pink-600 hover:border-pink-600'
                    : 'border-white/15 text-gray-900 hover:border-cyan-300 hover:text-cyan-200'
                }`}
              >
                {isWishlisted(selectedProduct.id) ? 'Wishlisted' : 'Wishlist'}
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 space-y-3">
                <div className="flex items-center space-x-4">
                  <div className="rounded-xl bg-white p-2.5 shadow-sm">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="font-bold text-white">Fast dispatch on featured fashion picks</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-400">
                  Built for a premium storefront feel with quick add-to-bag flow and polished imagery.
                </p>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6 space-y-3">
                <div className="flex items-center space-x-4">
                  <div className="rounded-xl bg-white p-2.5 shadow-sm">
                    <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.040L3 14.535a11.955 11.955 0 0010.427 10.427 11.955 11.955 0 0010.427-10.427l-1.809-8.607z" />
                    </svg>
                  </div>
                  <span className="font-bold text-white">Premium styling, everyday usability</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-400">
                  Every item keeps the same rating, wishlist, and cart interaction model used throughout the storefront.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCart = () => (
    <div className="py-12 max-w-5xl mx-auto">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">Your Shopping Bag</h1>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-white/40 bg-white/60 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-gray-700">
            {user ? 'Account Bag' : 'Guest Bag'}
          </span>
          {user && (
            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-700">
              {isCartLoading ? 'Loading Bag' : isCartSyncing ? 'Syncing Bag' : 'Bag Synced'}
            </span>
          )}
        </div>
      </div>

      {cartError && (
        <p className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
          {cartError}
        </p>
      )}
      
      {cart.length === 0 ? (
        <div className="text-center py-32 glass-effect rounded-[3rem] border border-dashed border-gray-300 space-y-8">
          <div className="flex justify-center">
            <svg className="h-24 w-24 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-400">
            {isCartLoading ? 'Loading your saved bag...' : 'Your bag is currently empty.'}
          </p>
          {!isCartLoading && (
            <button 
              onClick={() => setView('shop')}
              className="bg-indigo-600 text-white px-12 py-5 rounded-full font-bold text-xl hover:bg-indigo-700 transition-all shadow-xl"
            >
              Start Shopping
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-8">
            {cart.map(item => (
              <div key={item.id} className="flex space-x-8 p-6 glass-effect rounded-[2rem] border border-white/50 shadow-sm">
                <div className="w-32 h-32 rounded-2xl overflow-hidden flex-shrink-0 shadow-md">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
                      <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mt-1">{item.category}</p>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center border-2 border-gray-100 rounded-xl overflow-hidden bg-white/50">
                      <button onClick={() => updateQuantity(item.id, -1)} className="px-4 py-2 hover:bg-gray-200 font-bold transition-colors">&minus;</button>
                      <span className="px-6 font-black text-gray-900">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} className="px-4 py-2 hover:bg-gray-200 font-bold transition-colors">+</button>
                    </div>
                    <p className="text-2xl font-black text-indigo-600">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-8">
            <div className="glass-effect p-10 rounded-[2.5rem] border border-indigo-100 space-y-8 shadow-2xl">
              <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Order Summary</h2>
              <div className="space-y-5">
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Subtotal</span>
                  <span>{formatPrice(cartSummary.subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Priority Shipping</span>
                  <span className="text-green-600 font-bold uppercase text-sm">Complimentary</span>
                </div>
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>Tax</span>
                  <span>{formatPrice(cartSummary.tax)}</span>
                </div>
                <div className="pt-6 border-t border-gray-200 flex justify-between font-black text-3xl text-gray-900">
                  <span>Total</span>
                  <span>{formatPrice(cartSummary.total)}</span>
                </div>
              </div>
              <button 
                onClick={handleCheckout}
                disabled={isCheckoutLoading || isCartLoading}
                className={`w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-bold text-xl hover:bg-indigo-700 transition-all flex items-center justify-center space-x-3 shadow-xl shadow-indigo-200 ${(isCheckoutLoading || isCartLoading) ? 'opacity-70' : ''}`}
              >
                {isCheckoutLoading || isCartLoading ? (
                  <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Checkout Now</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="flex items-center justify-center space-x-8 text-gray-400 opacity-60">
              <img src="https://cdn-icons-png.flaticon.com/512/196/196578.png" alt="Visa" className="h-8 grayscale hover:grayscale-0 transition-all cursor-pointer" />
              <img src="https://cdn-icons-png.flaticon.com/512/349/349228.png" alt="Mastercard" className="h-8 grayscale hover:grayscale-0 transition-all cursor-pointer" />
              <img src="https://cdn-icons-png.flaticon.com/512/174/174861.png" alt="Paypal" className="h-8 grayscale hover:grayscale-0 transition-all cursor-pointer" />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderWishlist = () => (
    <div className="py-12 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-10">
        <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight">Your Wishlist</h1>
        <span className="rounded-full bg-pink-500 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white">
          {wishlistCount} Saved
        </span>
      </div>

      {wishlist.length === 0 ? (
        <div className="text-center py-28 glass-effect rounded-[3rem] border border-dashed border-gray-300 space-y-8">
          <div className="flex justify-center">
            <svg className="h-20 w-20 text-pink-300" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-400">No items in your wishlist yet.</p>
          <button
            onClick={() => setView('shop')}
            className="bg-indigo-600 text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl"
          >
            Explore Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {wishlist.map(item => (
            <article key={item.id} className="glass-effect rounded-[2rem] border border-white/60 p-5 shadow-xl space-y-5">
              <div className="relative overflow-hidden rounded-2xl bg-white/30">
                <img src={item.image} alt={item.name} className="h-56 w-full object-cover" />
                <span className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                  {item.category}
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                <p className="text-2xl font-black text-indigo-400">{formatPrice(item.price)}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    addToCart(item);
                    removeFromWishlist(item.id);
                  }}
                  className="rounded-xl bg-indigo-600 text-white py-3 text-sm font-bold hover:bg-indigo-700 transition-colors"
                >
                  Add to Cart
                </button>
                <button
                  onClick={() => removeFromWishlist(item.id)}
                  className="rounded-xl border border-pink-300 py-3 text-sm font-bold text-pink-400 hover:bg-pink-500 hover:text-white transition-colors"
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );

  const renderAdmin = () => (
    <div className="py-12">
      <div className="flex justify-between items-center mb-10 glass-effect p-8 rounded-3xl">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Admin Console</h1>
          <p className="text-gray-500 font-medium">Managing {products.length} catalog items</p>
        </div>
        <button className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg">
          + New Product
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white/70 backdrop-blur-md p-10 rounded-[2rem] shadow-sm border border-white/50 flex items-center space-x-8">
          <div className="p-5 bg-indigo-50 rounded-2xl text-indigo-600 shadow-inner">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Revenue</p>
            <p className="text-4xl font-black text-gray-900">{formatPrice(24500)}</p>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-md p-10 rounded-[2rem] shadow-sm border border-white/50 flex items-center space-x-8">
          <div className="p-5 bg-purple-50 rounded-2xl text-purple-600 shadow-inner">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Orders</p>
            <p className="text-4xl font-black text-gray-900">384</p>
          </div>
        </div>
        <div className="bg-white/70 backdrop-blur-md p-10 rounded-[2rem] shadow-sm border border-white/50 flex items-center space-x-8">
          <div className="p-5 bg-green-50 rounded-2xl text-green-600 shadow-inner">
            <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Users</p>
            <p className="text-4xl font-black text-gray-900">1,202</p>
          </div>
        </div>
      </div>

      <div className="glass-effect rounded-[3rem] shadow-2xl border border-white/50 overflow-hidden bg-white/40">
        <table className="w-full text-left">
          <thead className="bg-gray-900 text-white text-xs uppercase tracking-[0.2em] font-black">
            <tr>
              <th className="px-10 py-6">Product Information</th>
              <th className="px-10 py-6">Category</th>
              <th className="px-10 py-6">Price Point</th>
              <th className="px-10 py-6">Inventory</th>
              <th className="px-10 py-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/20">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-white/40 transition-colors">
                <td className="px-10 py-8">
                  <div className="flex items-center space-x-5">
                    <img src={p.image} className="h-16 w-16 rounded-2xl object-cover shadow-sm ring-2 ring-white" />
                    <span className="font-bold text-gray-900 text-lg">{p.name}</span>
                  </div>
                </td>
                <td className="px-10 py-8 text-gray-600 font-semibold">{p.category}</td>
                <td className="px-10 py-8 font-black text-gray-900 text-lg">{formatPrice(p.price)}</td>
                <td className="px-10 py-8">
                  <span className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest ${p.stock < 10 ? 'bg-red-500 text-white shadow-lg' : 'bg-green-500 text-white shadow-lg'}`}>
                    {p.stock} units
                  </span>
                </td>
                <td className="px-10 py-8 text-right space-x-6 font-bold">
                  <button className="text-indigo-600 hover:text-indigo-800 transition-colors">Edit</button>
                  <button className="text-red-600 hover:text-red-800 transition-colors">Archive</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="dark-theme min-h-screen flex flex-col">
      <Navbar 
        currentView={currentView} 
        setView={(nextView) => setView(user && nextView === 'home' ? 'shop' : nextView)} 
        cartCount={cartCount} 
        wishlistCount={wishlistCount}
        user={user}
        isAuthLoading={isAuthLoading}
        onLogin={() => {
          setAuthError(null);
          setAuthMode('login');
          setIsLoginModalOpen(true);
        }}
        onRegister={() => {
          setAuthError(null);
          setAuthMode('register');
          setIsLoginModalOpen(true);
        }}
        onGoogle={() => {
          window.open('https://accounts.google.com/', '_blank', 'noopener,noreferrer');
        }}
        onLogout={handleLogout}
      />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {currentView === 'home' && renderHome()}
        {currentView === 'shop' && renderShop()}
        {currentView === 'git' && <GitPushPanel />}
        {currentView === 'product' && renderProductDetails()}
        {currentView === 'cart' && renderCart()}
        {currentView === 'wishlist' && renderWishlist()}
        {currentView === 'admin' && canAccessAdmin && renderAdmin()}
        {currentView === 'admin' && !canAccessAdmin && (
          <div className="py-20 text-center">
            <p className="text-2xl font-bold text-gray-900">Admin access required.</p>
            <p className="mt-2 text-gray-500">Please sign in with an admin account.</p>
          </div>
        )}
      </main>

      <footer className="glass-effect mt-20 py-16 border-t border-white/30">
        <div className="max-w-7xl mx-auto px-4 text-center space-y-4">
          <p className="text-gray-900 font-bold text-lg tracking-tight">LUMINA COMMERCE</p>
          <p className="text-gray-400 text-sm font-medium">© 2024 Intelligent Curation. Powered by Lumina Engine.</p>
        </div>
      </footer>

      <ShoppingAssistant products={products} />

      <LoginModal
        isOpen={isLoginModalOpen}
        initialMode={authMode}
        isSubmitting={isAuthSubmitting}
        errorMessage={authError}
        onClose={() => {
          if (isAuthSubmitting) {
            return;
          }
          setAuthError(null);
          setIsLoginModalOpen(false);
        }}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    </div>
  );
};

export default App;
