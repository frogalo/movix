'use client';

import React, { useState, useRef } from 'react';
import { AwardItem, AwardsSummary } from '@/lib/awards';

interface TrophyShowcaseProps {
  awards: AwardsSummary | null | undefined;
  title?: string;
  variant?: 'full' | 'compact' | 'badge-only';
  className?: string;
  onAwardClick?: (item: AwardItem) => void;
}

export function TrophyShowcase({
  awards,
  title,
  variant = 'full',
  className = '',
  onAwardClick,
}: TrophyShowcaseProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'wins' | 'noms'>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (!awards || !awards.hasAwards) {
    return null;
  }

  const {
    totalWins,
    totalNominations,
    oscarWins,
    emmyWins,
    goldenGlobeWins,
    baftaWins,
    cannesWins,
    wins,
    nominations,
  } = awards;

  // Medallion and card styling configuration based on award type and status
  const getAwardTheme = (type: string, isNomination: boolean) => {
    if (isNomination) {
      return {
        cardBorder: 'border-zinc-800 hover:border-zinc-600',
        ringStyle: 'border-[3px] border-zinc-400/80 shadow-[0_0_18px_rgba(255,255,255,0.15)] bg-gradient-to-b from-zinc-500/25 via-zinc-900/90 to-zinc-950',
        trophyColor: 'text-zinc-300 drop-shadow-[0_0_6px_rgba(255,255,255,0.2)]',
        fill: 0,
        statusLabel: 'NOMINEE',
        statusColor: 'text-zinc-400',
        prizeColor: 'text-white',
        dividerColor: 'bg-zinc-700/60',
        hoverGlow: 'hover:shadow-[0_0_20px_rgba(255,255,255,0.06)]',
      };
    }

    switch (type) {
      case 'oscar':
      case 'emmy':
        return {
          cardBorder: 'border-amber-500/30 hover:border-amber-400/70',
          ringStyle: 'border-[3px] border-amber-400 shadow-[0_0_22px_rgba(251,191,36,0.4)] bg-gradient-to-b from-amber-500/30 via-zinc-900/90 to-zinc-950',
          trophyColor: 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]',
          fill: 1,
          statusLabel: 'WINNER',
          statusColor: 'text-amber-400',
          prizeColor: 'text-amber-200',
          dividerColor: 'bg-amber-500/40',
          hoverGlow: 'hover:shadow-[0_0_25px_rgba(251,191,36,0.18)]',
        };
      case 'golden_globe':
        return {
          cardBorder: 'border-purple-500/30 hover:border-purple-400/70',
          ringStyle: 'border-[3px] border-purple-400 shadow-[0_0_22px_rgba(168,85,247,0.4)] bg-gradient-to-b from-purple-500/30 via-zinc-900/90 to-zinc-950',
          trophyColor: 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]',
          fill: 1,
          statusLabel: 'WINNER',
          statusColor: 'text-purple-400',
          prizeColor: 'text-purple-200',
          dividerColor: 'bg-purple-500/40',
          hoverGlow: 'hover:shadow-[0_0_25px_rgba(168,85,247,0.18)]',
        };
      case 'bafta':
        return {
          cardBorder: 'border-cyan-500/30 hover:border-cyan-400/70',
          ringStyle: 'border-[3px] border-cyan-400 shadow-[0_0_22px_rgba(6,182,212,0.4)] bg-gradient-to-b from-cyan-500/30 via-zinc-900/90 to-zinc-950',
          trophyColor: 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]',
          fill: 1,
          statusLabel: 'WINNER',
          statusColor: 'text-cyan-400',
          prizeColor: 'text-cyan-200',
          dividerColor: 'bg-cyan-500/40',
          hoverGlow: 'hover:shadow-[0_0_25px_rgba(6,182,212,0.18)]',
        };
      case 'cannes':
        return {
          cardBorder: 'border-emerald-500/30 hover:border-emerald-400/70',
          ringStyle: 'border-[3px] border-emerald-400 shadow-[0_0_22px_rgba(16,185,129,0.4)] bg-gradient-to-b from-emerald-500/30 via-zinc-900/90 to-zinc-950',
          trophyColor: 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]',
          fill: 1,
          statusLabel: 'WINNER',
          statusColor: 'text-emerald-400',
          prizeColor: 'text-emerald-200',
          dividerColor: 'bg-emerald-500/40',
          hoverGlow: 'hover:shadow-[0_0_25px_rgba(16,185,129,0.18)]',
        };
      default:
        return {
          cardBorder: 'border-amber-500/30 hover:border-amber-400/70',
          ringStyle: 'border-[3px] border-amber-400 shadow-[0_0_22px_rgba(251,191,36,0.4)] bg-gradient-to-b from-amber-500/30 via-zinc-900/90 to-zinc-950',
          trophyColor: 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]',
          fill: 1,
          statusLabel: 'WINNER',
          statusColor: 'text-amber-400',
          prizeColor: 'text-amber-200',
          dividerColor: 'bg-amber-500/40',
          hoverGlow: 'hover:shadow-[0_0_25px_rgba(251,191,36,0.18)]',
        };
    }
  };

  // Headline summary
  const summaryParts: string[] = [];
  if (oscarWins > 0) summaryParts.push(`${oscarWins} Oscar${oscarWins > 1 ? 's' : ''}`);
  if (emmyWins > 0) summaryParts.push(`${emmyWins} Emmy${emmyWins > 1 ? 's' : ''}`);
  if (goldenGlobeWins > 0) summaryParts.push(`${goldenGlobeWins} Golden Globe${goldenGlobeWins > 1 ? 's' : ''}`);
  if (baftaWins > 0) summaryParts.push(`${baftaWins} BAFTA${baftaWins > 1 ? 's' : ''}`);
  if (cannesWins > 0) summaryParts.push(`${cannesWins} Palme d'Or`);

  const headlineWins = summaryParts.length > 0
    ? summaryParts.join(' • ')
    : `${totalWins} Won`;

  // Badge-only variant (Header / Mobile Pill)
  if (variant === 'badge-only') {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300 backdrop-blur-md border border-amber-400/20 ${className}`}>
        <span className="material-symbols-outlined text-[15px] text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>
          emoji_events
        </span>
        <span>{totalWins > 0 ? headlineWins : `${totalNominations} Nominations`}</span>
      </div>
    );
  }

  // Filter items
  let displayItems: AwardItem[] = [];
  if (activeTab === 'wins') {
    displayItems = wins;
  } else if (activeTab === 'noms') {
    displayItems = nominations;
  } else {
    displayItems = [...wins, ...nominations];
  }

  const totalCount = wins.length + nominations.length;

  // Card renderer
  const renderCard = (item: AwardItem, index: number, isGrid = false) => {
    const theme = getAwardTheme(item.type, item.isNomination);
    // For an actor page, item.forWork is the movie title (e.g. "Ben-Hur" or "The Bear")
    // For a movie/tv page, item.forWork is null or matches title, so category is the primary label
    const isActorPage = Boolean(item.forWork && (!title || item.forWork.toLowerCase() !== title.toLowerCase()));
    const primarySubtitle = isActorPage ? item.forWork! : item.category;

    // Hover details: For movie show recipient person name; for actor show category
    const hoverDetail = isActorPage
      ? (item.category !== primarySubtitle ? item.category : null)
      : (item.recipient ? `${item.isNomination ? 'Nominee' : 'Winner'}: ${item.recipient}` : (item.category !== primarySubtitle ? item.category : null));

    const isClickable = Boolean(onAwardClick && ((isActorPage && item.forWork) || (!isActorPage && item.recipient)));

    return (
      <div
        key={`${item.id}-${item.isNomination ? 'nom' : 'win'}-${index}`}
        onClick={() => isClickable && onAwardClick?.(item)}
        className={`group relative ${isGrid ? 'w-full' : 'snap-start shrink-0 w-28 sm:w-32'} rounded-xl bg-zinc-950/90 border ${theme.cardBorder} ${theme.hoverGlow} pt-7 pb-2.5 px-2 flex flex-col items-center text-center transition-all duration-300 select-none ${isClickable ? 'cursor-pointer hover:scale-[1.03] active:scale-[0.98]' : 'cursor-default'} hover:z-30`}
        title={`${item.typeLabel} (${item.year || 'N/A'}) - ${item.category}${item.recipient ? ` (${item.recipient})` : ''}${item.forWork ? ` for ${item.forWork}` : ''}`}
      >
        {/* 1. Medallion Trophy extending OUTSIDE top border */}
        <div className={`absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 sm:w-11 sm:h-11 rounded-full ${theme.ringStyle} flex items-center justify-center transition-transform group-hover:scale-110 duration-300 z-10`}>
          <span
            className={`material-symbols-outlined text-[20px] sm:text-[22px] ${theme.trophyColor}`}
            style={{ fontVariationSettings: `'FILL' ${theme.fill}` }}
          >
            emoji_events
          </span>
        </div>

        {/* 2. Status & Year on separate lines without dashes */}
        <span className={`text-[10px] font-black uppercase tracking-wider ${theme.statusColor} mt-0.5 leading-tight`}>
          {theme.statusLabel}
        </span>
        {item.year && (
          <span className="text-[10px] font-bold text-zinc-400 mt-0.5 leading-tight">
            {item.year}
          </span>
        )}

        {/* 3. Prize Name */}
        <h4 className="text-xs sm:text-[13px] font-black text-white tracking-tight w-full truncate mt-0.5" title={item.typeLabel}>
          {item.typeLabel}
        </h4>

        {/* 4. Category (for movie) or Movie Title (for actor) */}
        <p
          className="text-[11px] italic font-semibold text-zinc-300 group-hover:text-white transition-colors truncate w-full mt-0.5 px-0.5"
          title={primarySubtitle}
        >
          {primarySubtitle}
        </p>

        {/* 5. Hover Details: Recipient Name for movie / Category for actor (ABSOLUTE: zero layout shift) */}
        {(hoverDetail || isClickable) && (
          <div className="hidden md:block pointer-events-none absolute top-full left-[-1px] right-[-1px] z-30 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-zinc-950/95 border border-t-0 border-zinc-700/70 rounded-b-xl p-2 shadow-2xl backdrop-blur-xl mt-[-1px]">
            <div className={`w-4 h-[1px] ${theme.dividerColor} mx-auto mb-1`} />
            {hoverDetail && (
              <p className="text-[10px] text-zinc-200 font-medium line-clamp-3 leading-tight px-0.5">
                {hoverDetail}
              </p>
            )}
            {isClickable && (
              <div className="mt-1 flex items-center justify-center gap-1 text-[9px] font-bold text-amber-400">
                <span>View {isActorPage ? 'Movie' : 'Profile'}</span>
                <span className="material-symbols-outlined text-[10px]">open_in_new</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const desktopDisplayItems = isExpanded
    ? displayItems
    : (displayItems.length > 5 ? displayItems.slice(0, 4) : displayItems);

  return (
    <div className={`w-full ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 mb-2 px-1">
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">Awards</span>

          {/* Awards picker is hidden on mobile screens */}
          <div className="hidden sm:flex items-center gap-1 rounded-lg bg-white/[0.04] p-0.5 border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`rounded-md px-2 py-0.5 text-xs font-semibold transition-all ${
                activeTab === 'all'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              All ({totalCount})
            </button>
            {totalWins > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('wins')}
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-all ${
                  activeTab === 'wins'
                    ? 'bg-amber-400/20 text-amber-300'
                    : 'text-zinc-400 hover:text-amber-300'
                }`}
              >
                <span className="material-symbols-outlined text-[12px] text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                  emoji_events
                </span>
                <span>Wins ({totalWins})</span>
              </button>
            )}
            {totalNominations > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('noms')}
                className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-all ${
                  activeTab === 'noms'
                    ? 'bg-white/15 text-zinc-200'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="material-symbols-outlined text-[12px] text-zinc-400" style={{ fontVariationSettings: "'FILL' 0" }}>
                  emoji_events
                </span>
                <span>Nominations ({totalNominations})</span>
              </button>
            )}
          </div>
        </div>

        {/* Desktop Collapse toggle button in header (only shown when expanded) */}
        {isExpanded && (
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="hidden sm:inline-flex items-center gap-1 rounded-md bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
          >
            <span>Hide</span>
            <span className="material-symbols-outlined text-[15px] rotate-180">
              expand_more
            </span>
          </button>
        )}
      </div>

      {/* Desktop View: 5 Columns with 5th card as distinct View More button when collapsed */}
      <div className="hidden sm:block">
        <div className="grid grid-cols-5 gap-x-3 gap-y-8 pt-7 pb-2">
          {desktopDisplayItems.map((item, index) => renderCard(item, index, true))}

          {/* 5th slot: Distinct Action Card if > 5 awards and collapsed */}
          {!isExpanded && displayItems.length > 5 && (
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="group relative w-full rounded-xl bg-gradient-to-b from-amber-500/10 via-zinc-950/90 to-zinc-950/90 border-2 border-dashed border-amber-400/40 hover:border-amber-400 hover:bg-amber-400/15 hover:shadow-[0_0_25px_rgba(251,191,36,0.25)] pt-7 pb-2.5 px-2 flex flex-col items-center text-center transition-all duration-300 cursor-pointer select-none"
            >
              {/* Distinct Action Medallion Circle */}
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-10 h-10 sm:w-11 sm:h-11 rounded-full border-2 border-dashed border-amber-400/80 bg-zinc-950 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:bg-amber-400 group-hover:border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.25)]">
                <span className="material-symbols-outlined text-[22px] text-amber-400 group-hover:text-black transition-colors font-bold">
                  add
                </span>
              </div>

              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 group-hover:text-amber-300 transition-colors mt-0.5 leading-tight">
                +{displayItems.length - 4} MORE
              </span>

              <span className="text-[10px] font-bold text-zinc-400 mt-0.5 leading-tight">
                AWARDS
              </span>

              <h4 className="text-xs sm:text-[13px] font-black text-white group-hover:text-amber-200 tracking-tight w-full truncate mt-0.5">
                View All
              </h4>

              <p className="text-[11px] italic font-semibold text-zinc-400 group-hover:text-white transition-colors truncate w-full mt-0.5 px-0.5">
                {displayItems.length} Total
              </p>
            </button>
          )}
        </div>
      </div>

      {/* Mobile View: Smooth Horizontal Swiping Row */}
      <div
        ref={scrollContainerRef}
        className="flex sm:hidden gap-2.5 overflow-x-auto pb-3 pt-8 px-2 scroll-smooth hide-scrollbar snap-x touch-pan-x"
      >
        {displayItems.map((item, index) => renderCard(item, index, false))}
      </div>
    </div>
  );
}

