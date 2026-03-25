import React from 'react';
import { Product } from '../types';
import { formatPrice } from '../utils/currency';

interface ProductCardProps {
  product: Product;
  onAddToCart: (p: Product) => void;
  onClick: (p: Product) => void;
  onToggleWishlist?: (p: Product) => void;
  isWishlisted?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onClick,
  onToggleWishlist,
  isWishlisted = false,
}) => {
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0f172a]/88 shadow-[0_24px_50px_-32px_rgba(15,23,42,0.95)] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_32px_72px_-30px_rgba(34,211,238,0.3)]">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-transparent opacity-90" />

      <div
        className="relative aspect-[4/4.8] cursor-pointer overflow-hidden"
        onClick={() => onClick(product)}
      >
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/5 to-transparent" />

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
            {product.gender}
          </span>
          <span className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-100">
            {product.category}
          </span>
        </div>

        {onToggleWishlist && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onToggleWishlist(product);
            }}
            className={`absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border text-xs transition-all ${
              isWishlisted
                ? 'border-pink-300/80 bg-pink-500 text-white shadow-lg shadow-pink-500/30'
                : 'border-white/10 bg-black/35 text-white hover:border-pink-300/70 hover:bg-pink-500/90'
            }`}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
          </button>
        )}
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

          <span className="rounded-full bg-white px-3 py-1.5 text-sm font-black text-slate-950">
            {formatPrice(product.price)}
          </span>
        </div>

        <p className="copy-clamp-2 mb-5 flex-1 text-sm leading-relaxed text-slate-400">
          {product.description}
        </p>

        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                className={`h-4 w-4 ${i < Math.round(product.rating) ? 'text-amber-300' : 'text-slate-600'}`}
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

        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          className="inline-flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-white px-4 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition-all duration-300 hover:bg-cyan-300 active:scale-[0.98]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span>Add to Bag</span>
        </button>
      </div>
    </article>
  );
};

export default ProductCard;
