// src/lib/sota/SOTAInternalLinkEngine.ts
// SOTA Internal Link Engine v3.0 - Enterprise-Grade Contextual Linking

export interface InternalLink {
  anchor: string;
  targetUrl: string;
  context: string;
  relevanceScore: number;
  position: 'early' | 'middle' | 'late';
}

export interface SitemapUrl {
  url: string;
  title?: string;
  keywords?: string[];
}

interface LinkCandidate {
  url: string;
  title: string;
  slug: string;
  keywords: string[];
  relevanceScore: number;
}

/**
 * Extracts meaningful keywords from a URL slug or title.
 */
function extractKeywordsFromUrl(url: string): string[] {
  try {
    const pathname = new URL(url).pathname;
    const slug = pathname.replace(/^\/|\/$/g, '').split('/').pop() || '';
    return slug
      .split(/[-_]/)
      .filter(w => w.length > 2 && !['the', 'and', 'for', 'with', 'this', 'that', 'from', 'your', 'how', 'what', 'why'].includes(w.toLowerCase()))
      .map(w => w.toLowerCase());
  } catch {
    return [];
  }
}

/**
 * Calculates semantic relevance between a candidate URL and the primary keyword/topic.
 */
function calculateRelevance(
  candidate: { url: string; title: string; keywords: string[] },
  primaryKeyword: string,
  secondaryKeywords: string[],
  contentTopic: string
): number {
  let score = 0;
  const primaryLower = primaryKeyword.toLowerCase();
  const allKeywords = [primaryLower, ...secondaryKeywords.map(k => k.toLowerCase())];
  const titleLower = candidate.title.toLowerCase();
  const urlLower = candidate.url.toLowerCase();
  const topicWords = contentTopic.toLowerCase().split(/\s+/).filter(w => w.length > 3);

  // Exact primary keyword match in title or URL (high relevance)
  if (titleLower.includes(primaryLower) || urlLower.includes(primaryLower.replace(/\s+/g, '-'))) {
    score += 40;
  }

  // Secondary keyword matches
  for (const kw of secondaryKeywords) {
    const kwLower = kw.toLowerCase();
    if (titleLower.includes(kwLower) || urlLower.includes(kwLower.replace(/\s+/g, '-'))) {
      score += 20;
    }
  }

  // Topic word overlap (semantic relevance)
  for (const word of topicWords) {
    if (titleLower.includes(word) || urlLower.includes(word)) {
      score += 8;
    }
  }

  // Candidate's own keywords match topic
  for (const ck of candidate.keywords) {
    if (allKeywords.some(ak => ak.includes(ck) || ck.includes(ak))) {
      score += 15;
    }
    if (topicWords.includes(ck)) {
      score += 5;
    }
  }

  return Math.min(100, score);
}

/**
 * Generates rich, contextual anchor text from URL/title — never generic like "click here".
 */
function generateRichAnchorText(
  candidate: LinkCandidate,
  primaryKeyword: string
): string {
  const { title, slug, keywords } = candidate;

  // Best: Use the cleaned title if it's descriptive
  if (title && title.length > 10 && title.length < 80) {
    // Remove common prefixes like "How to", "Guide to", etc. if too long
    let anchor = title;
    if (anchor.length > 60) {
      // Shorten to core phrase
      const corePhrases = anchor.split(/[:\-–—|]/).map(s => s.trim()).filter(s => s.length > 5);
      anchor = corePhrases[0] || anchor.substring(0, 55).replace(/\s\w+$/, '');
    }
    return anchor;
  }

  // Fallback: Generate from slug keywords
  if (keywords.length >= 2) {
    return keywords.slice(0, 4).join(' ').replace(/^\w/, c => c.toUpperCase());
  }

  // Last fallback: Clean slug
  return slug
    .replace(/[-_]/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim();
}

/**
 * Determines optimal positions for internal links within HTML content.
 * Returns positions: 'early' (first 30%), 'middle' (30-70%), 'late' (70-100%)
 */
function assignLinkPositions(count: number): ('early' | 'middle' | 'late')[] {
  const positions: ('early' | 'middle' | 'late')[] = [];

  // Distribute links evenly across content sections
  // First link early, last link late, rest distributed
  if (count >= 1) positions.push('early');
  if (count >= 2) positions.push('middle');
  if (count >= 3) positions.push('late');
  if (count >= 4) positions.push('early');
  if (count >= 5) positions.push('middle');
  if (count >= 6) positions.push('late');
  if (count >= 7) positions.push('middle');
  if (count >= 8) positions.push('early');

  return positions.slice(0, count);
}

/**
 * Inserts internal links into HTML content at contextually appropriate locations.
 */
function insertLinksIntoContent(
  html: string,
  links: InternalLink[]
): string {
  if (!html || links.length === 0) return html;

  // Find all paragraphs
  const paragraphs = html.match(/<p[^>]*>[\s\S]*?<\/p>/gi) || [];
  if (paragraphs.length === 0) return html;

  const totalParagraphs = paragraphs.length;
  const earlyEnd = Math.floor(totalParagraphs * 0.3);
  const middleEnd = Math.floor(totalParagraphs * 0.7);

  // Track which paragraphs already have links inserted to avoid clustering
  const usedParagraphIndices = new Set<number>();
  let result = html;

  for (const link of links) {
    let targetRange: [number, number];

    switch (link.position) {
      case 'early':
        targetRange = [1, Math.max(2, earlyEnd)]; // Skip first paragraph (usually intro)
        break;
      case 'middle':
        targetRange = [earlyEnd, middleEnd];
        break;
      case 'late':
        targetRange = [middleEnd, totalParagraphs - 1]; // Skip last paragraph (usually conclusion CTA)
        break;
    }

    // Find the best paragraph to insert the link
    let bestIdx = -1;
    let bestScore = -1;

    for (let i = targetRange[0]; i <= targetRange[1] && i < totalParagraphs; i++) {
      if (usedParagraphIndices.has(i)) continue;

      const p = paragraphs[i];
      // Skip paragraphs that already have links
      if (/<a\s/i.test(p)) continue;
      // Skip very short paragraphs
      if (p.replace(/<[^>]*>/g, '').trim().length < 40) continue;

      // Prefer paragraphs containing related words
      const pText = p.replace(/<[^>]*>/g, '').toLowerCase();
      let relevance = 0;
      const anchorWords = link.anchor.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      for (const word of anchorWords) {
        if (pText.includes(word)) relevance += 10;
      }

      // Prefer longer paragraphs (more natural insertion points)
      relevance += Math.min(20, pText.length / 20);

      if (relevance > bestScore) {
        bestScore = relevance;
        bestIdx = i;
      }
    }

    // If no ideal paragraph found, use any available in range
    if (bestIdx === -1) {
      for (let i = targetRange[0]; i <= targetRange[1] && i < totalParagraphs; i++) {
        if (!usedParagraphIndices.has(i)) {
          const p = paragraphs[i];
          if (p.replace(/<[^>]*>/g, '').trim().length >= 30) {
            bestIdx = i;
            break;
          }
        }
      }
    }

    if (bestIdx === -1) continue;

    usedParagraphIndices.add(bestIdx);

    const originalParagraph = paragraphs[bestIdx];
    const linkHtml = `<a href="${link.targetUrl}" title="${link.anchor}">${link.anchor}</a>`;

    // Insert as a contextual sentence at the end of the paragraph, before </p>
    const contextSentence = ` For more details, see our guide on ${linkHtml}.`;
    const modifiedParagraph = originalParagraph.replace(
      /<\/p>/i,
      `${contextSentence}</p>`
    );

    result = result.replace(originalParagraph, modifiedParagraph);
  }

  return result;
}

/**
 * Main entry point: Selects and inserts 4-8 high-quality contextual internal links.
 */
export function generateInternalLinks(
  sitemapUrls: SitemapUrl[],
  primaryKeyword: string,
  secondaryKeywords: string[],
  contentTopic: string,
  currentUrl?: string,
  targetCount: number = 6
): InternalLink[] {
  const clampedCount = Math.max(4, Math.min(8, targetCount));

  if (!sitemapUrls || sitemapUrls.length === 0) return [];

  // Build candidates with relevance scores
  const candidates: LinkCandidate[] = sitemapUrls
    .filter(su => {
      // Exclude current page
      if (currentUrl && su.url === currentUrl) return false;
      // Exclude non-content pages
      const lowerUrl = su.url.toLowerCase();
      if (/\/(tag|category|author|page|feed|wp-admin|wp-content|cart|checkout|my-account)/i.test(lowerUrl)) return false;
      return true;
    })
    .map(su => {
      const keywords = su.keywords || extractKeywordsFromUrl(su.url);
      const title = su.title || '';
      const slug = new URL(su.url).pathname.replace(/^\/|\/$/g, '').split('/').pop() || '';

      const relevance = calculateRelevance(
        { url: su.url, title, keywords },
        primaryKeyword,
        secondaryKeywords,
        contentTopic
      );

      return { url: su.url, title, slug, keywords, relevanceScore: relevance };
    })
    .filter(c => c.relevanceScore > 10) // Minimum relevance threshold
    .sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Select top candidates — ensure diversity (no duplicate slugs/domains)
  const selected: LinkCandidate[] = [];
  const usedSlugs = new Set<string>();

  for (const candidate of candidates) {
    if (selected.length >= clampedCount) break;
    if (usedSlugs.has(candidate.slug)) continue;

    usedSlugs.add(candidate.slug);
    selected.push(candidate);
  }

  // Assign positions across the content
  const positions = assignLinkPositions(selected.length);

  // Generate final links with rich anchor text
  return selected.map((candidate, i) => ({
    anchor: generateRichAnchorText(candidate, primaryKeyword),
    targetUrl: candidate.url,
    context: `Contextual internal link to related content about ${candidate.keywords.slice(0, 3).join(', ')}`,
    relevanceScore: candidate.relevanceScore,
    position: positions[i] || 'middle',
  }));
}

/**
 * Inserts generated internal links into existing HTML content.
 */
export function applyInternalLinks(
  htmlContent: string,
  links: InternalLink[]
): string {
  return insertLinksIntoContent(htmlContent, links);
}

export default { generateInternalLinks, applyInternalLinks };
