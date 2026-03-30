import React from 'react';
import { Product, ProductBadge } from '../types';
import { formatPrice } from '../utils/currency';

interface ProductCardProps {
  product: Product;
  onAddToCart: (p: Product) => void;
  onBuyNow: (p: Product) => void;
  onClick: (p: Product) => void;
  onToggleWishlist?: (p: Product) => void;
  isWishlisted?: boolean;
  isLocked?: boolean;
}

const BADGE_STYLES: Record<ProductBadge, string> = {
  New: 'border-cyan-300/35 bg-cyan-300/15 text-cyan-50',
  Trending: 'border-amber-300/35 bg-amber-300/15 text-amber-50',
  'Out of Stock': 'border-rose-300/35 bg-rose-400/15 text-rose-50',
};

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onBuyNow,
  onClick,
  onToggleWishlist,
  isWishlisted = false,
  isLocked = false,
}) => {
  const gallery = product.images && product.images.length > 0 ? product.images : [product.image];
  const secondaryImage = gallery[1] ?? gallery[0];
  const isOutOfStock = product.stock <= 0 || product.badges?.includes('Out of Stock');
  const discountPercentage = product.discountPercentage;
  const hasDiscount = Boolean(discountPercentage && product.originalPrice && product.originalPrice > product.price);
  const badges = product.badges?.length ? product.badges : [];

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f172a]/88 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.95)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_32px_72px_-30px_rgba(34,211,238,0.3)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-90" />

      <div
        className="relative aspect-[4/4.8] cursor-pointer overflow-hidden"
        onClick={() => onClick(product)}
      >
        <img
          src={gallery[0]}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className={`h-full w-full object-cover transition-all duration-700 ${secondaryImage !== gallery[0] ? 'group-hover:scale-105 group-hover:opacity-0' : 'group-hover:scale-110'}`}
        />
        {secondaryImage !== gallery[0] && (
          <img
            src={secondaryImage}
            alt={`${product.name} alternate view`}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover opacity-0 transition-all duration-700 group-hover:scale-105 group-hover:opacity-100"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/5 to-transparent" />

        <div className="absolute left-4 top-4 flex max-w-[calc(100%-5.5rem)] flex-wrap gap-2">
          {badges.map((badge) => (
            <span
              key={`${product.id}-${badge}`}
              className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur-sm ${BADGE_STYLES[badge]}`}
            >
              {badge}
            </span>
          ))}
          {!isOutOfStock && hasDiscount && (
            <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-100">
              {discountPercentage}% off
            </span>
          )}
        </div>

        {onToggleWishlist && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleWishlist(product);
            }}
            className={`absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border text-xs transition-all ${
              isLocked
                ? 'border-amber-300/35 bg-slate-950/75 text-amber-200 hover:border-amber-200/60'
                : isWishlisted
                ? 'border-pink-300/80 bg-pink-500 text-white shadow-lg shadow-pink-500/30'
                : 'border-white/10 bg-black/35 text-white hover:border-pink-300/70 hover:bg-pink-500/90'
            }`}
            aria-label={isLocked ? 'Login to unlock wishlist' : isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            {isLocked ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-7a2 2 0 00-2-2h-1V7a5 5 0 00-10 0v3H6a2 2 0 00-2 2v7a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
              </svg>
            )}
          </button>
        )}

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
              {product.gender}
            </span>
            <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-100">
              {product.category}
            </span>
          </div>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onClick(product);
            }}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white opacity-100 transition-all sm:translate-y-4 sm:opacity-0 sm:group-hover:translate-y-0 sm:group-hover:opacity-100"
          >
            Quick View
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              {product.type} / {product.location}
            </p>
            <h3
              className="cursor-pointer text-xl font-black text-white transition-colors group-hover:text-cyan-200"
              onClick={() => onClick(product)}
            >
              {product.name}
            </h3>
          </div>

          <div className="text-right">
            <span className="rounded-full bg-white px-3 py-1.5 text-sm font-black text-slate-950">
              {formatPrice(product.price)}
            </span>
            {hasDiscount ? (
              <p className="mt-2 text-xs font-semibold text-slate-500 line-through">{formatPrice(product.originalPrice as number)}</p>
            ) : (
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Premium pick</p>
            )}
          </div>
        </div>

        <p className="copy-clamp-2 mb-5 flex-1 text-sm leading-relaxed text-slate-400">
          {product.description}
        </p>

        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, index) => (
              <svg
                key={index}
                className={`h-4 w-4 ${index < Math.round(product.rating) ? 'text-amber-300' : 'text-slate-600'}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>

          <span className="text-xs font-semibold text-slate-400">
            {product.rating.toFixed(1)} / {product.reviewsCount} reviews
          </span>
        </div>

        <div className="mb-4 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          <span>{isLocked ? 'Members unlock wishlist and checkout.' : 'Member experience active.'}</span>
          <span className={isOutOfStock ? 'text-rose-200' : 'text-emerald-200'}>
            {isOutOfStock ? 'Out of stock' : `${product.stock} in stock`}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={isOutOfStock}
            onClick={(event) => {
              event.stopPropagation();
              if (!isOutOfStock) {
                onAddToCart(product);
              }
            }}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] px-4 py-3.5 text-sm font-black uppercase tracking-[0.14em] transition-all duration-300 active:scale-[0.98] ${
              isOutOfStock
                ? 'cursor-not-allowed border border-white/10 bg-white/5 text-slate-500'
                : isLocked
                ? 'border border-white/10 bg-white/10 text-white backdrop-blur-sm hover:bg-white/15'
                : 'bg-white text-slate-950 hover:bg-cyan-300'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            <span>{isOutOfStock ? 'Out of Stock' : isLocked ? 'Unlock Bag' : 'Add to Bag'}</span>
          </button>

          <button
            type="button"
            disabled={isOutOfStock}
            onClick={(event) => {
              event.stopPropagation();
              if (!isOutOfStock) {
                onBuyNow(product);
              }
            }}
            className={`inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] border px-4 py-3.5 text-sm font-black uppercase tracking-[0.14em] transition-all duration-300 active:scale-[0.98] ${
              isOutOfStock
                ? 'cursor-not-allowed border-white/10 bg-transparent text-slate-500'
                : isLocked
                ? 'border-amber-300/20 bg-amber-300/10 text-amber-50 backdrop-blur-sm hover:bg-amber-300/15'
                : 'border-white/10 bg-transparent text-white hover:border-cyan-300/60 hover:text-cyan-200'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>{isOutOfStock ? 'Notify Soon' : isLocked ? 'Unlock Checkout' : 'Buy Now'}</span>
          </button>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
