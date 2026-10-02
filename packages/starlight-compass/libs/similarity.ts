import { getStringData } from "./page";
import type { CompassPage } from "./rule";

const WORD_RE = /[\p{L}\p{N}]{3,}/gu;
const CODE_BLOCK_RE = /```[\s\S]*?```/g;
const TITLE_WEIGHT = 3;
const HEADING_WEIGHT = 2;

const termFrequencies = new WeakMap<CompassPage, Map<string, number>>();
const inverseDocumentFrequencies = new WeakMap<
  CompassPage[],
  Map<string, number>
>();

/**
 * Finds the pages whose text is most similar to a page, using the cosine similarity of TF-IDF vectors. This is a
 * cheap shortlist for questions asked to the provider and not a decision.
 */
export function getSimilarPages(
  page: CompassPage,
  pages: CompassPage[],
  options: SimilarPagesOptions
): SimilarPage[] {
  const { maxResults, minSimilarity } = options;
  const idf = getInverseDocumentFrequencies(pages);
  const vector = getVector(page, idf);

  return pages
    .filter((other) => other !== page && other.locale === page.locale)
    .map((other) => ({
      page: other,
      similarity: getCosineSimilarity(vector, getVector(other, idf)),
    }))
    .filter(({ similarity }) => similarity >= minSimilarity)
    .sort(
      (a, b) =>
        b.similarity - a.similarity ||
        a.page.pathname.localeCompare(b.page.pathname)
    )
    .slice(0, maxResults);
}

function getInverseDocumentFrequencies(pages: CompassPage[]) {
  const cached = inverseDocumentFrequencies.get(pages);
  if (cached) return cached;

  const documentFrequencies = new Map<string, number>();
  for (const page of pages) {
    for (const term of getTermFrequencies(page).keys()) {
      documentFrequencies.set(term, (documentFrequencies.get(term) ?? 0) + 1);
    }
  }

  const idf = new Map(
    [...documentFrequencies].map(([term, frequency]) => [
      term,
      Math.log((1 + pages.length) / (1 + frequency)) + 1,
    ])
  );
  inverseDocumentFrequencies.set(pages, idf);

  return idf;
}

function getTermFrequencies(page: CompassPage) {
  const cached = termFrequencies.get(page);
  if (cached) return cached;

  const frequencies = new Map<string, number>();
  addTerms(frequencies, getStringData(page, "title"), TITLE_WEIGHT);
  addTerms(frequencies, getStringData(page, "description"), HEADING_WEIGHT);
  addTerms(frequencies, page.headings.join(" "), HEADING_WEIGHT);
  addTerms(frequencies, page.body.replace(CODE_BLOCK_RE, " "), 1);
  termFrequencies.set(page, frequencies);

  return frequencies;
}

function addTerms(
  frequencies: Map<string, number>,
  text: string | undefined,
  weight: number
) {
  for (const [word] of (text ?? "").toLowerCase().matchAll(WORD_RE)) {
    frequencies.set(word, (frequencies.get(word) ?? 0) + weight);
  }
}

function getVector(page: CompassPage, idf: Map<string, number>) {
  return new Map(
    [...getTermFrequencies(page)].map(([term, frequency]) => [
      term,
      Math.log(1 + frequency) * (idf.get(term) ?? 1),
    ])
  );
}

function getCosineSimilarity(a: Map<string, number>, b: Map<string, number>) {
  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];

  let dotProduct = 0;
  for (const [term, weight] of smaller) {
    dotProduct += weight * (larger.get(term) ?? 0);
  }

  const norm = getNorm(a) * getNorm(b);

  return norm === 0 ? 0 : dotProduct / norm;
}

function getNorm(vector: Map<string, number>) {
  let sum = 0;
  for (const weight of vector.values()) sum += weight * weight;

  return Math.sqrt(sum);
}

export interface SimilarPagesOptions {
  maxResults: number;
  minSimilarity: number;
}

export interface SimilarPage {
  page: CompassPage;
  similarity: number;
}
