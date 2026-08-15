export type AwardType = 'oscar' | 'emmy' | 'golden_globe' | 'bafta' | 'cannes' | 'other';

export type AwardItem = {
  id: string;
  type: AwardType;
  typeLabel: string;
  category: string;
  year: number | null;
  forWork: string | null;
  recipient?: string | null;
  isNomination: boolean;
};

export type AwardsSummary = {
  hasAwards: boolean;
  totalWins: number;
  totalNominations: number;
  oscarWins: number;
  oscarNominations: number;
  emmyWins: number;
  emmyNominations: number;
  goldenGlobeWins: number;
  goldenGlobeNominations: number;
  baftaWins: number;
  baftaNominations: number;
  cannesWins: number;
  cannesNominations: number;
  wins: AwardItem[];
  nominations: AwardItem[];
};

// In-memory cache for awards by IMDb ID (7-day TTL)
const awardsMemoryCache = new Map<string, { data: AwardsSummary; expiresAt: number }>();

function classifyAward(awardName: string): { type: AwardType; typeLabel: string; cleanCategory: string } | null {
  const lower = awardName.toLowerCase();

  // Filter out false positives
  if (lower.includes('american academy of arts')) return null;

  let type: AwardType = 'other';
  let typeLabel = 'Award';
  let cleanCategory = awardName;

  if (lower.includes('academy award') || lower.includes('oscar')) {
    type = 'oscar';
    typeLabel = 'Oscar';
    cleanCategory = awardName
      .replace(/^Academy Award for /i, '')
      .replace(/^Academy Award /i, '')
      .replace(/^Oscar for /i, '')
      .replace(/^Oscar /i, '')
      .trim();
  } else if (lower.includes('emmy')) {
    type = 'emmy';
    typeLabel = 'Emmy';
    cleanCategory = awardName
      .replace(/^Primetime Emmy Award for /i, '')
      .replace(/^Daytime Emmy Award for /i, '')
      .replace(/^International Emmy Award for /i, '')
      .replace(/^Creative Arts Emmy Award for /i, '')
      .replace(/^Emmy Award for /i, '')
      .replace(/^Emmy /i, '')
      .trim();
  } else if (lower.includes('golden globe')) {
    type = 'golden_globe';
    typeLabel = 'Golden Globe';
    cleanCategory = awardName
      .replace(/^Golden Globe Award for /i, '')
      .replace(/^Golden Globe /i, '')
      .trim();
  } else if (lower.includes('bafta') || lower.includes('british academy')) {
    type = 'bafta';
    typeLabel = 'BAFTA';
    cleanCategory = awardName
      .replace(/^British Academy Television Award for /i, '')
      .replace(/^British Academy Film Award for /i, '')
      .replace(/^British Academy Television Awards for /i, '')
      .replace(/^British Academy Film Awards for /i, '')
      .replace(/^British Academy Award for /i, '')
      .replace(/^British Academy /i, '')
      .replace(/^BAFTA Television Award for /i, '')
      .replace(/^BAFTA Award for /i, '')
      .replace(/^BAFTA /i, '')
      .trim();
  } else if (lower.includes("palme d'or") || lower.includes('cannes film festival')) {
    type = 'cannes';
    typeLabel = "Palme d'Or";
    cleanCategory = awardName
      .replace(/^Cannes Film Festival Award for /i, '')
      .replace(/^Cannes Film Festival /i, '')
      .trim();
  } else {
    return null; // Ignore minor local awards to keep it premium
  }

  // Final trim and fallback
  if (!cleanCategory) {
    cleanCategory = typeLabel;
  }

  return { type, typeLabel, cleanCategory };
}

export async function getAwardsForImdbId(
  imdbId: string | null | undefined,
  wikidataId?: string | null | undefined
): Promise<AwardsSummary> {
  const emptyResult: AwardsSummary = {
    hasAwards: false,
    totalWins: 0,
    totalNominations: 0,
    oscarWins: 0,
    oscarNominations: 0,
    emmyWins: 0,
    emmyNominations: 0,
    goldenGlobeWins: 0,
    goldenGlobeNominations: 0,
    baftaWins: 0,
    baftaNominations: 0,
    cannesWins: 0,
    cannesNominations: 0,
    wins: [],
    nominations: [],
  };

  const cacheKey = wikidataId || imdbId;
  if (!cacheKey) return emptyResult;

  const now = Date.now();
  const cached = awardsMemoryCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    let entityId = wikidataId || (imdbId && /^Q\d+$/.test(imdbId) ? imdbId : null);

    if (!entityId && imdbId) {
      const searchUrl = `https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(imdbId)}&format=json`;
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Movix/1.0 (https://movix.app; contact@movix.app)',
        },
      });

      if (!res.ok) return emptyResult;

      const data = await res.json();
      entityId = data.query?.search?.[0]?.title;
    }

    if (!entityId) {
      awardsMemoryCache.set(cacheKey, { data: emptyResult, expiresAt: now + 7 * 86400 * 1000 });
      return emptyResult;
    }

    const entityUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${entityId}&props=claims&format=json`;
    const eRes = await fetch(entityUrl, {
      headers: {
        'User-Agent': 'Movix/1.0 (https://movix.app; contact@movix.app)',
      },
    });

    if (!eRes.ok) return emptyResult;

    const eData = await eRes.json();
    const claims = eData.entities?.[entityId]?.claims || {};

    const awardsClaims = claims.P166 || [];
    const nomClaims = claims.P1411 || [];

    const parseClaims = (claimList: any[], isNomination: boolean) => {
      return claimList
        .map((c: any) => {
          const awardId = c.mainsnak?.datavalue?.value?.id;

          // 1. Check all time qualifiers (P585 point in time, P580 start time, P582 end time, etc.)
          let year: number | null = null;
          const qualKeys = ['P585', 'P580', 'P582', ...Object.keys(c.qualifiers || {})];
          for (const qKey of qualKeys) {
            const timeVal = c.qualifiers?.[qKey]?.[0]?.datavalue?.value?.time;
            if (timeVal) {
              const y = parseInt(timeVal.substring(1, 5), 10);
              if (y >= 1900 && y <= 2100) {
                year = y;
                break;
              }
            }
          }

          // P1686 = for work (film title on actor page)
          const forWorkId = c.qualifiers?.P1686?.[0]?.datavalue?.value?.id || null;
          // P1346 = winner recipient, P371 = presenter/recipient on movie page
          const recipientId =
            c.qualifiers?.P1346?.[0]?.datavalue?.value?.id ||
            c.qualifiers?.P371?.[0]?.datavalue?.value?.id ||
            null;
          // P805 = subject of (ceremony edition entity)
          const ceremonyId = c.qualifiers?.P805?.[0]?.datavalue?.value?.id || null;

          return { awardId, year, forWorkId, recipientId, ceremonyId, isNomination };
        })
        .filter((x: any) => Boolean(x.awardId));
    };

    const parsedWins = parseClaims(awardsClaims, false);
    const parsedNoms = parseClaims(nomClaims, true);
    const allRaw = [...parsedWins, ...parsedNoms];

    if (allRaw.length === 0) {
      awardsMemoryCache.set(cacheKey, { data: emptyResult, expiresAt: now + 7 * 86400 * 1000 });
      return emptyResult;
    }

    // Batch resolve all QIDs to English labels in chunks of 50
    const allIds = Array.from(
      new Set([
        ...allRaw.map((x) => x.awardId),
        ...allRaw.map((x) => x.forWorkId).filter(Boolean),
        ...allRaw.map((x) => x.recipientId).filter(Boolean),
        ...allRaw.map((x) => x.ceremonyId).filter(Boolean),
      ])
    );

    const labelMap: Record<string, string> = {};
    for (let i = 0; i < allIds.length; i += 50) {
      const chunk = allIds.slice(i, i + 50);
      const batchUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${chunk.join('|')}&props=labels&languages=en&format=json`;
      const bRes = await fetch(batchUrl, {
        headers: {
          'User-Agent': 'Movix/1.0 (https://movix.app; contact@movix.app)',
        },
      });

      if (bRes.ok) {
        const bData = await bRes.json();
        for (const [k, v] of Object.entries((bData.entities || {}) as Record<string, any>)) {
          labelMap[k] = v.labels?.en?.value || '';
        }
      }
    }

    const winsMap = new Map<string, AwardItem>();
    const nomsMap = new Map<string, AwardItem>();

    for (const item of allRaw) {
      const rawAwardName = labelMap[item.awardId];
      if (!rawAwardName) continue;

      const classified = classifyAward(rawAwardName);
      if (!classified) continue;

      // If year was not in qualifiers, try extracting 4-digit year from ceremony or award name
      let resolvedYear = item.year;
      if (!resolvedYear) {
        const ceremonyLabel = item.ceremonyId ? labelMap[item.ceremonyId] || '' : '';
        const match = (ceremonyLabel + ' ' + rawAwardName).match(/\b(19\d\d|20\d\d)\b/);
        if (match) {
          resolvedYear = parseInt(match[1], 10);
        }
      }

      const forWork = item.forWorkId ? labelMap[item.forWorkId] || null : null;
      const recipient = item.recipientId ? labelMap[item.recipientId] || null : null;
      const dedupeKey = `${classified.type}-${classified.cleanCategory}-${resolvedYear || 'na'}-${forWork || recipient || 'na'}`;

      const awardObj: AwardItem = {
        id: item.awardId,
        type: classified.type,
        typeLabel: classified.typeLabel,
        category: classified.cleanCategory,
        year: resolvedYear,
        forWork,
        recipient,
        isNomination: item.isNomination,
      };

      if (item.isNomination) {
        if (!nomsMap.has(dedupeKey)) {
          nomsMap.set(dedupeKey, awardObj);
        }
      } else {
        if (!winsMap.has(dedupeKey)) {
          winsMap.set(dedupeKey, awardObj);
        }
      }
    }

    const wins = Array.from(winsMap.values()).sort((a, b) => (b.year || 0) - (a.year || 0));
    // Remove nominations for items that were already won in the same year/category
    const winKeys = new Set(wins.map((w) => `${w.type}-${w.category}-${w.year || 'na'}`));
    const nominations = Array.from(nomsMap.values())
      .filter((n) => !winKeys.has(`${n.type}-${n.category}-${n.year || 'na'}`))
      .sort((a, b) => (b.year || 0) - (a.year || 0));

    const oscarWins = wins.filter((w) => w.type === 'oscar').length;
    const oscarNominations = nominations.filter((n) => n.type === 'oscar').length;
    const emmyWins = wins.filter((w) => w.type === 'emmy').length;
    const emmyNominations = nominations.filter((n) => n.type === 'emmy').length;
    const goldenGlobeWins = wins.filter((w) => w.type === 'golden_globe').length;
    const goldenGlobeNominations = nominations.filter((n) => n.type === 'golden_globe').length;
    const baftaWins = wins.filter((w) => w.type === 'bafta').length;
    const baftaNominations = nominations.filter((n) => n.type === 'bafta').length;
    const cannesWins = wins.filter((w) => w.type === 'cannes').length;
    const cannesNominations = nominations.filter((n) => n.type === 'cannes').length;

    const result: AwardsSummary = {
      hasAwards: wins.length > 0 || nominations.length > 0,
      totalWins: wins.length,
      totalNominations: nominations.length,
      oscarWins,
      oscarNominations,
      emmyWins,
      emmyNominations,
      goldenGlobeWins,
      goldenGlobeNominations,
      baftaWins,
      baftaNominations,
      cannesWins,
      cannesNominations,
      wins,
      nominations,
    };

    awardsMemoryCache.set(cacheKey, { data: result, expiresAt: now + 7 * 86400 * 1000 });
    return result;
  } catch (error) {
    console.error(`[AWARDS_FETCH_ERROR] for IMDb/Wikidata ID ${cacheKey}:`, error);
    return emptyResult;
  }
}
