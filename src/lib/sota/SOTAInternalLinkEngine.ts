/**
 * SOTA Internal Link Engine v2.0.0
 * =================================
 * Enterprise-grade internal linking system.
 *
 * Features:
 * - TF-IDF-based semantic relevance scoring between paragraphs and target pages
 * - Contextual, natural-sounding anchor text extraction
 * - Link density caps (max 1 per N words, configurable)
 * - Link diversity enforcement (no repeated targets)
 * - Paragraph-level context awareness
 * - Configurable exclusion patterns
 *
 * Usage:
 *   import { SOTAInternalLinkEngine } from '@/lib/sota/SOTAInternalLinkEngine';
 *   const engine = new SOTAInternalLinkEngine();
 *   const result = engine.process(htmlContent, siteUrls, config);
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SiteUrl {
  url: string;
  title?: string;
  slug?: string;
  description?: string;
  keywords?: string[];
  content?: string; // raw text content of the page, if available
}

export interface InternalLink {
  anchor: string;
  targetUrl: string;
  context: string; // the paragraph where the link will be placed
  relevanceScore: number; // 0–100
  paragraphIndex: number;
}

export interface InternalLinkConfig {
  /** Maximum total internal links in the article. Default: 12 */
  maxLinksPerArticle: number;
  /** Maximum links within a single paragraph. Default: 1 */
  maxLinksPerParagraph: number;
  /** Minimum number of words between any two links. Default: 200 */
  minWordsBetweenLinks: number;
  /** Minimum relevance score (0-100) for a link to be included. Default: 30 */
  minRelevanceScore: number;
  /** Prevent linking to the same target URL more than once. Default: true */
  avoidDuplicateTargets: boolean;
  /** URL patterns (regex strings) to exclude from linking. */
  excludePatterns: string[];
  /** The URL of the current article (to avoid self-linking). */
  currentArticleUrl?: string;
  /** Primary keyword of the article – avoids using it as anchor (over-optimization). */
  primaryKeyword?: string;
}

export interface LinkProcessResult {
  /** HTML content with links injected */
  html: string;
  /** Array of internal links that were injected */
  links: InternalLink[];
  /** Number of candidate links evaluated */
  candidatesEvaluated: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: InternalLinkConfig = {
  maxLinksPerArticle: 12,
  maxLinksPerParagraph: 1,
  minWordsBetweenLinks: 200,
  minRelevanceScore: 30,
  avoidDuplicateTargets: true,
  excludePatterns: [],
  currentArticleUrl: undefined,
  primaryKeyword: undefined,
};

// Common English stop words to ignore in relevance scoring
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "as", "is", "was", "are", "were", "been", "be", "have",
  "has", "had", "do", "does", "did", "will", "would", "could", "should", "may",
  "might", "shall", "can", "need", "dare", "ought", "used", "this", "that",
  "these", "those", "i", "me", "my", "myself", "we", "our", "ours", "you",
  "your", "yours", "he", "him", "his", "she", "her", "hers", "it", "its",
  "they", "them", "their", "theirs", "what", "which", "who", "whom", "how",
  "when", "where", "why", "not", "no", "nor", "so", "if", "then", "than",
  "too", "very", "just", "about", "above", "after", "again", "all", "also",
  "any", "because", "before", "below", "between", "both", "each", "few",
  "more", "most", "other", "over", "same", "some", "such", "through",
  "under", "until", "up", "while", "into", "out", "only", "own", "here",
  "there", "once", "during", "now", "even", "new", "way", "many", "much",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, " ")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

function countWords(text: string): number {
  return text.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
}

/**
 * Calculate TF-IDF-like relevance between a paragraph and a target page.
 * Returns a score between 0 and 100.
 */
function calculateRelevance(
  paragraphTokens: string[],
  targetTokens: string[],
  corpusDocCount: number,
  documentFrequency: Map<string, number>,
): number {
  if (paragraphTokens.length === 0 || targetTokens.length === 0) return 0;

  const targetSet = new Set(targetTokens);
  let score = 0;
  let matchedTerms = 0;

  for (const token of paragraphTokens) {
    if (targetSet.has(token)) {
      matchedTerms++;
      // IDF-like weighting: rarer terms score higher
      const df = documentFrequency.get(token) || 1;
      const idf = Math.log(corpusDocCount / df) + 1;
      score += idf;
    }
  }

  if (matchedTerms === 0) return 0;

  // Normalize: divide by paragraph length to avoid bias toward long paragraphs
  const normalizedScore = (score / Math.sqrt(paragraphTokens.length)) * 10;

  // Bonus for high match ratio
  const matchRatio = matchedTerms / Math.min(paragraphTokens.length, targetTokens.length);
  const bonus = matchRatio * 20;

  return Math.min(100, Math.round(normalizedScore + bonus));
}

/**
 * Extract the best anchor text phrase from a paragraph for a given target page.
 * Looks for 2-6 word phrases that overlap with the target's keywords.
 */
function extractAnchorText(
  paragraphHtml: string,
  targetTokens: Set<string>,
  targetTitle: string,
  primaryKeyword?: string,
): string | null {
  const text = paragraphHtml.replace(/<[^>]*>/g, "").trim();
  const words = text.split(/\s+/);

  if (words.length < 4) return null;

  let bestPhrase = "";
  let bestScore = 0;

  // Sliding window: 2 to 6 word phrases
  for (let len = 2; len <= Math.min(6, words.length); len++) {
    for (let i = 0; i <= words.length - len; i++) {
      const phrase = words.slice(i, i + len).join(" ");
      const cleanPhrase = phrase.toLowerCase().replace(/[^a-z0-9\s'-]/g, "");
      const phraseTokens = cleanPhrase.split(/\s+/).filter((w) => w.length > 2);

      // Skip if it exactly matches the primary keyword (over-optimization)
      if (primaryKeyword && cleanPhrase === primaryKeyword.toLowerCase()) continue;

      // Skip phrases that start or end with stop words
      if (STOP_WORDS.has(phraseTokens[0]) || STOP_WORDS.has(phraseTokens[phraseTokens.length - 1])) continue;

      // Score: how many tokens overlap with the target
      let overlap = 0;
      for (const t of phraseTokens) {
        if (targetTokens.has(t)) overlap++;
      }

      if (overlap === 0) continue;

      const overlapRatio = overlap / phraseTokens.length;
      const lengthBonus = len >= 3 && len <= 5 ? 5 : 0; // prefer 3-5 word anchors
      const score = overlapRatio * 50 + overlap * 10 + lengthBonus;

      if (score > bestScore) {
        bestScore = score;
        bestPhrase = phrase;
      }
    }
  }

  // Fallback: use a shortened version of the target title
  if (!bestPhrase && targetTitle) {
    const titleWords = targetTitle.split(/\s+/).slice(0, 5);
    if (titleWords.length >= 2) {
      // Check if any title words appear in the paragraph
      const textLower = text.toLowerCase();
      for (let len = Math.min(5, titleWords.length); len >= 2; len--) {
        const snippet = titleWords.slice(0, len).join(" ").toLowerCase();
        if (textLower.includes(snippet)) {
          return titleWords.slice(0, len).join(" ");
        }
      }
    }
  }

  return bestPhrase || null;
}

/**
 * Parse all <p> blocks from HTML, preserving their order and position.
 */
interface ParagraphBlock {
  html: string;
  text: string;
  tokens: string[];
  wordCount: number;
  index: number;
  /** Cumulative word count from start of article to end of this paragraph */
  cumulativeWordCount: number;
}

function extractParagraphs(html: string): ParagraphBlock[] {
  const paragraphs: ParagraphBlock[] = [];
  const regex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let match: RegExpExecArray | null;
  let cumulative = 0;
  let index = 0;

  while ((match = regex.exec(html)) !== null) {
    const pHtml = match[0];
    const text = pHtml.replace(/<[^>]*>/g, "").trim();
    const wc = text.split(/\s+/).filter(Boolean).length;
    cumulative += wc;

    // Skip paragraphs that already contain a link
    const hasExistingLink = /<a\s/i.test(pHtml);

    if (!hasExistingLink && wc >= 10) {
      paragraphs.push({
        html: pHtml,
        text,
        tokens: tokenize(text),
        wordCount: wc,
        index,
        cumulativeWordCount: cumulative,
      });
    }
    index++;
  }

  return paragraphs;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class SOTAInternalLinkEngine {
  /**
   * Generate and inject internal links into the HTML content.
   */
  process(
    html: string,
    siteUrls: SiteUrl[],
    config?: Partial<InternalLinkConfig>,
  ): LinkProcessResult {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    // Filter out the current article URL and excluded patterns
    const excludeRegexes = cfg.excludePatterns.map((p) => new RegExp(p, "i"));
    const validTargets = siteUrls.filter((su) => {
      if (cfg.currentArticleUrl && su.url === cfg.currentArticleUrl) return false;
      if (excludeRegexes.some((rx) => rx.test(su.url))) return false;
      return true;
    });

    if (validTargets.length === 0) {
      return { html, links: [], candidatesEvaluated: 0 };
    }

    // Build document frequency map for IDF calculation
    const allTargetTokens: string[][] = validTargets.map((t) => {
      const combined = [
        t.title || "",
        t.description || "",
        t.slug?.replace(/[-_]/g, " ") || "",
        ...(t.keywords || []),
        t.content?.substring(0, 500) || "",
      ].join(" ");
      return tokenize(combined);
    });

    const documentFrequency = new Map<string, number>();
    for (const tokens of allTargetTokens) {
      const unique = new Set(tokens);
      for (const token of unique) {
        documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
      }
    }

    const corpusSize = validTargets.length;
    const paragraphs = extractParagraphs(html);

    // Score every (paragraph, target) pair
    interface LinkCandidate {
      paragraph: ParagraphBlock;
      target: SiteUrl;
      targetTokens: string[];
      relevanceScore: number;
      anchor: string;
    }

    const candidates: LinkCandidate[] = [];

    for (const para of paragraphs) {
      for (let ti = 0; ti < validTargets.length; ti++) {
        const target = validTargets[ti];
        const tTokens = allTargetTokens[ti];
        const relevance = calculateRelevance(para.tokens, tTokens, corpusSize, documentFrequency);

        if (relevance < cfg.minRelevanceScore) continue;

        const anchor = extractAnchorText(
          para.html,
          new Set(tTokens),
          target.title || "",
          cfg.primaryKeyword,
        );

        if (!anchor) continue;

        candidates.push({
          paragraph: para,
          target,
          targetTokens: tTokens,
          relevanceScore: relevance,
          anchor,
        });
      }
    }

    // Sort by relevance (descending)
    candidates.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Select links greedily, respecting constraints
    const selectedLinks: InternalLink[] = [];
    const usedTargetUrls = new Set<string>();
    const usedParagraphIndices = new Map<number, number>(); // paragraphIndex → link count
    let lastLinkedCumulativeWordCount = 0;

    for (const candidate of candidates) {
      if (selectedLinks.length >= cfg.maxLinksPerArticle) break;

      // Check duplicate target constraint
      if (cfg.avoidDuplicateTargets && usedTargetUrls.has(candidate.target.url)) continue;

      // Check per-paragraph limit
      const paraLinkCount = usedParagraphIndices.get(candidate.paragraph.index) || 0;
      if (paraLinkCount >= cfg.maxLinksPerParagraph) continue;

      // Check minimum word distance between links
      if (
        lastLinkedCumulativeWordCount > 0 &&
        candidate.paragraph.cumulativeWordCount - lastLinkedCumulativeWordCount < cfg.minWordsBetweenLinks
      ) {
        continue;
      }

      // Accept this link
      selectedLinks.push({
        anchor: candidate.anchor,
        targetUrl: candidate.target.url,
        context: candidate.paragraph.text.substring(0, 150),
        relevanceScore: candidate.relevanceScore,
        paragraphIndex: candidate.paragraph.index,
      });

      usedTargetUrls.add(candidate.target.url);
      usedParagraphIndices.set(candidate.paragraph.index, paraLinkCount + 1);
      lastLinkedCumulativeWordCount = candidate.paragraph.cumulativeWordCount;
    }

    // Inject links into HTML
    const processedHtml = this.injectLinks(html, selectedLinks);

    return {
      html: processedHtml,
      links: selectedLinks,
      candidatesEvaluated: candidates.length,
    };
  }

  /**
   * Inject the selected links into the HTML content.
   * Replaces the first occurrence of the anchor text within the target paragraph.
   */
  injectLinks(html: string, links: InternalLink[]): string {
    if (links.length === 0) return html;

    // Group links by paragraph index and sort paragraphs descending
    // (process from bottom to top to preserve indices)
    const sortedLinks = [...links].sort((a, b) => b.paragraphIndex - a.paragraphIndex);

    let result = html;
    const paragraphRegex = /<p[^>]*>[\s\S]*?<\/p>/gi;
    const paragraphMatches: { match: string; start: number; end: number; index: number }[] = [];

    let pMatch: RegExpExecArray | null;
    let pIndex = 0;
    while ((pMatch = paragraphRegex.exec(html)) !== null) {
      paragraphMatches.push({
        match: pMatch[0],
        start: pMatch.index,
        end: pMatch.index + pMatch[0].length,
        index: pIndex++,
      });
    }

    // For each link, find its paragraph and inject
    for (const link of sortedLinks) {
      const para = paragraphMatches.find((p) => p.index === link.paragraphIndex);
      if (!para) continue;

      const currentParaHtml = result.substring(para.start, para.end);

      // Find the anchor text in the paragraph (case-insensitive, first occurrence only)
      const escapedAnchor = link.anchor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const anchorRegex = new RegExp(`(?<!<[^>]*)\\b(${escapedAnchor})\\b`, "i");
      const anchorMatch = anchorRegex.exec(currentParaHtml);

      if (anchorMatch) {
        const linkedHtml =
          currentParaHtml.substring(0, anchorMatch.index) +
          `<a href="${link.targetUrl}" title="${link.anchor}">${anchorMatch[1]}</a>` +
          currentParaHtml.substring(anchorMatch.index + anchorMatch[0].length);

        result = result.substring(0, para.start) + linkedHtml + result.substring(para.end);

        // Recalculate positions for subsequent links (since we modified the string)
        const lengthDiff = linkedHtml.length - currentParaHtml.length;
        for (const p of paragraphMatches) {
          if (p.start > para.start) {
            p.start += lengthDiff;
            p.end += lengthDiff;
          } else if (p === para) {
            p.end += lengthDiff;
          }
        }
      }
    }

    return result;
  }

  /**
   * Static convenience method: generate links without injecting them.
   */
  static analyzeLinks(
    html: string,
    siteUrls: SiteUrl[],
    config?: Partial<InternalLinkConfig>,
  ): InternalLink[] {
    const engine = new SOTAInternalLinkEngine();
    return engine.process(html, siteUrls, config).links;
  }
}

export default SOTAInternalLinkEngine;
