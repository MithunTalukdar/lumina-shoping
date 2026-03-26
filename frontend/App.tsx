
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ArrowRight,
  CreditCard,
  Heart,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  Truck,
} from 'lucide-react';
import { Product, CartItem, AppView } from './types';
import { INITIAL_PRODUCTS } from './constants';
import FilterBar from './components/FilterBar';
import Navbar from './components/Navbar';
import ProductSection from './components/ProductSection';
import ProfilePage, { type ProfilePageTab } from './components/ProfilePage';
import ShoppingAssistant from './components/ShoppingAssistant';
import LoginModal from './components/LoginModal';
import ShopUnlockBanner from './components/ShopUnlockBanner';
import RecommendationRail from './components/RecommendationRail';
import { checkoutCart, getCart, saveCart } from './services/cartService';
import { getProducts } from './services/productService';
import { getWishlist, saveWishlist } from './services/wishlistService';
import { formatPrice } from './utils/currency';
import { AuthMode, useAuth } from './context/AuthContext';

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

type AppRoute = AppView | 'login';

const createInitialVisibleCounts = () =>
  SHOP_SECTIONS.reduce<Record<string, number>>((accumulator, section) => {
    accumulator[section.id] = SECTION_PAGE_SIZE;
    return accumulator;
  }, {});

const getPathForRoute = (route: AppRoute) => {
  switch (route) {
    case 'home':
      return '/';
    case 'shop':
    case 'product':
      return '/shop';
    case 'cart':
      return '/cart';
    case 'wishlist':
      return '/wishlist';
    case 'profile':
      return '/profile';
    case 'admin':
      return '/admin';
    case 'login':
      return '/login';
    default:
      return '/';
  }
};

const getRouteFromPath = (pathname: string): AppRoute => {
  switch (pathname) {
    case '/':
      return 'home';
    case '/shop':
      return 'shop';
    case '/cart':
      return 'cart';
    case '/wishlist':
      return 'wishlist';
    case '/profile':
      return 'profile';
    case '/admin':
      return 'admin';
    case '/login':
      return 'login';
    default:
      return 'home';
  }
};

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

const mergeWishlistItems = (serverItems: Product[], localItems: Product[]) => {
  const mergedItems = new Map<string, Product>();

  serverItems.forEach((item) => {
    mergedItems.set(item.id, item);
  });

  localItems.forEach((item) => {
    mergedItems.set(item.id, item);
  });

  return Array.from(mergedItems.values());
};

const App: React.FC = () => {
  const {
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
    handleLogout: logoutUser,
    handleGoogleAuth,
  } = useAuth();

  // State
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [view, setView] = useState<AppView>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<LocationFilter>('All');
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productsSource, setProductsSource] = useState<'api' | 'fallback'>('fallback');
  const [visibleCounts, setVisibleCounts] = useState<Record<string, number>>(() => createInitialVisibleCounts());
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [isCartSyncing, setIsCartSyncing] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [isWishlistSyncing, setIsWishlistSyncing] = useState(false);
  const [wishlistError, setWishlistError] = useState<string | null>(null);
  const [profileInitialTab, setProfileInitialTab] = useState<ProfilePageTab>('profile');
  const cartRef = useRef<CartItem[]>([]);
  const wishlistRef = useRef<Product[]>([]);
  const skipNextCartSyncRef = useRef(false);
  const skipNextWishlistSyncRef = useRef(false);
  const pendingProtectedViewRef = useRef<AppView | null>(null);

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

    const applyLocation = () => {
      const route = getRouteFromPath(window.location.pathname);

      if (route === 'login') {
        if (user) {
          const fallbackView = pendingProtectedViewRef.current ?? 'shop';
          pendingProtectedViewRef.current = null;
          window.history.replaceState(null, '', getPathForRoute(fallbackView));
          setView(fallbackView);
          return;
        }

        setView('home');
        openAuthModal('login', 'Log in to access your profile dashboard, order history, and secure account settings.');
        return;
      }

      if (route === 'profile') {
        setProfileInitialTab('profile');

        if (!user) {
          pendingProtectedViewRef.current = 'profile';
          setView('home');
          window.history.replaceState(null, '', getPathForRoute('login'));
          openAuthModal('login', 'Log in to open your profile dashboard, order history, and password settings.');
          return;
        }

        setView('profile');
        return;
      }

      if ((route === 'cart' || route === 'wishlist') && !user) {
        pendingProtectedViewRef.current = route;
        setView('home');
        window.history.replaceState(null, '', getPathForRoute('login'));
        openAuthModal('login', 'Log in to unlock your synced bag, favorites, and member tools.');
        return;
      }

      setView(user && route === 'home' ? 'shop' : route);
    };

    applyLocation();
    window.addEventListener('popstate', applyLocation);

    return () => {
      window.removeEventListener('popstate', applyLocation);
    };
  }, [isAuthLoading, user]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (user && pendingProtectedViewRef.current) {
      const nextView = pendingProtectedViewRef.current;
      pendingProtectedViewRef.current = null;
      window.history.replaceState(null, '', getPathForRoute(nextView));
      setView(nextView);
      return;
    }

    if (user && view === 'home' && window.location.pathname === '/') {
      window.history.replaceState(null, '', getPathForRoute('shop'));
      setView('shop');
    }
  }, [isAuthLoading, user, view]);

  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  useEffect(() => {
    wishlistRef.current = wishlist;
  }, [wishlist]);

  useEffect(() => {
    setVisibleCounts(createInitialVisibleCounts());
  }, [searchQuery, selectedLocation]);

  useEffect(() => {
    if (isAuthLoading || user) {
      return;
    }

    skipNextCartSyncRef.current = true;
    skipNextWishlistSyncRef.current = true;
    setCart([]);
    setWishlist([]);
    setCartError(null);
    setWishlistError(null);
    setIsCartLoading(false);
    setIsCartSyncing(false);
    setIsWishlistLoading(false);
    setIsWishlistSyncing(false);
  }, [isAuthLoading, user]);

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

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      setIsWishlistLoading(false);
      setIsWishlistSyncing(false);
      setWishlistError(null);
      return;
    }

    let mounted = true;

    const loadAccountWishlist = async () => {
      skipNextWishlistSyncRef.current = true;
      setIsWishlistLoading(true);
      setWishlistError(null);

      try {
        const response = await getWishlist();

        if (!mounted) {
          return;
        }

        const mergedWishlist = mergeWishlistItems(response.items, wishlistRef.current);

        if (wishlistRef.current.length > 0) {
          await saveWishlist(mergedWishlist);

          if (!mounted) {
            return;
          }
        }

        skipNextWishlistSyncRef.current = true;
        setWishlist(mergedWishlist);
      } catch (error) {
        if (!mounted) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Unable to load your wishlist.';
        setWishlistError(message);
      } finally {
        if (mounted) {
          setIsWishlistLoading(false);
        }
      }
    };

    loadAccountWishlist();

    return () => {
      mounted = false;
    };
  }, [isAuthLoading, user]);

  useEffect(() => {
    if (!user || isWishlistLoading) {
      return;
    }

    if (skipNextWishlistSyncRef.current) {
      skipNextWishlistSyncRef.current = false;
      return;
    }

    let mounted = true;

    const syncWishlist = async () => {
      setIsWishlistSyncing(true);

      try {
        await saveWishlist(wishlist);

        if (!mounted) {
          return;
        }

        setWishlistError(null);
      } catch (error) {
        if (!mounted) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Unable to sync your wishlist.';
        setWishlistError(message);
      } finally {
        if (mounted) {
          setIsWishlistSyncing(false);
        }
      }
    };

    syncWishlist();

    return () => {
      mounted = false;
    };
  }, [wishlist, user, isWishlistLoading]);

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
  const personalizedRecommendations = useMemo(() => {
    if (!user) {
      return [];
    }

    const seedCategory = wishlist[0]?.category || cart[0]?.category;
    const excludedIds = new Set([...wishlist.map((item) => item.id), ...cart.map((item) => item.id)]);
    const preferredPool = filteredProducts.filter((product) =>
      product.category === seedCategory && !excludedIds.has(product.id)
    );
    const fallbackPool = filteredProducts.filter((product) => !excludedIds.has(product.id));
    const sortedPool = [...(preferredPool.length > 0 ? preferredPool : fallbackPool)].sort(
      (left, right) => right.rating * 100 + right.reviewsCount - (left.rating * 100 + left.reviewsCount)
    );

    return sortedPool.slice(0, 3);
  }, [user, wishlist, cart, filteredProducts]);

  // Handlers
  const promptForAuth = (mode: AuthMode, message: string, nextView?: AppView) => {
    pendingProtectedViewRef.current = nextView ?? null;

    openAuthModal(mode, message);
  };

  const updateBrowserPath = (route: AppRoute, replaceHistory = false) => {
    const nextPath = getPathForRoute(route);

    if (window.location.pathname === nextPath) {
      return;
    }

    if (replaceHistory) {
      window.history.replaceState(null, '', nextPath);
      return;
    }

    window.history.pushState(null, '', nextPath);
  };

  const commitViewChange = (
    nextView: AppView,
    options: {
      replaceHistory?: boolean;
      profileTab?: ProfilePageTab;
    } = {}
  ) => {
    if (nextView === 'profile') {
      setProfileInitialTab(options.profileTab ?? 'profile');
    }

    const resolvedView = user && nextView === 'home' ? 'shop' : nextView;
    setView(resolvedView);
    updateBrowserPath(resolvedView, options.replaceHistory);
  };

  const redirectProtectedViewToLogin = (
    nextView: AppView,
    message: string,
    options: {
      mode?: AuthMode;
      replaceHistory?: boolean;
      profileTab?: ProfilePageTab;
    } = {}
  ) => {
    if (nextView === 'profile') {
      setProfileInitialTab(options.profileTab ?? 'profile');
    }

    pendingProtectedViewRef.current = nextView;
    updateBrowserPath('login', options.replaceHistory);
    openAuthModal(options.mode ?? 'login', message);
  };

  const goToView = (
    nextView: AppView,
    options: {
      replaceHistory?: boolean;
      profileTab?: ProfilePageTab;
    } = {}
  ) => {
    if (!user && (nextView === 'cart' || nextView === 'wishlist')) {
      redirectProtectedViewToLogin(nextView, 'Log in to unlock your synced bag, favorites, and member history.', {
        replaceHistory: options.replaceHistory,
      });
      return;
    }

    if (!user && nextView === 'profile') {
      redirectProtectedViewToLogin(
        'profile',
        'Log in to open your profile dashboard, order history, and password settings.',
        {
          replaceHistory: options.replaceHistory,
          profileTab: options.profileTab,
        }
      );
      return;
    }

    commitViewChange(nextView, options);
  };

  const upsertCartItem = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const addToCart = (product: Product) => {
    if (!user) {
      promptForAuth('login', 'Log in to add this style to your bag and keep it synced across visits.');
      return;
    }

    upsertCartItem(product);
  };

  const handleBuyNow = (product: Product) => {
    if (!user) {
      promptForAuth('register', 'Create your account to unlock instant checkout for this product.');
      return;
    }

    upsertCartItem(product);
    setSelectedProduct(product);
    goToView('cart');
  };

  const openProductDetail = (product: Product) => {
    setSelectedProduct(product);
    commitViewChange('product');
  };

  const toggleWishlist = (product: Product) => {
    if (!user) {
      promptForAuth('login', 'Log in to save favorites and unlock your personal wishlist.');
      return;
    }

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
    if (!user) {
      promptForAuth('register', 'Sign up to unlock checkout, order history, and secure bag sync.');
      return;
    }

    if (cart.length === 0) {
      return;
    }

    setIsCheckoutLoading(true);

    try {
      const response = await checkoutCart();
      skipNextCartSyncRef.current = true;
      setCart([]);
      setCartError(null);
      alert(`${response.message} Total charged: ${formatPrice(response.orderSummary.total)}. Opening your order history.`);
      goToView('profile', { profileTab: 'orders' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Checkout failed.';
      setCartError(message);
      alert(message);
    } finally {
      setIsCheckoutLoading(false);
    }
  };

  const renderProtectedAccessPanel = (
    eyebrow: string,
    title: string,
    description: string,
    primaryLabel: string,
    secondaryLabel: string
  ) => (
    <div className="py-14">
      <section className="relative overflow-hidden rounded-[2.8rem] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.14),_transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] px-6 py-14 shadow-[0_26px_80px_-38px_rgba(15,23,42,0.35)] sm:px-10">
        <div className="pointer-events-none absolute -left-10 top-4 h-44 w-44 rounded-full bg-cyan-200/35 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-52 w-52 rounded-full bg-orange-200/35 blur-3xl" />
        <div className="relative mx-auto max-w-3xl text-center">
          <span className="inline-flex rounded-full border border-cyan-200 bg-white/80 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.22em] text-cyan-700">
            {eyebrow}
          </span>
          <h2 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">{title}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-medium leading-relaxed text-slate-600 sm:text-lg">
            {description}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => promptForAuth('login', description)}
              className="rounded-2xl bg-slate-950 px-7 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white transition-transform hover:-translate-y-0.5"
            >
              {primaryLabel}
            </button>
            <button
              type="button"
              onClick={() => promptForAuth('register', description)}
              className="rounded-2xl border border-slate-200 bg-white px-7 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-slate-700 transition-transform hover:-translate-y-0.5 hover:border-cyan-200 hover:text-cyan-700"
            >
              {secondaryLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );

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
                  onClick={() => goToView('shop')}
                  className="rounded-2xl bg-[#102a43] px-7 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white transition-all hover:-translate-y-0.5 hover:bg-[#0b1b2f] shadow-lg shadow-slate-900/20"
                >
                  Start Shopping
                </button>
                <button
                  onClick={() => goToView('shop')}
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
                        loading="lazy"
                        decoding="async"
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
                onClick={() => goToView('shop')}
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
                       loading="lazy"
                       decoding="async"
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
    const isDemoMode = !user;
    const sourceLabel = productsSource === 'api'
      ? isDemoMode ? 'Live Demo Feed' : 'Live Fashion API'
      : isDemoMode ? 'Curated Demo Catalog' : 'Curated Fallback Catalog';
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
        <ShopUnlockBanner
          isAuthenticated={Boolean(user)}
          userName={user?.name}
          cartCount={cartCount}
          wishlistCount={wishlistCount}
          onLogin={() => promptForAuth('login', 'Log in to unlock bag sync, wishlist saves, and checkout.')}
          onRegister={() => promptForAuth('register', 'Create your account to unlock premium pricing moments and checkout.')}
        />

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
                  {isDemoMode
                    ? 'Browse the drop in demo mode, then log in to turn intent into checkout.'
                    : `Dynamic fashion sections, now tailored for ${user?.name || 'you'}.`}
                </h1>
                <p className="max-w-2xl text-base font-medium leading-relaxed text-slate-300 sm:text-lg">
                  {isDemoMode
                    ? 'Preview every collection, quick-view products, and feel the storefront. Login unlocks bag actions, wishlist saves, and personalized picks instantly.'
                    : 'Browse premium clothing and footwear by collection, filter the feed by location, and enjoy a fully unlocked shopping journey.'}
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
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{isDemoMode ? 'Demo Feed' : 'Visible Feed'}</p>
                  <p className="mt-2 text-lg font-black text-white">{filteredProducts.length}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Clothing / Shoes</p>
                  <p className="mt-2 text-lg font-black text-white">{clothingCount} / {shoeCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{isDemoMode ? 'Unlocks' : 'Location'}</p>
                  <p className="mt-2 text-lg font-black text-white">{isDemoMode ? 'Bag + Wishlist + Checkout' : locationLabel}</p>
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
                        loading="lazy"
                        decoding="async"
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

        {user && (
          <RecommendationRail
            title={`Recommended for ${user.name}`}
            subtitle="Personalized Picks"
            products={personalizedRecommendations}
            onSelectProduct={openProductDetail}
            onAddToCart={addToCart}
            onBuyNow={handleBuyNow}
          />
        )}

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
              isLocked={isDemoMode}
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
              onBuyNow={handleBuyNow}
              onToggleWishlist={toggleWishlist}
              isWishlisted={isWishlisted}
              onSelectProduct={openProductDetail}
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
        <button onClick={() => goToView('shop')} className="mb-8 flex items-center text-gray-500 hover:text-indigo-600 transition-colors font-bold group">
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
            {!user && (
              <div className="rounded-[1.8rem] border border-amber-300/20 bg-amber-300/10 px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">Demo Preview</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-slate-300">
                  You are previewing the full product detail experience. Log in to unlock bag actions, wishlist saves, and instant checkout.
                </p>
              </div>
            )}

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

            <div className="grid gap-4 border-t border-white/10 pt-8 sm:grid-cols-3">
              <button
                onClick={() => addToCart(selectedProduct)}
                className={`rounded-[1.5rem] py-5 text-lg font-bold transition-all flex items-center justify-center space-x-3 shadow-xl ${
                  user
                    ? 'bg-white text-slate-950 hover:-translate-y-1 hover:bg-cyan-300'
                    : 'border border-white/10 bg-white/10 text-white backdrop-blur-sm hover:bg-white/15'
                }`}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>{user ? 'Add to Bag' : 'Unlock Bag'}</span>
              </button>
              <button
                onClick={() => handleBuyNow(selectedProduct)}
                className={`rounded-[1.5rem] border-2 py-5 font-bold text-lg transition-all ${
                  user
                    ? 'border-cyan-300/20 bg-cyan-400/10 text-cyan-100 hover:border-cyan-300 hover:text-white'
                    : 'border-amber-300/20 bg-amber-300/10 text-amber-50 hover:bg-amber-300/15'
                }`}
              >
                {user ? 'Buy Now' : 'Unlock Checkout'}
              </button>
              <button
                onClick={() => toggleWishlist(selectedProduct)}
                className={`border-2 py-5 rounded-[1.5rem] font-bold text-lg transition-all ${
                  isWishlisted(selectedProduct.id)
                    ? 'border-pink-500 bg-pink-500 text-white hover:bg-pink-600 hover:border-pink-600'
                    : user
                      ? 'border-white/15 text-gray-900 hover:border-cyan-300 hover:text-cyan-200'
                      : 'border-white/15 bg-white/5 text-white hover:border-pink-300 hover:bg-white/10'
                }`}
              >
                {isWishlisted(selectedProduct.id) ? 'Wishlisted' : user ? 'Wishlist' : 'Unlock Wishlist'}
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

  const renderCart = () => {
    if (!user) {
      return renderProtectedAccessPanel(
        'Members Only',
        'Your bag unlocks after login.',
        'Sign in to add products, sync your bag, and move from discovery to checkout without losing your picks.',
        'Login to Unlock Bag',
        'Create Account'
      );
    }
    const featuredCategories = Array.from(new Set(cart.map((item) => item.category))).slice(0, 3);

    return (
      <div className="mx-auto max-w-7xl py-10 sm:py-12">
        <section className="commerce-luxe-panel overflow-hidden rounded-[2.5rem] border border-white/10 px-6 py-8 sm:px-8 lg:px-10">
          <div className="commerce-surface-grid pointer-events-none absolute inset-0 opacity-70" />
          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_360px] xl:items-end">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-50">
                <ShoppingBag className="h-4 w-4" />
                Shopping Bag
              </span>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-black tracking-[0.08em] text-white sm:text-5xl lg:text-6xl">
                  A checkout lane designed to feel as good as the products inside it.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  Review your saved pieces, fine-tune quantities, and move into checkout with the same premium rhythm as the storefront.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-100">
                  {cartCount} item{cartCount === 1 ? '' : 's'} in bag
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-100">
                  {wishlistCount} saved look{wishlistCount === 1 ? '' : 's'}
                </span>
                <span className="rounded-full border border-cyan-200/25 bg-cyan-200/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-cyan-50">
                  {isCartLoading ? 'Loading Bag' : isCartSyncing ? 'Syncing Bag' : 'Bag Synced'}
                </span>
              </div>

              {featuredCategories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {featuredCategories.map((category) => (
                    <span
                      key={category}
                      className="rounded-full border border-white/10 bg-slate-950/45 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300"
                    >
                      {category}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Bag Total</p>
                <p className="mt-3 text-3xl font-black text-white">{formatPrice(cartSummary.total)}</p>
                <p className="mt-2 text-sm text-slate-300">Includes tax with complimentary priority shipping.</p>
              </div>
              <div className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Delivery Window</p>
                <p className="mt-3 text-2xl font-black text-white">{cart.length > 0 ? '2-4 days' : 'Standby'}</p>
                <p className="mt-2 text-sm text-slate-300">Fast, tracked shipping activated at checkout.</p>
              </div>
              <div className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-100/70">Member Sync</p>
                <p className="mt-3 flex items-center gap-2 text-2xl font-black text-white">
                  <ShieldCheck className="h-5 w-5 text-emerald-300" />
                  Live
                </p>
                <p className="mt-2 text-sm text-slate-300">Your bag is connected to your account across visits.</p>
              </div>
            </div>
          </div>
        </section>

        {cartError && (
          <p className="mt-6 rounded-[1.75rem] border border-red-300/20 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-100">
            {cartError}
          </p>
        )}

        {cart.length === 0 ? (
          <section className="commerce-card-surface mt-8 overflow-hidden rounded-[2.5rem] border border-dashed border-white/10 px-6 py-16 text-center sm:px-10 sm:py-20">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.06] text-cyan-100 shadow-[0_24px_40px_-30px_rgba(34,211,238,0.7)]">
              <ShoppingBag className="h-11 w-11" />
            </div>
            <h2 className="mt-8 text-3xl font-black tracking-[0.06em] text-white sm:text-4xl">
              {isCartLoading ? 'Loading your saved bag...' : 'Your bag is ready for its first standout piece.'}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Add something you love and this space becomes your fast lane to checkout, synced across every visit.
            </p>
            {!isCartLoading && (
              <button
                type="button"
                onClick={() => goToView('shop')}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 px-8 py-4 text-base font-black text-slate-950 shadow-[0_26px_50px_-30px_rgba(103,232,249,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_32px_56px_-30px_rgba(236,72,153,0.75)]"
              >
                Start Shopping
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
          </section>
        ) : (
          <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.55fr)_380px]">
            <div className="space-y-5">
              {cart.map((item) => {
                const alreadySaved = isWishlisted(item.id);

                return (
                  <article
                    key={item.id}
                    className="commerce-card-surface relative overflow-hidden rounded-[2.2rem] border border-white/10 p-4 sm:p-5"
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.14),transparent_28%)]" />
                    <div className="relative flex flex-col gap-5 md:flex-row">
                      <button
                        type="button"
                        onClick={() => openProductDetail(item)}
                        className="group relative h-60 w-full shrink-0 overflow-hidden rounded-[1.75rem] border border-white/10 md:h-44 md:w-44"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <span className="absolute left-3 top-3 rounded-full bg-slate-950/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                          {item.location}
                        </span>
                      </button>

                      <div className="flex-1 space-y-4">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
                                {item.category}
                              </span>
                              {alreadySaved && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-rose-300/20 bg-rose-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-rose-100">
                                  <Heart className="h-3.5 w-3.5 fill-current" />
                                  Wishlisted
                                </span>
                              )}
                            </div>
                            <div>
                              <h3 className="text-2xl font-black tracking-tight text-white">{item.name}</h3>
                              <p className="copy-clamp-2 mt-2 max-w-2xl text-sm leading-6 text-slate-300">{item.description}</p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-300 transition-all duration-300 hover:border-red-300/30 hover:bg-red-500/10 hover:text-red-100"
                            aria-label={`Remove ${item.name} from cart`}
                          >
                            <Trash2 className="h-[18px] w-[18px]" />
                          </button>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-[auto_auto_1fr] lg:items-end">
                          <div className="inline-flex items-center rounded-[1.25rem] border border-white/10 bg-white/[0.06] p-1.5 shadow-inner">
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, -1)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 transition-colors hover:bg-white/[0.08]"
                              aria-label={`Decrease quantity for ${item.name}`}
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-[3.5rem] text-center text-xl font-black text-white">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.id, 1)}
                              className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-200 transition-colors hover:bg-white/[0.08]"
                              aria-label={`Increase quantity for ${item.name}`}
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="rounded-[1.25rem] border border-white/10 bg-white/[0.06] px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Unit price</p>
                            <p className="mt-2 text-lg font-black text-cyan-100">{formatPrice(item.price)}</p>
                          </div>

                          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-slate-400">Line total</p>
                              <p className="mt-2 text-3xl font-black text-white">{formatPrice(item.price * item.quantity)}</p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => openProductDetail(item)}
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.1]"
                              >
                                View Product
                                <ArrowRight className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!alreadySaved) {
                                    toggleWishlist(item);
                                  }
                                }}
                                disabled={alreadySaved}
                                className={`inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                                  alreadySaved
                                    ? 'cursor-default border border-rose-300/15 bg-rose-400/10 text-rose-100'
                                    : 'border border-cyan-200/20 bg-cyan-200/10 text-cyan-50 hover:border-cyan-200/40 hover:bg-cyan-200/15'
                                }`}
                              >
                                <Heart className={`h-4 w-4 ${alreadySaved ? 'fill-current' : ''}`} />
                                {alreadySaved ? 'Saved to Wishlist' : 'Save for Later'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
              <div className="commerce-card-surface rounded-[2.2rem] border border-white/10 p-6 sm:p-7">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-100/70">Order Summary</p>
                    <h2 className="mt-3 text-3xl font-black tracking-tight text-white">Ready for checkout</h2>
                  </div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-200/10 text-cyan-100">
                    <CreditCard className="h-5 w-5" />
                  </span>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-300">
                    <span>Subtotal</span>
                    <span>{formatPrice(cartSummary.subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-medium text-slate-300">
                    <span>Priority shipping</span>
                    <span className="font-black uppercase tracking-[0.18em] text-emerald-300">Complimentary</span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-medium text-slate-300">
                    <span>Tax</span>
                    <span>{formatPrice(cartSummary.tax)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[1.4rem] border border-white/10 bg-white/[0.06] px-4 py-4 text-base font-black text-white">
                    <span>Total</span>
                    <span>{formatPrice(cartSummary.total)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isCheckoutLoading || isCartLoading}
                  className={`mt-8 inline-flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 px-5 py-4 text-lg font-black text-slate-950 shadow-[0_24px_46px_-30px_rgba(103,232,249,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_52px_-30px_rgba(236,72,153,0.78)] ${(isCheckoutLoading || isCartLoading) ? 'opacity-70' : ''}`}
                >
                  {isCheckoutLoading || isCartLoading ? (
                    <div className="h-7 w-7 rounded-full border-4 border-slate-950/20 border-t-slate-950 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5" />
                      Checkout Now
                    </>
                  )}
                </button>

                <p className="mt-4 text-sm leading-6 text-slate-300">
                  Secure checkout, fast shipping, and account-synced updates from the moment you place your order.
                </p>
              </div>

              <div className="commerce-card-surface rounded-[2.2rem] border border-white/10 p-6">
                <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-100/70">Member Perks</p>
                <div className="mt-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-200/10 text-cyan-100">
                      <Truck className="h-[18px] w-[18px]" />
                    </span>
                    <div>
                      <p className="font-semibold text-white">Priority shipping included</p>
                      <p className="mt-1 text-sm text-slate-300">Every bag is staged for fast dispatch at no extra cost.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-200/10 text-cyan-100">
                      <ShieldCheck className="h-[18px] w-[18px]" />
                    </span>
                    <div>
                      <p className="font-semibold text-white">Protected payment flow</p>
                      <p className="mt-1 text-sm text-slate-300">Account-backed sync keeps your bag ready across sessions.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-200/10 text-cyan-100">
                      <Heart className="h-[18px] w-[18px]" />
                    </span>
                    <div>
                      <p className="font-semibold text-white">Style memory built in</p>
                      <p className="mt-1 text-sm text-slate-300">Keep favorites close with wishlist save-for-later actions.</p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    );
  };

  const renderWishlist = () => {
    if (!user) {
      return renderProtectedAccessPanel(
        'Wishlist Lock',
        'Save favorites after you sign in.',
        'Create an account to keep your wishlist synced, revisit standout products, and unlock personalized recommendations.',
        'Login to Save Favorites',
        'Sign Up for Deals'
      );
    }
    const featuredLocations = Array.from(new Set(wishlist.map((item) => item.location))).slice(0, 3);

    return (
      <div className="mx-auto max-w-7xl py-10 sm:py-12">
        <section className="commerce-luxe-panel overflow-hidden rounded-[2.5rem] border border-white/10 px-6 py-8 sm:px-8 lg:px-10">
          <div className="commerce-surface-grid pointer-events-none absolute inset-0 opacity-70" />
          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_360px] xl:items-end">
            <div className="space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.32em] text-rose-100">
                <Heart className="h-4 w-4 fill-current" />
                Wishlist
              </span>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-4xl font-black tracking-[0.08em] text-white sm:text-5xl lg:text-6xl">
                  Save the pieces that deserve a second look, then move on them when the moment feels right.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                  Your wishlist is your private moodboard for standout picks, synced to your account and always ready to convert into the bag.
                </p>
              </div>

              {wishlistError && (
                <p className="rounded-[1.5rem] border border-red-300/20 bg-red-500/10 px-5 py-4 text-sm font-semibold text-red-100">
                  {wishlistError}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-100">
                  {wishlistCount} saved
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.08] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-slate-100">
                  {cartCount} in bag
                </span>
                <span className="rounded-full border border-rose-300/20 bg-rose-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-rose-100">
                  {isWishlistLoading ? 'Loading Wishlist' : isWishlistSyncing ? 'Syncing Wishlist' : 'Wishlist Synced'}
                </span>
              </div>

              {featuredLocations.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {featuredLocations.map((location) => (
                    <span
                      key={location}
                      className="rounded-full border border-white/10 bg-slate-950/45 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-300"
                    >
                      {location}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <div className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-rose-100/70">Saved Now</p>
                <p className="mt-3 text-3xl font-black text-white">{wishlistCount}</p>
                <p className="mt-2 text-sm text-slate-300">A sharp shortlist of products worth revisiting.</p>
              </div>
              <div className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-rose-100/70">Ready to Move</p>
                <p className="mt-3 text-2xl font-black text-white">{formatPrice(wishlist.reduce((sum, item) => sum + item.price, 0))}</p>
                <p className="mt-2 text-sm text-slate-300">The full value of your saved collection at a glance.</p>
              </div>
              <div className="commerce-card-surface rounded-[1.9rem] border border-white/10 p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-rose-100/70">Style Radar</p>
                <p className="mt-3 flex items-center gap-2 text-2xl font-black text-white">
                  <Sparkles className="h-5 w-5 text-rose-200" />
                  Curated
                </p>
                <p className="mt-2 text-sm text-slate-300">Your favorite looks are always one click away from the bag.</p>
              </div>
            </div>
          </div>
        </section>

        {wishlist.length === 0 ? (
          <section className="commerce-card-surface mt-8 overflow-hidden rounded-[2.5rem] border border-dashed border-white/10 px-6 py-16 text-center sm:px-10 sm:py-20">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.06] text-rose-100 shadow-[0_24px_42px_-30px_rgba(244,114,182,0.75)]">
              <Heart className="h-11 w-11 fill-current" />
            </div>
            <h2 className="mt-8 text-3xl font-black tracking-[0.06em] text-white sm:text-4xl">
              {isWishlistLoading ? 'Loading your saved pieces...' : 'Your wishlist is waiting for its first obsession.'}
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Save the products that stand out now, then come back when you are ready to move them into your bag.
            </p>
            {!isWishlistLoading && (
              <button
                type="button"
                onClick={() => goToView('shop')}
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 px-8 py-4 text-base font-black text-slate-950 shadow-[0_26px_50px_-30px_rgba(103,232,249,0.9)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_32px_56px_-30px_rgba(236,72,153,0.75)]"
              >
                Explore Products
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
          </section>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {wishlist.map((item) => {
              const isInBag = cart.some((cartItem) => cartItem.id === item.id);

              return (
                <article
                  key={item.id}
                  className="commerce-card-surface group relative overflow-hidden rounded-[2.2rem] border border-white/10 p-4"
                >
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,114,182,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_30%)]" />
                  <div className="relative space-y-5">
                    <button
                      type="button"
                      onClick={() => openProductDetail(item)}
                      className="relative block h-72 w-full overflow-hidden rounded-[1.8rem] border border-white/10"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                        <span className="rounded-full bg-slate-950/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                          {item.category}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/[0.12] px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white">
                          {item.location}
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/65 px-4 py-3 backdrop-blur-sm">
                          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">Curated Price</p>
                          <p className="mt-1 text-2xl font-black text-white">{formatPrice(item.price)}</p>
                        </div>
                      </div>
                    </button>

                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-2xl font-black tracking-tight text-white">{item.name}</h3>
                          <p className="copy-clamp-2 mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromWishlist(item.id)}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-slate-300 transition-all duration-300 hover:border-red-300/30 hover:bg-red-500/10 hover:text-red-100"
                          aria-label={`Remove ${item.name} from wishlist`}
                        >
                          <Trash2 className="h-[18px] w-[18px]" />
                        </button>
                      </div>

                      {isInBag && (
                        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/20 bg-cyan-200/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-50">
                          <ShoppingBag className="h-4 w-4" />
                          Already in bag
                        </div>
                      )}

                      <div className="grid gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            addToCart(item);
                            removeFromWishlist(item.id);
                          }}
                          className="inline-flex items-center justify-center gap-2 rounded-[1.3rem] bg-gradient-to-r from-cyan-300 via-sky-300 to-fuchsia-300 px-5 py-4 text-sm font-black text-slate-950 shadow-[0_22px_42px_-30px_rgba(103,232,249,0.95)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_46px_-30px_rgba(236,72,153,0.75)]"
                        >
                          {isInBag ? 'Add One More to Bag' : 'Move to Bag'}
                          <ArrowRight className="h-4 w-4" />
                        </button>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => openProductDetail(item)}
                            className="rounded-[1.2rem] border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-slate-100 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.1]"
                          >
                            View Item
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFromWishlist(item.id)}
                            className="rounded-[1.2rem] border border-rose-300/20 bg-rose-400/10 px-4 py-3 text-sm font-semibold text-rose-100 transition-all duration-300 hover:border-rose-300/40 hover:bg-rose-400/15"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderProfile = () => {
    if (!user) {
      return renderProtectedAccessPanel(
        'Member Access',
        'Sign in to view your profile dashboard.',
        'Access your profile details, order history, and password controls from one secure account page.',
        'Login',
        'Create account'
      );
    }

    return (
      <ProfilePage
        user={user}
        initialTab={profileInitialTab}
        onBrowseShop={() => goToView('shop')}
      />
    );
  };

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
        setView={goToView} 
        cartCount={cartCount} 
        wishlistCount={wishlistCount}
        user={user}
        isAuthLoading={isAuthLoading}
        onLogin={() => promptForAuth('login', 'Login to unlock the full shopping experience.')}
        onRegister={() => promptForAuth('register', 'Create your account to unlock premium deals and checkout.')}
        onGoogle={handleGoogleAuth}
        onProfileClick={() => goToView('profile')}
        onLogout={() => {
          pendingProtectedViewRef.current = null;
          updateBrowserPath('home', true);
          logoutUser();
          setView('home');
        }}
      />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {currentView === 'home' && renderHome()}
        {currentView === 'shop' && renderShop()}
        {currentView === 'product' && renderProductDetails()}
        {currentView === 'cart' && renderCart()}
        {currentView === 'wishlist' && renderWishlist()}
        {currentView === 'profile' && renderProfile()}
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
        contextMessage={authPromptMessage}
        onClose={() => {
          if (window.location.pathname === getPathForRoute('login')) {
            updateBrowserPath(user ? currentView : 'home', true);
          }

          pendingProtectedViewRef.current = null;
          closeAuthModal();
        }}
        onLogin={loginWithPassword}
        onRegister={registerWithPassword}
        onGoogle={handleGoogleAuth}
      />
    </div>
  );
};

export default App;
