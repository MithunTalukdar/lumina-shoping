import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Clock3,
  History,
  LoaderCircle,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp,
  X,
} from 'lucide-react';
import { CartItem, Product, User } from '../types';
import {
  AssistantFilters,
  AssistantRecommendationBundle,
  AssistantResultItem,
  AssistantSuggestion,
  AssistantViewState,
  buildAssistantIndex,
  getAssistantRecommendations,
  getAssistantSuggestions,
} from '../services/assistantService';
import { formatPrice } from '../utils/currency';

const HISTORY_STORAGE_KEY = 'lumina-assistant-search-history';
const HISTORY_LIMIT = 8;
const DEFAULT_FILTERS: AssistantFilters = {
  category: 'all',
  maxPrice: null,
  minRating: 0,
};
const PRICE_FILTER_OPTIONS = [
  { label: 'Any Price', value: 'all' },
  { label: 'Under 1000', value: '1000' },
  { label: 'Under 2500', value: '2500' },
  { label: 'Under 5000', value: '5000' },
  { label: 'Under 10000', value: '10000' },
];
const RATING_FILTER_OPTIONS = [
  { label: 'All Ratings', value: '0' },
  { label: '4.0+', value: '4' },
  { label: '4.5+', value: '4.5' },
  { label: '4.8+', value: '4.8' },
];

interface ShoppingAssistantProps {
  products: Product[];
  cart: CartItem[];
  wishlist: Product[];
  user: User | null;
  onSelectProduct: (product: Product) => void;
  onApplySearch?: (query: string) => void;
}

function escapeForRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderHighlightedText(text: string, terms: string[]) {
  const normalizedTerms = Array.from(
    new Set(terms.map((term) => term.trim()).filter((term) => term.length > 1))
  );

  if (normalizedTerms.length === 0) {
    return text;
  }

  const pattern = new RegExp(`(${normalizedTerms.map(escapeForRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return parts.map((part, index) => {
    const isMatch = normalizedTerms.some(
      (term) => part.toLowerCase() === term.toLowerCase()
    );

    if (!isMatch) {
      return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
    }

    return (
      <mark
        key={`${part}-${index}`}
        className="rounded bg-cyan-300/20 px-1 text-cyan-100"
      >
        {part}
      </mark>
    );
  });
}

function getSuggestionStyle(kind: AssistantSuggestion['kind']) {
  switch (kind) {
    case 'history':
      return 'border-amber-300/20 bg-amber-300/10 text-amber-100';
    case 'product':
      return 'border-cyan-300/20 bg-cyan-300/10 text-cyan-100';
    case 'category':
      return 'border-emerald-300/20 bg-emerald-300/10 text-emerald-100';
    case 'intent':
    default:
      return 'border-fuchsia-300/20 bg-fuchsia-300/10 text-fuchsia-100';
  }
}

function ResultSection({
  title,
  eyebrow,
  items,
  emptyMessage,
  onSelectProduct,
}: {
  title: string;
  eyebrow: string;
  items: AssistantResultItem[];
  emptyMessage: string;
  onSelectProduct: (product: Product) => void;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{eyebrow}</p>
          <h3 className="mt-1 text-lg font-black text-white">{title}</h3>
        </div>
        {items.length > 0 && (
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
            {items.length} Picks
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-slate-950/35 px-4 py-8 text-center text-sm font-medium text-slate-400">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <button
              key={item.product.id}
              type="button"
              onClick={() => onSelectProduct(item.product)}
              className="commerce-card-surface group overflow-hidden rounded-[1.55rem] border border-white/10 p-3 text-left transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/30"
            >
              <div className="flex gap-3">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  loading="lazy"
                  decoding="async"
                  className="h-20 w-20 shrink-0 rounded-[1.15rem] object-cover"
                />

                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                        {item.product.category} • {item.product.location}
                      </p>
                      <h4 className="mt-1 truncate text-base font-black text-white">
                        {renderHighlightedText(item.product.name, item.matchTerms)}
                      </h4>
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-950">
                      {formatPrice(item.product.price)}
                    </span>
                  </div>

                  <p className="copy-clamp-2 text-sm leading-relaxed text-slate-400">
                    {renderHighlightedText(item.product.description, item.matchTerms)}
                  </p>

                  <div className="flex flex-wrap items-center gap-2">
                    {item.matchTerms.slice(0, 3).map((term) => (
                      <span
                        key={`${item.product.id}-${term}`}
                        className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100"
                      >
                        {term}
                      </span>
                    ))}

                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-200">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {item.product.rating.toFixed(1)} / {item.product.reviewsCount}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
                <p className="text-xs font-medium text-slate-300">{item.reason}</p>
                <span className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
                  View
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={`assistant-skeleton-${index}`}
          className="overflow-hidden rounded-[1.55rem] border border-white/10 bg-slate-950/50 p-3 animate-pulse"
        >
          <div className="flex gap-3">
            <div className="h-20 w-20 rounded-[1.15rem] bg-slate-800/80" />
            <div className="flex-1 space-y-3">
              <div className="h-3 w-24 rounded-full bg-slate-700/80" />
              <div className="h-5 w-2/3 rounded-full bg-slate-700/80" />
              <div className="h-4 w-full rounded-full bg-slate-800/80" />
              <div className="h-4 w-5/6 rounded-full bg-slate-800/80" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const ShoppingAssistant: React.FC<ShoppingAssistantProps> = ({
  products,
  cart,
  wishlist,
  user,
  onSelectProduct,
  onApplySearch,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [assistantState, setAssistantState] = useState<AssistantViewState>('idle');
  const [filters, setFilters] = useState<AssistantFilters>(DEFAULT_FILTERS);
  const [history, setHistory] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<AssistantSuggestion[]>([]);
  const [bundle, setBundle] = useState<AssistantRecommendationBundle>({
    state: 'idle',
    normalizedQuery: '',
    summary: 'Ask for a product, budget, or occasion and I will rank the strongest matches instantly.',
    topResults: [],
    recommendedForYou: [],
    similarItems: [],
    helpfulSuggestions: [],
    suggestions: [],
    didUseFallback: false,
    inferredBudget: null,
    inferredCategory: null,
    inferredMinRating: 0,
  });
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const categories = Array.from(new Set(products.map((product) => product.category))).sort((left, right) =>
    left.localeCompare(right)
  );

  const persistHistory = (nextQuery: string) => {
    const trimmedQuery = nextQuery.trim();

    if (trimmedQuery.length < 3) {
      return;
    }

    setHistory((current) => {
      const nextHistory = [
        trimmedQuery,
        ...current.filter((item) => item.toLowerCase() !== trimmedQuery.toLowerCase()),
      ].slice(0, HISTORY_LIMIT);

      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(nextHistory));
      return nextHistory;
    });
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  const handleOpenProduct = (product: Product) => {
    if (query.trim()) {
      persistHistory(query);
    }

    onSelectProduct(product);
    setIsOpen(false);
  };

  const handleApplySearch = (nextQuery = query) => {
    const trimmedQuery = nextQuery.trim();

    if (!trimmedQuery || !onApplySearch) {
      return;
    }

    persistHistory(trimmedQuery);
    onApplySearch(trimmedQuery);
    setIsOpen(false);
  };

  useEffect(() => {
    try {
      const storedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);

      if (!storedHistory) {
        return;
      }

      const parsedHistory = JSON.parse(storedHistory) as unknown;

      if (!Array.isArray(parsedHistory)) {
        return;
      }

      setHistory(
        parsedHistory
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .slice(0, HISTORY_LIMIT)
      );
    } catch {
      // Ignore malformed history and continue with an empty state.
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const indexedProducts = buildAssistantIndex(products);
    setSuggestions(getAssistantSuggestions(query, indexedProducts, history));

    if (!query.trim()) {
      setDebouncedQuery('');
      setAssistantState('idle');
      return;
    }

    setAssistantState('typing');

    const debounceTimeoutId = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 220);

    return () => {
      window.clearTimeout(debounceTimeoutId);
    };
  }, [history, isOpen, products, query]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const indexedProducts = buildAssistantIndex(products);
    const nextSuggestions = getAssistantSuggestions(query, indexedProducts, history);
    const signals = { user, cart, wishlist, history };

    setSuggestions(nextSuggestions);

    if (!debouncedQuery) {
      const idleBundle = getAssistantRecommendations('', indexedProducts, filters, signals);
      setBundle(idleBundle);
      setAssistantState('idle');
      return;
    }

    setAssistantState('loading');

    const searchTimeoutId = window.setTimeout(() => {
      const nextBundle = getAssistantRecommendations(debouncedQuery, indexedProducts, filters, signals);
      setBundle(nextBundle);
      setAssistantState(nextBundle.state === 'empty' ? 'empty' : 'results');

      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    }, 140);

    return () => {
      window.clearTimeout(searchTimeoutId);
    };
  }, [cart, debouncedQuery, filters, history, isOpen, products, query, user, wishlist]);

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close assistant backdrop"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[2px]"
        />
      )}

      <div className="fixed bottom-5 right-5 z-50">
        {isOpen ? (
          <div className="fixed inset-x-3 bottom-3 top-20 sm:inset-auto sm:bottom-5 sm:right-5 sm:w-[28.5rem] sm:h-[min(48rem,calc(100vh-2.5rem))]">
            <div className="commerce-luxe-panel search-mode-enter relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl">
              <div className="commerce-surface-grid pointer-events-none absolute inset-0 opacity-55" />
              <div className="pointer-events-none absolute -left-10 top-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
              <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-fuchsia-400/15 blur-3xl" />

              <div className="relative border-b border-white/10 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
                      <Sparkles className="h-3.5 w-3.5" />
                      Lumina AI Assistant
                    </div>
                    <h2 className="text-xl font-black text-white">
                      {user ? `Smart picks for ${user.name}` : 'Smart search and recommendations'}
                    </h2>
                    <p className="text-sm leading-relaxed text-slate-300">
                      Search by budget, style, or intent and I will rank the best matches in real time.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleApplySearch();
                  }}
                  className="mt-4"
                >
                  <div className="flex gap-2">
                    <label className="relative block flex-1">
                      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Try 'cheap shoes under 2000' or 'best dress for party'"
                        className="w-full rounded-[1.2rem] border border-white/10 bg-slate-950/70 py-3 pl-11 pr-11 text-sm font-semibold text-slate-100 outline-none transition-all focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                      />
                      {query.trim().length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            setQuery('');
                            setDebouncedQuery('');
                            setAssistantState('idle');
                          }}
                          className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
                          aria-label="Clear assistant query"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </label>

                    {onApplySearch && (
                      <button
                        type="submit"
                        disabled={!query.trim()}
                        className="inline-flex items-center justify-center rounded-[1.2rem] border border-cyan-300/30 bg-cyan-300/12 px-4 text-sm font-black uppercase tracking-[0.14em] text-cyan-100 transition-all hover:-translate-y-0.5 hover:border-cyan-300/60 hover:bg-cyan-300/18 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        Open Shop
                      </button>
                    )}
                  </div>
                </form>

                {suggestions.length > 0 && (
                  <div className="mt-3 grid gap-2">
                    {suggestions.slice(0, query.trim() ? 4 : 3).map((suggestion) => (
                      <button
                        key={suggestion.id}
                        type="button"
                        onClick={() => {
                          setQuery(suggestion.query);
                          setDebouncedQuery(suggestion.query);
                          persistHistory(suggestion.query);
                        }}
                        className="flex items-center justify-between gap-3 rounded-[1rem] border border-white/10 bg-white/5 px-3 py-2 text-left transition-colors hover:border-white/20 hover:bg-white/10"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">{suggestion.label}</p>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                            {suggestion.caption}
                          </p>
                        </div>
                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${getSuggestionStyle(suggestion.kind)}`}>
                          {suggestion.kind}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
                      {assistantState === 'loading' && <LoaderCircle className="h-3.5 w-3.5 animate-spin" />}
                      {assistantState === 'idle'
                        ? 'Idle'
                        : assistantState === 'typing'
                        ? 'Typing'
                        : assistantState === 'loading'
                        ? 'Loading'
                        : assistantState === 'empty'
                        ? 'No Direct Match'
                        : 'Results Ready'}
                    </span>
                    {bundle.inferredBudget !== null && (
                      <span className="inline-flex items-center rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">
                        Budget {formatPrice(bundle.inferredBudget)}
                      </span>
                    )}
                    {bundle.inferredCategory && (
                      <span className="inline-flex items-center rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">
                        {bundle.inferredCategory}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsFiltersOpen((current) => !current)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
                  >
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    Filters
                  </button>
                </div>

                {isFiltersOpen && (
                  <div className="mt-3 grid gap-3 rounded-[1.3rem] border border-white/10 bg-slate-950/45 p-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Category</span>
                        <select
                          value={filters.category}
                          onChange={(event) =>
                            setFilters((current) => ({ ...current, category: event.target.value }))
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-slate-100 outline-none transition-all focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                        >
                          <option value="all">All Categories</option>
                          {categories.map((category) => (
                            <option key={category} value={category}>
                              {category}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Price</span>
                        <select
                          value={filters.maxPrice === null ? 'all' : String(filters.maxPrice)}
                          onChange={(event) =>
                            setFilters((current) => ({
                              ...current,
                              maxPrice: event.target.value === 'all' ? null : Number(event.target.value),
                            }))
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-slate-100 outline-none transition-all focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                        >
                          {PRICE_FILTER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Rating</span>
                        <select
                          value={String(filters.minRating)}
                          onChange={(event) =>
                            setFilters((current) => ({
                              ...current,
                              minRating: Number(event.target.value),
                            }))
                          }
                          className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm font-semibold text-slate-100 outline-none transition-all focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                        >
                          {RATING_FILTER_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={resetFilters}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-200 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
                    >
                      Reset Filters
                    </button>
                  </div>
                )}
              </div>

              <div ref={scrollRef} className="relative flex-1 overflow-y-auto px-4 pb-4 pt-4">
                <div className="space-y-5">
                  <section className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                          {bundle.didUseFallback ? 'Alternative matches' : 'AI-ranked guidance'}
                        </p>
                        <h3 className="mt-1 text-lg font-black text-white">
                          {bundle.normalizedQuery ? `Results for "${bundle.normalizedQuery}"` : 'Ready for your next search'}
                        </h3>
                      </div>

                      {bundle.topResults.length > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
                          <TrendingUp className="h-3.5 w-3.5" />
                          {bundle.topResults.length} top picks
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm leading-relaxed text-slate-300">{bundle.summary}</p>

                    {bundle.helpfulSuggestions.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {bundle.helpfulSuggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => {
                              setQuery(suggestion);
                              setDebouncedQuery(suggestion);
                            }}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-slate-200 transition-colors hover:border-cyan-300/35 hover:bg-cyan-300/10 hover:text-cyan-100"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </section>

                  {assistantState === 'loading' ? (
                    <LoadingState />
                  ) : (
                    <>
                      <ResultSection
                        title="Top Results"
                        eyebrow="Most Relevant"
                        items={bundle.topResults}
                        emptyMessage="No exact result yet. Try a broader query or one of the smart suggestions above."
                        onSelectProduct={handleOpenProduct}
                      />

                      <ResultSection
                        title="Recommended for You"
                        eyebrow="Personalized"
                        items={bundle.recommendedForYou}
                        emptyMessage="Use the assistant a bit more and I will tune recommendations around your style."
                        onSelectProduct={handleOpenProduct}
                      />

                      <ResultSection
                        title="Similar Items"
                        eyebrow="Close Alternatives"
                        items={bundle.similarItems}
                        emptyMessage="Open a top result and I will keep surfacing adjacent styles here."
                        onSelectProduct={handleOpenProduct}
                      />
                    </>
                  )}

                  {history.length > 0 && (
                    <section className="space-y-3 rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center gap-2">
                        <History className="h-4 w-4 text-cyan-100" />
                        <h3 className="text-base font-black text-white">Recent Searches</h3>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {history.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setQuery(item);
                              setDebouncedQuery(item);
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/55 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-white/25 hover:bg-white/10 hover:text-white"
                          >
                            <Clock3 className="h-3.5 w-3.5 text-slate-400" />
                            {item}
                          </button>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="commerce-luxe-panel group flex items-center gap-3 rounded-full border border-white/10 px-4 py-3 text-left shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-cyan-300/30"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
              <Sparkles className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6" />
            </span>
            <span className="hidden sm:block">
              <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100/80">
                AI Assistant
              </span>
              <span className="mt-1 block text-sm font-semibold text-white">
                Search, compare, and get ranked picks
              </span>
            </span>
          </button>
        )}
      </div>
    </>
  );
};

export default ShoppingAssistant;
