'use client';

import React, { useState } from 'react';
import { AwardItem, AwardsSummary } from '@/lib/awards';

interface TrophyShowcaseProps {
  awards: AwardsSummary | null | undefined;
  title?: string;
  variant?: 'full' | 'compact' | 'badge-only';
  className?: string;
}

export function TrophyShowcase({ awards, variant = 'full', className = '' }: TrophyShowcaseProps) {
  const [activeTab, setActiveTab] = useState<'wins' | 'noms' | 'all'>('wins');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState(false);

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

  // Award styling configuration
  const getAwardTheme = (type: string, isNomination: boolean) => {
    if (isNomination) {
      return {
        trophyColor: 'text-zinc-500',
        fill: 0,
        badgeBg: 'bg-zinc-800/50',
        labelColor: 'text-zinc-400',
      };
    }

    switch (type) {
      case 'oscar':
        return {
          trophyColor: 'text-amber-400',
          fill: 1,
          badgeBg: 'bg-amber-500/15',
          labelColor: 'text-amber-200',
        };
      case 'emmy':
        return {
          trophyColor: 'text-yellow-400',
          fill: 1,
          badgeBg: 'bg-yellow-500/15',
          labelColor: 'text-yellow-200',
        };
      case 'golden_globe':
        return {
          trophyColor: 'text-cyan-400',
          fill: 1,
          badgeBg: 'bg-cyan-500/15',
          labelColor: 'text-cyan-200',
        };
      case 'bafta':
        return {
          trophyColor: 'text-purple-400',
          fill: 1,
          badgeBg: 'bg-purple-500/15',
          labelColor: 'text-purple-200',
        };
      case 'cannes':
        return {
          trophyColor: 'text-emerald-400',
          fill: 1,
          badgeBg: 'bg-emerald-500/15',
          labelColor: 'text-emerald-200',
        };
      default:
        return {
          trophyColor: 'text-amber-400',
          fill: 1,
          badgeBg: 'bg-amber-500/15',
          labelColor: 'text-amber-200',
        };
    }
  };

  // Construct headline summary
  const summaryParts: string[] = [];
  if (oscarWins > 0) summaryParts.push(`${oscarWins} Oscar${oscarWins > 1 ? 's' : ''}`);
  if (emmyWins > 0) summaryParts.push(`${emmyWins} Emmy${emmyWins > 1 ? 's' : ''}`);
  if (goldenGlobeWins > 0) summaryParts.push(`${goldenGlobeWins} Golden Globe${goldenGlobeWins > 1 ? 's' : ''}`);
  if (baftaWins > 0) summaryParts.push(`${baftaWins} BAFTA${baftaWins > 1 ? 's' : ''}`);
  if (cannesWins > 0) summaryParts.push(`${cannesWins} Palme d'Or`);

  const headlineWins = summaryParts.length > 0
    ? summaryParts.join(' • ')
    : `${totalWins} Won`;

  // Filter items
  let displayItems: AwardItem[] = [];
  if (activeTab === 'wins') {
    displayItems = wins;
  } else if (activeTab === 'noms') {
    displayItems = nominations;
  } else {
    displayItems = [...wins, ...nominations];
  }

  if (selectedType !== 'all') {
    displayItems = displayItems.filter((item) => item.type === selectedType);
  }

  const uniqueTypes = Array.from(new Set([...wins.map((w) => w.type), ...nominations.map((n) => n.type)]));
  const totalCount = wins.length + nominations.length;

  // Badge-only variant (Header / Mobile Pill)
  if (variant === 'badge-only') {
    return (
      <div className={`inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300 backdrop-blur-md ${className}`}>
        <span className="material-symbols-outlined text-[15px] text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>
          emoji_events
        </span>
        <span>{totalWins > 0 ? headlineWins : `${totalNominations} Nominations`}</span>
      </div>
    );
  }

  return (
    <div className={`w-full overflow-hidden rounded-2xl bg-zinc-900/40 p-3.5 backdrop-blur-xl transition-all duration-300 ${className}`}>
      {/* Sleek, minimal status bar without clutter or bulky headers */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {totalWins > 0 && (
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <span className="material-symbols-outlined text-[17px] text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                emoji_events
              </span>
              <span>{totalWins} {totalWins === 1 ? 'Win' : 'Wins'}</span>
            </div>
          )}

          {totalNominations > 0 && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
              <span className="material-symbols-outlined text-[17px] text-zinc-500" style={{ fontVariationSettings: "'FILL' 0" }}>
                emoji_events
              </span>
              <span>{totalNominations} {totalNominations === 1 ? 'Nomination' : 'Nominations'}</span>
            </div>
          )}
        </div>

        {/* View All Toggle */}
        {totalCount > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 rounded-full bg-white/5 hover:bg-white/10 px-2.5 py-1 text-xs font-medium text-zinc-300 hover:text-white transition-colors"
          >
            <span>{isExpanded ? 'Hide' : 'View All'}</span>
            <span className={`material-symbols-outlined text-[15px] transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
              expand_more
            </span>
          </button>
        )}
      </div>

      {/* Collapsed view: Direct clean chips */}
      {!isExpanded && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {wins.slice(0, 3).map((award, i) => {
            const theme = getAwardTheme(award.type, false);
            return (
              <div
                key={`win-${i}`}
                className={`inline-flex items-center gap-1.5 rounded-xl ${theme.badgeBg} px-2.5 py-1 text-xs font-medium ${theme.labelColor} backdrop-blur-md`}
              >
                <span className={`material-symbols-outlined text-[14px] ${theme.trophyColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  emoji_events
                </span>
                {award.year && (
                  <span className="text-[10px] font-bold opacity-80">{award.year}</span>
                )}
                <span className="font-semibold text-white/90 truncate max-w-[260px]">
                  {award.typeLabel}: {award.category}
                </span>
              </div>
            );
          })}

          {wins.length < 3 && nominations.slice(0, 3 - wins.length).map((nom, i) => {
            const theme = getAwardTheme(nom.type, true);
            return (
              <div
                key={`nom-${i}`}
                className={`inline-flex items-center gap-1.5 rounded-xl ${theme.badgeBg} px-2.5 py-1 text-xs font-medium ${theme.labelColor} backdrop-blur-md`}
              >
                <span className="material-symbols-outlined text-[14px] text-zinc-500" style={{ fontVariationSettings: "'FILL' 0" }}>
                  emoji_events
                </span>
                {nom.year && (
                  <span className="text-[10px] font-bold text-zinc-400">{nom.year}</span>
                )}
                <span className="font-normal text-zinc-300 truncate max-w-[260px]">
                  {nom.typeLabel}: {nom.category} (Nominated)
                </span>
              </div>
            );
          })}

          {totalCount > 3 && (
            <button
              onClick={() => setIsExpanded(true)}
              className="inline-flex items-center rounded-xl bg-white/5 hover:bg-white/10 px-2 py-1 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              +{totalCount - 3} more
            </button>
          )}
        </div>
      )}

      {/* Expanded view */}
      {isExpanded && (
        <div className="mt-3.5 space-y-3 pt-3 border-t border-white/5">
          {/* Minimal Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 rounded-xl bg-black/40 p-1">
              <button
                type="button"
                onClick={() => setActiveTab('wins')}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  activeTab === 'wins'
                    ? 'bg-amber-400/20 text-amber-300'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[13px] text-amber-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                  emoji_events
                </span>
                <span>Won ({wins.length})</span>
              </button>
              {nominations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab('noms')}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    activeTab === 'noms'
                      ? 'bg-white/15 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <span className="material-symbols-outlined text-[13px] text-zinc-400" style={{ fontVariationSettings: "'FILL' 0" }}>
                    emoji_events
                  </span>
                  <span>Nominated ({nominations.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  activeTab === 'all'
                    ? 'bg-white/15 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                All ({totalCount})
              </button>
            </div>

            {uniqueTypes.length > 1 && (
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedType('all')}
                  className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold transition-all ${
                    selectedType === 'all' ? 'bg-white/20 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  All
                </button>
                {uniqueTypes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedType(t)}
                    className={`capitalize rounded-lg px-2 py-0.5 text-[11px] font-semibold transition-all ${
                      selectedType === t ? 'bg-white/20 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {t.replace('_', ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* List of Awards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
            {displayItems.map((item, index) => {
              const theme = getAwardTheme(item.type, item.isNomination);
              return (
                <div
                  key={`${item.id}-${index}`}
                  className="flex items-start gap-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] p-2.5 transition-colors"
                >
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${theme.badgeBg}`}>
                    <span
                      className={`material-symbols-outlined text-[16px] ${theme.trophyColor}`}
                      style={{ fontVariationSettings: `'FILL' ${theme.fill}` }}
                    >
                      emoji_events
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.labelColor}`}>
                        {item.isNomination ? 'Nominated' : 'Winner'} • {item.typeLabel}
                      </span>
                      {item.year && (
                        <span className="text-[10px] font-bold text-zinc-400 bg-white/5 px-1.5 py-0.2 rounded">
                          {item.year}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-white mt-0.5 leading-snug">
                      {item.category}
                    </p>
                    {item.forWork && (
                      <p className="text-[11px] text-zinc-400 mt-0.5 italic truncate">
                        for &ldquo;{item.forWork}&rdquo;
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
