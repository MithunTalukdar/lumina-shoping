import { CartItem, Product, User } from "../types";
import { INDIAN_LOCATION_OPTIONS } from "../utils/india";

export type AssistantViewState = "idle" | "typing" | "loading" | "results" | "empty";

export interface AssistantFilters {
  category: string;
  maxPrice: number | null;
  minRating: number;
}

export interface AssistantSuggestion {
  id: string;
  label: string;
  query: string;
  kind: "history" | "product" | "category" | "intent";
  caption: string;
}

export interface AssistantResultItem {
  product: Product;
  score: number;
  matchTerms: string[];
  reason: string;
}

export interface AssistantUserSignals {
  user: User | null;
  cart: CartItem[];
  wishlist: Product[];
  history: string[];
}

export interface AssistantRecommendationBundle {
  state: AssistantViewState;
  normalizedQuery: string;
  summary: string;
  topResults: AssistantResultItem[];
  recommendedForYou: AssistantResultItem[];
  similarItems: AssistantResultItem[];
  helpfulSuggestions: string[];
  suggestions: AssistantSuggestion[];
  didUseFallback: boolean;
  inferredBudget: number | null;
  inferredCategory: string | null;
  inferredMinRating: number;
}

interface ParsedQuery {
  normalized: string;
  tokens: string[];
  maxPrice: number | null;
  minRating: number;
  inferredCategory: string | null;
  inferredType: Product["type"] | null;
  inferredGender: Product["gender"] | null;
  inferredLocation: Product["location"] | null;
  priority: "budget" | "best" | "premium" | "neutral";
  occasionCategories: string[];
}

interface IndexedProduct {
  product: Product;
  searchText: string;
  nameTokens: string[];
  categoryTokens: string[];
  descriptionTokens: string[];
  metaTokens: string[];
  popularityScore: number;
  recencyScore: number;
  normalizedPrice: number;
}

interface PreferenceProfile {
  categoryWeights: Map<string, number>;
  typeWeights: Map<string, number>;
  genderWeights: Map<string, number>;
  locationWeights: Map<string, number>;
  averagePrice: number | null;
}

interface RankedCandidate extends AssistantResultItem {
  relevanceScore: number;
  personalizationScore: number;
}

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "any",
  "for",
  "from",
  "i",
  "in",
  "is",
  "me",
  "my",
  "need",
  "of",
  "on",
  "or",
  "show",
  "something",
  "the",
  "to",
  "want",
  "with",
]);

const DEFAULT_PROMPTS = [
  "cheap shoes under 2000",
  "best dress for party",
  "top rated sneakers",
  "formal outfit for office",
  "comfortable flats with high rating",
  "premium shirts for men",
];

const CATEGORY_SYNONYMS: Record<string, string[]> = {
  Shirts: ["shirt", "shirts", "oxford", "linen shirt", "camp shirt"],
  "T-Shirts": ["tee", "tees", "t-shirt", "tshirts", "t shirt", "t-shirts"],
  Jeans: ["jean", "jeans", "denim"],
  "Formal Suits": ["suit", "suits", "formal suit", "blazer", "boardroom", "office suit"],
  Dresses: ["dress", "dresses", "gown", "party dress"],
  Tops: ["top", "tops", "blouse"],
  Skirts: ["skirt", "skirts"],
  "Ethnic Wear": ["ethnic", "ethnic wear", "kurti", "traditional"],
  Sneakers: ["sneaker", "sneakers", "trainer", "trainers", "street shoes"],
  "Formal Shoes": ["formal shoe", "formal shoes", "oxford shoes", "office shoes", "loafer", "loafers"],
  "Running Shoes": ["running", "running shoes", "runner", "sport shoes", "sports shoes"],
  Boots: ["boot", "boots"],
  Heels: ["heel", "heels", "party heels"],
  Flats: ["flat", "flats", "ballet flats"],
  Sandals: ["sandal", "sandals", "slides"],
};

const OCCASION_CATEGORY_MAP: Record<string, string[]> = {
  party: ["Dresses", "Heels", "Formal Suits", "Formal Shoes"],
  wedding: ["Dresses", "Ethnic Wear", "Formal Suits", "Heels"],
  office: ["Shirts", "Formal Suits", "Formal Shoes", "Tops"],
  casual: ["T-Shirts", "Sneakers", "Flats", "Jeans"],
  travel: ["Sneakers", "Running Shoes", "T-Shirts", "Sandals"],
};

const recommendationCache = new Map<string, AssistantRecommendationBundle>();

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9₹\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean);
}

function uniq<T>(values: T[]) {
  return Array.from(new Set(values));
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) {
    return 0;
  }

  if (left.length === 0) {
    return right.length;
  }

  if (right.length === 0) {
    return left.length;
  }

  const costs = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let i = 1; i <= left.length; i += 1) {
    let previousDiagonal = i - 1;
    costs[0] = i;

    for (let j = 1; j <= right.length; j += 1) {
      const temp = costs[j];
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;

      costs[j] = Math.min(
        costs[j] + 1,
        costs[j - 1] + 1,
        previousDiagonal + substitutionCost
      );

      previousDiagonal = temp;
    }
  }

  return costs[right.length];
}

function getTokenSimilarity(queryToken: string, candidateToken: string) {
  if (queryToken === candidateToken) {
    return 1;
  }

  if (candidateToken.startsWith(queryToken) || queryToken.startsWith(candidateToken)) {
    return 0.92;
  }

  if (candidateToken.includes(queryToken) || queryToken.includes(candidateToken)) {
    return 0.86;
  }

  if (Math.abs(queryToken.length - candidateToken.length) > 3) {
    return 0;
  }

  const distance = levenshteinDistance(queryToken, candidateToken);
  return 1 - distance / Math.max(queryToken.length, candidateToken.length);
}

function getFieldMatchScore(
  queryToken: string,
  fieldText: string,
  fieldTokens: string[],
  exactWeight: number,
  prefixWeight: number,
  fuzzyWeight: number
) {
  if (!queryToken) {
    return 0;
  }

  if (fieldText.includes(queryToken)) {
    return exactWeight;
  }

  let bestScore = 0;

  for (const candidateToken of fieldTokens) {
    const similarity = getTokenSimilarity(queryToken, candidateToken);

    if (similarity >= 0.9) {
      bestScore = Math.max(bestScore, prefixWeight);
      continue;
    }

    if (similarity >= 0.76) {
      bestScore = Math.max(bestScore, fuzzyWeight * similarity);
    }
  }

  return bestScore;
}

function parseMoneyToken(rawAmount: string, hasKSuffix: string | undefined) {
  const numericValue = Number(rawAmount.replace(/,/g, ""));

  if (!Number.isFinite(numericValue)) {
    return null;
  }

  return Math.round(hasKSuffix ? numericValue * 1000 : numericValue);
}

function extractBudget(query: string) {
  const patterns = [
    /(?:under|below|within|up to|upto|max|maximum|less than)\s*(?:rs\.?|₹|inr)?\s*(\d+(?:\.\d+)?)(k)?/i,
    /(?:rs\.?|₹|inr)\s*(\d+(?:\.\d+)?)(k)?\s*(?:or less|and below|and under)?/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (!match) {
      continue;
    }

    return parseMoneyToken(match[1], match[2]);
  }

  return null;
}

function extractMinRating(query: string) {
  const match = query.match(/(\d(?:\.\d+)?)\s*\+?\s*(?:star|rating)/i);

  if (!match) {
    return 0;
  }

  const value = Number(match[1]);
  return Number.isFinite(value) ? clamp(value, 0, 5) : 0;
}

function findCategory(tokens: string[]) {
  for (const [category, aliases] of Object.entries(CATEGORY_SYNONYMS)) {
    if (
      aliases.some((alias) => {
        const aliasTokens = tokenize(alias);

        return tokens.some(
          (token) =>
            normalizeText(alias).includes(token) ||
            aliasTokens.some((aliasToken) => getTokenSimilarity(token, aliasToken) >= 0.84)
        );
      })
    ) {
      return category;
    }
  }

  return null;
}

function findType(tokens: string[]): Product["type"] | null {
  if (tokens.some((token) => ["shoe", "shoes", "sneaker", "sneakers", "heels", "flats", "sandals", "boots"].includes(token))) {
    return "shoes";
  }

  if (tokens.some((token) => ["dress", "dresses", "shirt", "shirts", "tee", "top", "tops", "jeans", "suit", "skirt", "ethnic"].includes(token))) {
    return "clothing";
  }

  return null;
}

function findGender(tokens: string[]): Product["gender"] | null {
  if (tokens.some((token) => ["men", "man", "male", "boys"].includes(token))) {
    return "men";
  }

  if (tokens.some((token) => ["women", "woman", "female", "girls", "ladies"].includes(token))) {
    return "women";
  }

  return null;
}

function findLocation(tokens: string[]): Product["location"] | null {
  const matchedLocation = INDIAN_LOCATION_OPTIONS.find((location) => {
    const normalizedCity = location.city.toLowerCase();
    const normalizedState = location.state.toLowerCase();

    return tokens.includes(normalizedCity) || tokens.includes(normalizedState);
  });

  if (matchedLocation) {
    return matchedLocation.city;
  }

  if (tokens.includes("india")) {
    return "Kolkata";
  }

  return null;
}

function parseQuery(query: string): ParsedQuery {
  const normalized = normalizeText(query);
  const tokens = tokenize(normalized).filter((token) => !STOP_WORDS.has(token));
  const priority = tokens.some((token) => ["cheap", "budget", "affordable", "under", "below"].includes(token))
    ? "budget"
    : tokens.some((token) => ["best", "top", "popular", "trending"].includes(token))
    ? "best"
    : tokens.some((token) => ["premium", "luxury", "designer"].includes(token))
    ? "premium"
    : "neutral";

  const occasionCategories = uniq(
    tokens.flatMap((token) => OCCASION_CATEGORY_MAP[token] ?? [])
  );

  return {
    normalized,
    tokens,
    maxPrice: extractBudget(query),
    minRating: extractMinRating(query),
    inferredCategory: findCategory(tokens),
    inferredType: findType(tokens),
    inferredGender: findGender(tokens),
    inferredLocation: findLocation(tokens),
    priority,
    occasionCategories,
  };
}

export function buildAssistantIndex(products: Product[]): IndexedProduct[] {
  const highestReviewCount = Math.max(...products.map((product) => product.reviewsCount), 1);
  const highestPrice = Math.max(...products.map((product) => product.price), 1);

  return products.map((product, index) => {
    const searchText = normalizeText(
      [
        product.name,
        product.category,
        product.description,
        product.gender,
        product.type,
        product.location,
      ].join(" ")
    );

    const popularityScore = clamp(
      product.rating / 5 * 0.62 + product.reviewsCount / highestReviewCount * 0.38,
      0,
      1
    );

    // Catalog order is our best freshness proxy until products expose timestamps.
    const recencyScore = products.length > 1 ? index / (products.length - 1) : 1;

    return {
      product,
      searchText,
      nameTokens: tokenize(product.name),
      categoryTokens: tokenize(product.category),
      descriptionTokens: tokenize(product.description),
      metaTokens: tokenize(`${product.gender} ${product.type} ${product.location}`),
      popularityScore,
      recencyScore,
      normalizedPrice: clamp(product.price / highestPrice, 0, 1),
    };
  });
}

function addWeightedValue(target: Map<string, number>, key: string, weight: number) {
  target.set(key, (target.get(key) ?? 0) + weight);
}

function buildPreferenceProfile(signals: AssistantUserSignals): PreferenceProfile {
  const categoryWeights = new Map<string, number>();
  const typeWeights = new Map<string, number>();
  const genderWeights = new Map<string, number>();
  const locationWeights = new Map<string, number>();
  const pricePoints: number[] = [];

  const absorbProduct = (product: Product, weight: number) => {
    addWeightedValue(categoryWeights, product.category, weight);
    addWeightedValue(typeWeights, product.type, weight);
    addWeightedValue(genderWeights, product.gender, weight);
    addWeightedValue(locationWeights, product.location, weight);
    pricePoints.push(product.price);
  };

  signals.wishlist.forEach((product) => absorbProduct(product, 1.8));
  signals.cart.forEach((item) => absorbProduct(item, 1.4 + item.quantity * 0.35));

  signals.history.slice(0, 6).forEach((query) => {
    const parsed = parseQuery(query);

    if (parsed.inferredCategory) {
      addWeightedValue(categoryWeights, parsed.inferredCategory, 0.8);
    }

    if (parsed.inferredType) {
      addWeightedValue(typeWeights, parsed.inferredType, 0.6);
    }

    if (parsed.inferredGender) {
      addWeightedValue(genderWeights, parsed.inferredGender, 0.6);
    }

    if (parsed.inferredLocation) {
      addWeightedValue(locationWeights, parsed.inferredLocation, 0.4);
    }

    if (parsed.maxPrice) {
      pricePoints.push(parsed.maxPrice);
    }
  });

  const averagePrice =
    pricePoints.length > 0
      ? pricePoints.reduce((total, value) => total + value, 0) / pricePoints.length
      : null;

  return {
    categoryWeights,
    typeWeights,
    genderWeights,
    locationWeights,
    averagePrice,
  };
}

function getNormalizedMapWeight(target: Map<string, number>, key: string) {
  if (target.size === 0) {
    return 0;
  }

  const maxWeight = Math.max(...target.values(), 1);
  return (target.get(key) ?? 0) / maxWeight;
}

function getPersonalizationScore(
  product: Product,
  profile: PreferenceProfile,
  query: ParsedQuery
) {
  let score = 0;

  score += getNormalizedMapWeight(profile.categoryWeights, product.category) * 12;
  score += getNormalizedMapWeight(profile.typeWeights, product.type) * 8;
  score += getNormalizedMapWeight(profile.genderWeights, product.gender) * 5;
  score += getNormalizedMapWeight(profile.locationWeights, product.location) * 4;

  if (profile.averagePrice !== null) {
    const distance = Math.abs(product.price - profile.averagePrice);
    const closeness = 1 - clamp(distance / Math.max(profile.averagePrice, product.price, 1), 0, 1);
    score += closeness * 5;
  }

  if (query.inferredCategory && query.inferredCategory === product.category) {
    score += 3;
  }

  return score;
}

function buildReason(
  product: Product,
  matchTerms: string[],
  query: ParsedQuery,
  personalizationScore: number
) {
  const reasons: string[] = [];

  if (matchTerms.length > 0) {
    reasons.push(`Matched ${matchTerms.slice(0, 2).join(", ")}`);
  }

  if (query.maxPrice !== null && product.price <= query.maxPrice) {
    reasons.push("Fits your budget");
  }

  if (query.minRating > 0 && product.rating >= query.minRating) {
    reasons.push("Meets your rating target");
  }

  if (product.rating >= 4.8) {
    reasons.push("Top rated");
  }

  if (personalizationScore >= 8) {
    reasons.push("Aligned with your tastes");
  }

  if (query.priority === "best" && product.reviewsCount >= 80) {
    reasons.push("Popular with shoppers");
  }

  if (reasons.length === 0) {
    reasons.push("Strong overall fit");
  }

  return reasons.slice(0, 2).join(" • ");
}

function matchesStructuredFilters(product: Product, filters: AssistantFilters) {
  if (filters.category !== "all" && normalizeText(filters.category) !== normalizeText(product.category)) {
    return false;
  }

  if (filters.maxPrice !== null && product.price > filters.maxPrice) {
    return false;
  }

  if (product.rating < filters.minRating) {
    return false;
  }

  return true;
}

function rankProduct(
  item: IndexedProduct,
  query: ParsedQuery,
  filters: AssistantFilters,
  profile: PreferenceProfile
): RankedCandidate | null {
  if (!matchesStructuredFilters(item.product, filters)) {
    return null;
  }

  let relevanceScore = 0;
  const matchTerms = new Set<string>();

  for (const token of query.tokens.slice(0, 8)) {
    const nameScore = getFieldMatchScore(token, normalizeText(item.product.name), item.nameTokens, 30, 22, 18);
    const categoryScore = getFieldMatchScore(token, normalizeText(item.product.category), item.categoryTokens, 26, 18, 15);
    const descriptionScore = getFieldMatchScore(token, normalizeText(item.product.description), item.descriptionTokens, 14, 11, 9);
    const metaScore = getFieldMatchScore(token, normalizeText(`${item.product.gender} ${item.product.type} ${item.product.location}`), item.metaTokens, 18, 12, 10);
    const bestScore = Math.max(nameScore, categoryScore, descriptionScore, metaScore);

    if (bestScore > 0) {
      relevanceScore += bestScore;
      matchTerms.add(token);
    }
  }

  if (query.inferredCategory && query.inferredCategory === item.product.category) {
    relevanceScore += 18;
  }

  if (query.inferredType && query.inferredType === item.product.type) {
    relevanceScore += 12;
  }

  if (query.inferredGender && query.inferredGender === item.product.gender) {
    relevanceScore += 10;
  }

  if (query.inferredLocation && query.inferredLocation === item.product.location) {
    relevanceScore += 8;
  }

  if (query.occasionCategories.includes(item.product.category)) {
    relevanceScore += 12;
  }

  if (query.maxPrice !== null) {
    if (item.product.price <= query.maxPrice) {
      relevanceScore += 12;
    } else {
      const overshootRatio = (item.product.price - query.maxPrice) / Math.max(query.maxPrice, 1);
      relevanceScore -= clamp(overshootRatio * 16 + 8, 0, 24);
    }
  }

  if (query.minRating > 0) {
    if (item.product.rating >= query.minRating) {
      relevanceScore += 8;
    } else {
      relevanceScore -= clamp((query.minRating - item.product.rating) * 18, 0, 20);
    }
  }

  if (query.priority === "budget") {
    relevanceScore += (1 - item.normalizedPrice) * 10;
  }

  if (query.priority === "best") {
    relevanceScore += item.popularityScore * 12;
  }

  if (query.priority === "premium") {
    relevanceScore += item.normalizedPrice * 8 + item.popularityScore * 6;
  }

  if (query.tokens.length > 0 && matchTerms.size === 0 && !query.inferredCategory && !query.inferredType) {
    relevanceScore -= 18;
  }

  const popularityScore = item.popularityScore * 18;
  const personalizationScore = getPersonalizationScore(item.product, profile, query);
  const recencyScore = item.recencyScore * 8;
  const score = relevanceScore + popularityScore + personalizationScore + recencyScore;

  if (query.normalized && score < 8) {
    return null;
  }

  return {
    product: item.product,
    score,
    matchTerms: Array.from(matchTerms),
    reason: buildReason(item.product, Array.from(matchTerms), query, personalizationScore),
    relevanceScore,
    personalizationScore,
  };
}

function buildHelpfulSuggestions(query: ParsedQuery, results: RankedCandidate[]) {
  const suggestions: string[] = [];

  if (query.maxPrice !== null) {
    suggestions.push(`Try under ${query.maxPrice + 1000} for broader options`);
  }

  if (query.inferredCategory) {
    suggestions.push(`Top rated ${query.inferredCategory}`);
  }

  if (query.inferredType === "shoes") {
    suggestions.push("best sneakers for everyday wear");
  }

  if (query.inferredType === "clothing") {
    suggestions.push("premium outfits for new season");
  }

  if (results.length === 0) {
    suggestions.push("popular styles with 4.5+ rating");
  }

  return uniq([...suggestions, ...DEFAULT_PROMPTS]).slice(0, 4);
}

function buildSummary(
  query: ParsedQuery,
  topResults: RankedCandidate[],
  didUseFallback: boolean
) {
  if (!query.normalized) {
    return "Ask for a product, budget, or occasion and I will rank the strongest matches instantly.";
  }

  if (topResults.length === 0) {
    return `I could not find a strong direct match for "${query.normalized}". Try one of the suggested refinements or browse the closest alternatives.`;
  }

  if (didUseFallback) {
    return `No exact match for "${query.normalized}", so I surfaced close alternatives ranked by relevance first, then popularity, personalization, and recency.`;
  }

  return `Found ${topResults.length} strong matches for "${query.normalized}". Ranking favors relevance first, then popularity, personalization, and recency.`;
}

function buildSimilarItems(
  index: IndexedProduct[],
  anchor: Product | undefined,
  excludedIds: Set<string>,
  filters: AssistantFilters
) {
  if (!anchor) {
    return [];
  }

  return index
    .filter((item) => !excludedIds.has(item.product.id))
    .filter((item) => matchesStructuredFilters(item.product, filters))
    .filter(
      (item) =>
        item.product.category === anchor.category ||
        (item.product.type === anchor.type && item.product.gender === anchor.gender)
    )
    .sort((left, right) => {
      const leftPriceDistance = Math.abs(left.product.price - anchor.price);
      const rightPriceDistance = Math.abs(right.product.price - anchor.price);

      if (leftPriceDistance !== rightPriceDistance) {
        return leftPriceDistance - rightPriceDistance;
      }

      return right.popularityScore - left.popularityScore;
    })
    .slice(0, 4)
    .map((item) => ({
      product: item.product,
      score: item.popularityScore * 20 + item.recencyScore * 8,
      matchTerms: [anchor.category],
      reason: "Similar style profile",
    }));
}

function buildRecommendedForYou(
  ranked: RankedCandidate[],
  index: IndexedProduct[],
  excludedIds: Set<string>,
  filters: AssistantFilters
) {
  const personalized = ranked
    .filter((item) => !excludedIds.has(item.product.id))
    .sort((left, right) => {
      if (left.personalizationScore !== right.personalizationScore) {
        return right.personalizationScore - left.personalizationScore;
      }

      return right.score - left.score;
    })
    .slice(0, 4);

  if (personalized.length > 0) {
    return personalized.map((item) => ({
      product: item.product,
      score: item.score,
      matchTerms: item.matchTerms,
      reason: item.reason,
    }));
  }

  return index
    .filter((item) => !excludedIds.has(item.product.id))
    .filter((item) => matchesStructuredFilters(item.product, filters))
    .sort((left, right) => {
      const leftScore = left.popularityScore * 20 + left.recencyScore * 8;
      const rightScore = right.popularityScore * 20 + right.recencyScore * 8;
      return rightScore - leftScore;
    })
    .slice(0, 4)
    .map((item) => ({
      product: item.product,
      score: item.popularityScore * 20 + item.recencyScore * 8,
      matchTerms: [],
      reason: "Trending in the catalog",
    }));
}

function buildIdleResults(index: IndexedProduct[], filters: AssistantFilters) {
  return index
    .filter((item) => matchesStructuredFilters(item.product, filters))
    .slice()
    .sort((left, right) => {
      const leftScore = left.popularityScore * 20 + left.recencyScore * 8;
      const rightScore = right.popularityScore * 20 + right.recencyScore * 8;
      return rightScore - leftScore;
    })
    .slice(0, 4)
    .map((item) => ({
      product: item.product,
      score: item.popularityScore * 20 + item.recencyScore * 8,
      matchTerms: [],
      reason: "Trending now",
    }));
}

function buildCacheKey(
  query: string,
  filters: AssistantFilters,
  signals: AssistantUserSignals
) {
  return JSON.stringify({
    query: normalizeText(query),
    filters,
    history: signals.history.slice(0, 4),
    wishlist: signals.wishlist.map((item) => item.id).slice(0, 6),
    cart: signals.cart.map((item) => `${item.id}:${item.quantity}`).slice(0, 6),
    user: signals.user?.id ?? "guest",
  });
}

export function getAssistantSuggestions(
  query: string,
  index: IndexedProduct[],
  history: string[]
) {
  const normalizedQuery = normalizeText(query);
  const suggestions: AssistantSuggestion[] = [];
  const seenQueries = new Set<string>();

  const pushSuggestion = (suggestion: AssistantSuggestion) => {
    const key = normalizeText(suggestion.query);

    if (!key || seenQueries.has(key)) {
      return;
    }

    seenQueries.add(key);
    suggestions.push(suggestion);
  };

  if (!normalizedQuery) {
    history.slice(0, 4).forEach((item, indexValue) => {
      pushSuggestion({
        id: `history-${indexValue}`,
        label: item,
        query: item,
        kind: "history",
        caption: "Recent search",
      });
    });

    DEFAULT_PROMPTS.slice(0, 4).forEach((item, indexValue) => {
      pushSuggestion({
        id: `prompt-${indexValue}`,
        label: item,
        query: item,
        kind: "intent",
        caption: "Smart prompt",
      });
    });

    return suggestions.slice(0, 8);
  }

  history
    .filter((item) => normalizeText(item).includes(normalizedQuery))
    .slice(0, 3)
    .forEach((item, indexValue) => {
      pushSuggestion({
        id: `history-match-${indexValue}`,
        label: item,
        query: item,
        kind: "history",
        caption: "Recent search",
      });
    });

  Object.keys(CATEGORY_SYNONYMS)
    .filter((category) => normalizeText(category).includes(normalizedQuery))
    .slice(0, 3)
    .forEach((category, indexValue) => {
      pushSuggestion({
        id: `category-${indexValue}`,
        label: category,
        query: category,
        kind: "category",
        caption: "Category",
      });
    });

  index
    .slice()
    .sort((left, right) => {
      const leftScore = getFieldMatchScore(normalizedQuery, normalizeText(left.product.name), left.nameTokens, 30, 22, 16);
      const rightScore = getFieldMatchScore(normalizedQuery, normalizeText(right.product.name), right.nameTokens, 30, 22, 16);
      return rightScore - leftScore;
    })
    .filter((item) => normalizeText(item.product.name).includes(normalizedQuery) || item.nameTokens.some((token) => getTokenSimilarity(normalizedQuery, token) >= 0.78))
    .slice(0, 4)
    .forEach((item, indexValue) => {
      pushSuggestion({
        id: `product-${indexValue}`,
        label: item.product.name,
        query: item.product.name,
        kind: "product",
        caption: item.product.category,
      });
    });

  DEFAULT_PROMPTS
    .filter((item) => normalizeText(item).includes(normalizedQuery) || tokenize(item).some((token) => getTokenSimilarity(normalizedQuery, token) >= 0.78))
    .slice(0, 3)
    .forEach((item, indexValue) => {
      pushSuggestion({
        id: `intent-${indexValue}`,
        label: item,
        query: item,
        kind: "intent",
        caption: "Suggested prompt",
      });
    });

  return suggestions.slice(0, 8);
}

export function getAssistantRecommendations(
  query: string,
  index: IndexedProduct[],
  filters: AssistantFilters,
  signals: AssistantUserSignals
): AssistantRecommendationBundle {
  const cacheKey = buildCacheKey(query, filters, signals);
  const cached = recommendationCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const parsedQuery = parseQuery(query);
  const preferenceProfile = buildPreferenceProfile(signals);
  const suggestions = getAssistantSuggestions(query, index, signals.history);

  if (!parsedQuery.normalized) {
    const idleRanked = index
      .map((item) => rankProduct(item, parsedQuery, filters, preferenceProfile))
      .filter((item): item is RankedCandidate => item !== null)
      .sort((left, right) => right.score - left.score);
    const topResults = buildIdleResults(index, filters);
    const excludedIds = new Set(topResults.map((item) => item.product.id));
    const recommendedForYou = buildRecommendedForYou(idleRanked, index, excludedIds, filters);
    const similarItems = buildSimilarItems(
      index,
      topResults[0]?.product,
      new Set([...excludedIds, ...recommendedForYou.map((item) => item.product.id)]),
      filters
    );

    const idleBundle: AssistantRecommendationBundle = {
      state: "idle",
      normalizedQuery: "",
      summary: buildSummary(parsedQuery, [], false),
      topResults,
      recommendedForYou,
      similarItems,
      helpfulSuggestions: DEFAULT_PROMPTS.slice(0, 4),
      suggestions,
      didUseFallback: false,
      inferredBudget: null,
      inferredCategory: null,
      inferredMinRating: 0,
    };

    recommendationCache.set(cacheKey, idleBundle);
    return idleBundle;
  }

  const ranked = index
    .map((item) => rankProduct(item, parsedQuery, filters, preferenceProfile))
    .filter((item): item is RankedCandidate => item !== null)
    .sort((left, right) => right.score - left.score);

  const exactMatches = ranked.filter(
    (item) =>
      item.relevanceScore >= 24 ||
      item.matchTerms.length >= 2 ||
      (parsedQuery.inferredCategory !== null && item.product.category === parsedQuery.inferredCategory)
  );

  const topRanked = (exactMatches.length > 0 ? exactMatches : ranked).slice(0, 4);
  const didUseFallback = exactMatches.length === 0 && topRanked.length > 0;
  const excludedIds = new Set(topRanked.map((item) => item.product.id));
  const recommendedForYou = buildRecommendedForYou(ranked, index, excludedIds, filters);
  const similarItems = buildSimilarItems(
    index,
    topRanked[0]?.product,
    new Set([...excludedIds, ...recommendedForYou.map((item) => item.product.id)]),
    filters
  );

  const bundle: AssistantRecommendationBundle = {
    state: topRanked.length > 0 ? "results" : "empty",
    normalizedQuery: parsedQuery.normalized,
    summary: buildSummary(parsedQuery, topRanked, didUseFallback),
    topResults: topRanked.map((item) => ({
      product: item.product,
      score: item.score,
      matchTerms: item.matchTerms,
      reason: item.reason,
    })),
    recommendedForYou,
    similarItems,
    helpfulSuggestions: buildHelpfulSuggestions(parsedQuery, ranked),
    suggestions,
    didUseFallback,
    inferredBudget: parsedQuery.maxPrice,
    inferredCategory: parsedQuery.inferredCategory,
    inferredMinRating: parsedQuery.minRating,
  };

  recommendationCache.set(cacheKey, bundle);

  if (recommendationCache.size > 40) {
    const oldestKey = recommendationCache.keys().next().value;

    if (oldestKey) {
      recommendationCache.delete(oldestKey);
    }
  }

  return bundle;
}
