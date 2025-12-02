/**
 * Fuzzy search utilities for better autocomplete matching
 */

export interface FuzzyMatchResult {
  score: number;
  matches: number[];
}

/**
 * Calculate fuzzy match score between search and target string
 * Returns higher score for better matches
 *
 * @param search - The search term (e.g., "usn")
 * @param target - The target string (e.g., "username")
 * @returns Match score (0-1) and character positions
 */
export function fuzzyMatch(search: string, target: string): FuzzyMatchResult {
  if (!search || !target) {
    return { score: 0, matches: [] };
  }

  const searchLower = search.toLowerCase();
  const targetLower = target.toLowerCase();

  // Exact match gets highest score
  if (targetLower === searchLower) {
    return {
      score: 1,
      matches: Array.from({ length: search.length }, (_, i) => i),
    };
  }

  // Contains match gets high score
  const containsIndex = targetLower.indexOf(searchLower);
  if (containsIndex !== -1) {
    const score = 0.8 - (containsIndex / target.length) * 0.2; // Earlier matches score higher
    return {
      score,
      matches: Array.from(
        { length: search.length },
        (_, i) => containsIndex + i
      ),
    };
  }

  // Fuzzy matching - check if all characters in search appear in order in target
  const matches: number[] = [];
  let searchIndex = 0;
  let targetIndex = 0;
  let lastMatchIndex = -1;
  let consecutiveMatches = 0;
  let maxConsecutiveMatches = 0;

  while (searchIndex < searchLower.length && targetIndex < targetLower.length) {
    if (searchLower[searchIndex] === targetLower[targetIndex]) {
      matches.push(targetIndex);

      // Bonus for consecutive matches
      if (targetIndex === lastMatchIndex + 1) {
        consecutiveMatches++;
        maxConsecutiveMatches = Math.max(
          maxConsecutiveMatches,
          consecutiveMatches
        );
      } else {
        consecutiveMatches = 1;
      }

      lastMatchIndex = targetIndex;
      searchIndex++;
    }
    targetIndex++;
  }

  // All characters must be found
  if (searchIndex !== searchLower.length) {
    return { score: 0, matches: [] };
  }

  // Calculate score based on:
  // 1. Percentage of target that matches
  // 2. How early the matches start
  // 3. How consecutive the matches are
  const matchPercentage = search.length / target.length;
  const startBonus = matches[0] === 0 ? 0.2 : 0; // Bonus if match starts at beginning
  const consecutiveBonus = (maxConsecutiveMatches / search.length) * 0.3;
  const compactnessScore =
    (matches[matches.length - 1] - matches[0] + 1) / target.length;

  const score = Math.min(
    0.6 * matchPercentage +
      startBonus +
      consecutiveBonus -
      0.2 * compactnessScore, // Penalty for spread-out matches
    0.79 // Cap below "contains" matches
  );

  return { score, matches };
}

/**
 * Filter and sort items by fuzzy match score
 */
export function fuzzyFilter<T>(
  items: T[],
  search: string,
  getterFn: (item: T) => string | string[]
): T[] {
  if (!search || !search.trim()) {
    return items;
  }

  const searchTrimmed = search.trim();
  const scoredItems: Array<{ item: T; score: number }> = [];

  for (const item of items) {
    const values = getterFn(item);
    const valueArray = Array.isArray(values) ? values : [values];

    // Get best score across all searchable fields
    let bestScore = 0;
    for (const value of valueArray) {
      if (!value) continue; // Skip empty strings
      const score = fuzzyMatch(searchTrimmed, value).score;
      if (score > bestScore) {
        bestScore = score;
      }
    }

    // Only include items with a match
    if (bestScore > 0) {
      scoredItems.push({ item, score: bestScore });
    }
  }

  // Sort by score (descending) and return items
  return scoredItems.sort((a, b) => b.score - a.score).map(({ item }) => item);
}

/**
 * Get match positions for highlighting
 */
export function getMatchPositions(text: string, search: string): number[] {
  return fuzzyMatch(search, text).matches;
}
