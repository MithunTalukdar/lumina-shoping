import React from 'react';
import { Product } from '../types';
import ProductCard from './ProductCard';

interface ProductSectionProps {
  title: string;
  subtitle: string;
  accentClass: string;
  products: Product[];
  visibleCount: number;
  isLoading: boolean;
  onLoadMore: () => void;
  onViewAll: () => void;
  onAddToCart: (product: Product) => void;
  onToggleWishlist: (product: Product) => void;
  isWishlisted: (productId: string) => boolean;
  onSelectProduct: (product: Product) => void;
}

const SKELETON_COUNT = 8;

const ProductSection: React.FC<ProductSectionProps> = ({
  title,
  subtitle,
  accentClass,
  products,
  visibleCount,
  isLoading,
  onLoadMore,
  onViewAll,
  onAddToCart,
  onToggleWishlist,
  isWishlisted,
  onSelectProduct,
}) => {
  const visibleProducts = products.slice(0, visibleCount);
  const hasMore = products.length > visibleCount;

  return (
    <section className="fashion-section-shell relative overflow-hidden rounded-[2.4rem] border border-white/10 p-6 shadow-2xl sm:p-8">
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-br ${accentClass} opacity-90`} />
      <div className="relative space-y-6">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">{subtitle}</p>
            <h2 className="text-3xl font-black text-white sm:text-4xl">{title}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex w-fit items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-200">
              {products.length} Styles
            </span>
            <button
              type="button"
              onClick={onViewAll}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-200 transition-colors hover:border-white/25 hover:bg-white/10"
            >
              View All
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
              <div
                key={`${title}-skeleton-${index}`}
                className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/55 animate-pulse"
              >
                <div className="aspect-[4/4.8] bg-slate-800/80" />
                <div className="space-y-4 p-5">
                  <div className="h-3 w-20 rounded-full bg-slate-700/80" />
                  <div className="h-6 w-3/4 rounded-full bg-slate-700/80" />
                  <div className="h-4 w-full rounded-full bg-slate-800/80" />
                  <div className="h-4 w-5/6 rounded-full bg-slate-800/80" />
                  <div className="h-12 rounded-[1.1rem] bg-slate-700/80" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-[2rem] border border-dashed border-white/15 bg-slate-950/35 px-6 py-16 text-center">
            <p className="text-xl font-bold text-slate-300">No products found for this section.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={onAddToCart}
                  onToggleWishlist={onToggleWishlist}
                  isWishlisted={isWishlisted(product.id)}
                  onClick={onSelectProduct}
                />
              ))}
            </div>

            {hasMore && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={onLoadMore}
                  className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-6 py-3 text-sm font-black uppercase tracking-[0.16em] text-cyan-200 transition-all hover:-translate-y-0.5 hover:border-cyan-300/60 hover:bg-cyan-300/15"
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
};

export default ProductSection;
