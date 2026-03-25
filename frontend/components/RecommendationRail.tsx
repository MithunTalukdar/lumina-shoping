import React from 'react';
import { Product } from '../types';
import { formatPrice } from '../utils/currency';

interface RecommendationRailProps {
  title: string;
  subtitle: string;
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onBuyNow: (product: Product) => void;
}

const RecommendationRail: React.FC<RecommendationRailProps> = ({
  title,
  subtitle,
  products,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
}) => {
  if (products.length === 0) {
    return null;
  }

  return (
    <section className="relative overflow-hidden rounded-[2.3rem] border border-white/70 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.18),_transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.92))] p-6 shadow-[0_22px_70px_-38px_rgba(14,116,144,0.35)] sm:p-8">
      <div className="pointer-events-none absolute right-0 top-0 h-36 w-36 rounded-full bg-cyan-200/35 blur-3xl" />
      <div className="relative space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-700">{subtitle}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{title}</h2>
          </div>
          <p className="max-w-xl text-sm font-medium leading-relaxed text-slate-600">
            Curated from your current shopping pattern, top-rated styles, and the collections you are already leaning toward.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          {products.map((product) => (
            <article
              key={product.id}
              className="group overflow-hidden rounded-[1.9rem] border border-white/70 bg-white/85 p-3 shadow-md backdrop-blur-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-xl"
            >
              <div className="relative overflow-hidden rounded-[1.5rem]">
                <img
                  src={product.image}
                  alt={product.name}
                  loading="lazy"
                  decoding="async"
                  className="h-56 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-transparent" />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-slate-950">
                  {product.category}
                </span>
              </div>

              <div className="space-y-3 p-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product)}
                      className="text-left text-lg font-black text-slate-950 transition-colors hover:text-cyan-700"
                    >
                      {product.name}
                    </button>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {product.rating.toFixed(1)} rated by {product.reviewsCount} shoppers
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-950 px-3 py-1.5 text-sm font-black text-white">
                    {formatPrice(product.price)}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onAddToCart(product)}
                    className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-cyan-700"
                  >
                    Add to Bag
                  </button>
                  <button
                    type="button"
                    onClick={() => onBuyNow(product)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-700 transition-colors hover:border-cyan-200 hover:text-cyan-700"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RecommendationRail;
