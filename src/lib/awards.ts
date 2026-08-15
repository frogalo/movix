export type AwardType = 'oscar' | 'emmy' | 'golden_globe' | 'bafta' | 'cannes' | 'other';

export type AwardItem = {
  id: string;
  type: AwardType;
  typeLabel: string;
  category: string;
  year: number | null;
  forWork: string | null;
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
  } else if (lower.includes('bafta')) {
    type = 'bafta';
    typeLabel = 'BAFTA';
    cleanCategory = awardName
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

export async function getAwardsForImdbId(imdbId: string | null | undefined): Promise<AwardsSummary> {
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

  if (!imdbId) return emptyResult;

  const now = Date.now();
  const cached = awardsMemoryCache.get(imdbId);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    const searchUrl = `https://www.wikidata.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(imdbId)}&format=json`;
    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Movix/1.0 (https://movix.app; contact@movix.app)',
      },
    });

    if (!res.ok) return emptyResult;

    const data = await res.json();
    const entityId = data.query?.search?.[0]?.title;
    if (!entityId) {
      awardsMemoryCache.set(imdbId, { data: emptyResult, expiresAt: now + 7 * 86400 * 1000 });
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
          const timeVal = c.qualifiers?.P585?.[0]?.datavalue?.value?.time;
          const year = timeVal ? parseInt(timeVal.substring(1, 5), 10) : null;
          const forWorkId = c.qualifiers?.P1686?.[0]?.datavalue?.value?.id;
          return { awardId, year, forWorkId, isNomination };
        })
        .filter((x: any) => Boolean(x.awardId));
    };

    const parsedWins = parseClaims(awardsClaims, false);
    const parsedNoms = parseClaims(nomClaims, true);
    const allRaw = [...parsedWins, ...parsedNoms];

    if (allRaw.length === 0) {
      awardsMemoryCache.set(imdbId, { data: emptyResult, expiresAt: now + 7 * 86400 * 1000 });
      return emptyResult;
    }

    // Batch resolve QIDs to English labels
    const idsToResolve = Array.from(
      new Set([...allRaw.map((x) => x.awardId), ...allRaw.map((x) => x.forWorkId).filter(Boolean)])
    ).slice(0, 50);

    const batchUrl = `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${idsToResolve.join('|')}&props=labels&languages=en&format=json`;
    const bRes = await fetch(batchUrl, {
      headers: {
        'User-Agent': 'Movix/1.0 (https://movix.app; contact@movix.app)',
      },
    });

    if (!bRes.ok) return emptyResult;

    const bData = await bRes.json();
    const labelMap: Record<string, string> = {};
    for (const [k, v] of Object.entries((bData.entities || {}) as Record<string, any>)) {
      labelMap[k] = v.labels?.en?.value || '';
    }

    const winsMap = new Map<string, AwardItem>();
    const nomsMap = new Map<string, AwardItem>();

    for (const item of allRaw) {
      const rawAwardName = labelMap[item.awardId];
      if (!rawAwardName) continue;

      const classified = classifyAward(rawAwardName);
      if (!classified) continue;

      const forWork = item.forWorkId ? labelMap[item.forWorkId] || null : null;
      const dedupeKey = `${classified.type}-${classified.cleanCategory}-${item.year || 'na'}-${forWork || 'na'}`;

      const awardObj: AwardItem = {
        id: item.awardId,
        type: classified.type,
        typeLabel: classified.typeLabel,
        category: classified.cleanCategory,
        year: item.year,
        forWork,
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

    awardsMemoryCache.set(imdbId, { data: result, expiresAt: now + 7 * 86400 * 1000 });
    return result;
  } catch (error) {
    console.error(`[AWARDS_FETCH_ERROR] for IMDb ID ${imdbId}:`, error);
    return emptyResult;
  }
}
