import React from 'react';

interface FilterBarProps {
  searchQuery: string;
  selectedLocation: 'All' | 'India' | 'NRI' | 'Dhaka';
  resultCount: number;
  isLoading: boolean;
  isSearchMode: boolean;
  onSearchChange: (value: string) => void;
  onLocationChange: (value: 'All' | 'India' | 'NRI' | 'Dhaka') => void;
  onClearSearch: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  selectedLocation,
  resultCount,
  isLoading,
  isSearchMode,
  onSearchChange,
  onLocationChange,
  onClearSearch,
}) => {
  const hasQuery = searchQuery.trim().length > 0;

  return (
    <section
      className={`shop-command-deck relative overflow-hidden rounded-[2rem] p-4 transition-all duration-500 sm:p-5 ${
        isSearchMode ? 'border-cyan-300/30 shadow-[0_24px_55px_-28px_rgba(34,211,238,0.45)]' : ''
      }`}
    >
      <div className="shop-command-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="relative grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
        <label className="relative block">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            Search Catalog
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search shirts, dresses, sneakers..."
            className="w-full rounded-[1.25rem] border border-white/10 bg-slate-950/60 py-3 pl-12 pr-16 text-sm font-semibold text-slate-100 outline-none transition-all focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
          />
          <svg className="absolute left-4 top-[3.05rem] h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {hasQuery && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-3 top-[2.6rem] inline-flex h-9 items-center justify-center rounded-full border border-white/10 bg-white/10 px-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-200 transition-all hover:border-cyan-300/40 hover:bg-cyan-300/10 hover:text-cyan-100"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-black uppercase tracking-[0.22em] text-slate-400">
            Location
          </span>
          <select
            value={selectedLocation}
            onChange={(event) => onLocationChange(event.target.value as FilterBarProps['selectedLocation'])}
            className="w-full rounded-[1.25rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-sm font-semibold text-slate-100 outline-none transition-all focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
          >
            <option value="All">All Locations</option>
            <option value="India">India</option>
            <option value="NRI">NRI</option>
            <option value="Dhaka">Dhaka</option>
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-3 md:col-span-2 md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {isSearchMode && (
              <span className="inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
                Focused Results
              </span>
            )}
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-100">
              {resultCount} {resultCount === 1 ? 'Result' : 'Results'}
            </span>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
            {isLoading && <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 animate-pulse" />}
            {isLoading ? 'Searching Catalog' : isSearchMode ? 'Results Ready' : 'Live Catalog'}
          </span>
        </div>
      </div>
    </section>
  );
};

export default FilterBar;
