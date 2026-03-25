import React from 'react';

interface ShopUnlockBannerProps {
  isAuthenticated: boolean;
  userName?: string;
  cartCount: number;
  wishlistCount: number;
  onLogin: () => void;
  onRegister: () => void;
}

const ShopUnlockBanner: React.FC<ShopUnlockBannerProps> = ({
  isAuthenticated,
  userName,
  cartCount,
  wishlistCount,
  onLogin,
  onRegister,
}) => {
  if (isAuthenticated) {
    return (
      <section className="relative overflow-hidden rounded-[2.2rem] border border-emerald-200/60 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_42%),linear-gradient(135deg,rgba(236,253,245,0.95),rgba(240,249,255,0.92))] p-6 shadow-[0_22px_60px_-28px_rgba(16,185,129,0.35)] sm:p-8">
        <div className="pointer-events-none absolute -right-10 top-0 h-44 w-44 rounded-full bg-emerald-300/35 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-4">
            <span className="inline-flex rounded-full border border-emerald-300/60 bg-white/80 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-emerald-700">
              Full Access Unlocked
            </span>
            <div className="space-y-2">
              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Welcome back{userName ? `, ${userName}` : ''}. Your premium shopping flow is live.
              </h2>
              <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base">
                Bag sync, wishlist saves, and fast checkout are ready. Your recommendations now adapt to what you explore most.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <article className="rounded-[1.6rem] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Bag Items</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{cartCount}</p>
            </article>
            <article className="rounded-[1.6rem] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Wishlist</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{wishlistCount}</p>
            </article>
            <article className="rounded-[1.6rem] border border-white/70 bg-slate-950 p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Perks</p>
              <p className="mt-2 text-lg font-black text-white">Priority checkout</p>
            </article>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[2.2rem] border border-[#102a43]/10 bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.22),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(249,115,22,0.18),_transparent_35%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.96))] p-6 shadow-[0_28px_80px_-34px_rgba(15,23,42,0.85)] sm:p-8">
      <div className="pointer-events-none absolute -left-10 top-6 h-40 w-40 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-48 w-48 rounded-full bg-orange-300/20 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="space-y-5">
          <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-200">
            Demo Mode Live
          </span>
          <div className="space-y-3">
            <h2 className="max-w-2xl text-3xl font-black tracking-tight text-white sm:text-4xl">
              Preview the collection. Login to unlock the moments that convert browsing into buying.
            </h2>
            <p className="max-w-2xl text-sm font-medium leading-relaxed text-slate-300 sm:text-base">
              Guests can explore the fashion edit, quick view products, and feel the experience. Sign in to unlock bag sync,
              wishlist saves, instant checkout, and personalized recommendations.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onLogin}
              className="rounded-2xl bg-white px-6 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-slate-950 transition-transform hover:-translate-y-0.5"
            >
              Login to Explore More
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="rounded-2xl border border-white/15 bg-white/10 px-6 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white transition-transform hover:-translate-y-0.5 hover:bg-white/15"
            >
              Sign Up for Best Deals
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-[1.6rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Unlock</p>
            <p className="mt-2 text-lg font-black text-white">Add to bag</p>
          </article>
          <article className="rounded-[1.6rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Unlock</p>
            <p className="mt-2 text-lg font-black text-white">Wishlist saves</p>
          </article>
          <article className="rounded-[1.6rem] border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Unlock</p>
            <p className="mt-2 text-lg font-black text-white">Fast checkout</p>
          </article>
        </div>
      </div>
    </section>
  );
};

export default ShopUnlockBanner;
