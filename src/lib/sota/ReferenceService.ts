// REFERENCE SERVICE - Citation Management & Validation

import type { Reference } from './types';

const AUTHORITY_DOMAINS: Record<string, number> = {
  // Government & Education
  '.gov': 95,
  '.edu': 90,

  // Major Publications
  'nytimes.com': 88,
  'wsj.com': 87,
  'reuters.com': 89,
  'bbc.com': 86,
  'theguardian.com': 85,
  'forbes.com': 82,
  'hbr.org': 88,

  // Tech & Industry
  'techcrunch.com': 80,
  'wired.com': 78,
  'arstechnica.com': 79,
  'theverge.com': 77,

  // Academic & Research
  'nature.com': 95,
  'sciencedirect.com': 92,
  'pubmed.ncbi.nlm.nih.gov': 94,
  'scholar.google.com': 90,
  'arxiv.org': 88,

  // Industry Standards
  'w3.org': 95,
  'ietf.org': 94,
  'iso.org': 95,

  // Statistics
  'statista.com': 85,
  'pewresearch.org': 88,
  'gallup.com': 86
};

export class ReferenceService {
  private serperApiKey: string;

  constructor(serperApiKey: string) {
    this.serperApiKey = serperApiKey;
  }

  async searchReferences(
    query: string,
    type: 'all' | 'academic' | 'news' | 'industry' = 'all',
    maxResults: number = 10
  ): Promise<Reference[]> {
    if (!this.serperApiKey) {
      console.warn('No Serper API key provided for reference search');
      return [];
    }

    // Build search query based on type
    let searchQuery = query;
    if (type === 'academic') {
      searchQuery = `${query} site:edu OR site:gov OR site:pubmed.ncbi.nlm.nih.gov OR site:scholar.google.com`;
    } else if (type === 'news') {
      searchQuery = `${query} site:reuters.com OR site:bbc.com OR site:nytimes.com`;
    } else if (type === 'industry') {
      searchQuery = `${query} research study statistics data`;
    }

    try {
      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.serperApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          q: searchQuery,
          num: maxResults * 2 // Request more to filter
        })
      });

      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status}`);
      }

      const data = await response.json();
      const results = data.organic || [];

      return results
        .map((result: Record<string, unknown>) => this.parseReference(result))
        .filter((ref: Reference) => ref.authorityScore >= 60)
        .slice(0, maxResults);
    } catch (error) {
      console.error('Error searching references:', error);
      return [];
    }
  }

  private parseReference(result: Record<string, unknown>): Reference {
    const url = result.link as string || '';
    const domain = this.extractDomain(url);

    return {
      title: result.title as string || '',
      url,
      type: this.classifyReferenceType(url),
      domain,
      publishedDate: result.date as string || undefined,
      authorityScore: this.calculateAuthorityScore(url)
    };
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  private classifyReferenceType(url: string): Reference['type'] {
    let hostname: string;
    try {
      hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return 'blog';
    }

    const academicDomains = ['scholar.google.com', 'pubmed.ncbi.nlm.nih.gov', 'arxiv.org', 'sciencedirect.com', 'nature.com'];
    const newsDomains = ['reuters.com', 'bbc.com', 'nytimes.com', 'wsj.com', 'theguardian.com'];
    const industryDomains = ['techcrunch.com', 'wired.com', 'forbes.com', 'hbr.org', 'arstechnica.com', 'theverge.com'];

    if (hostname.endsWith('.edu') || academicDomains.some(d => hostname === d || hostname.endsWith('.' + d))) return 'academic';
    if (hostname.endsWith('.gov')) return 'government';
    if (newsDomains.some(d => hostname === d || hostname.endsWith('.' + d))) return 'news';
    if (industryDomains.some(d => hostname === d || hostname.endsWith('.' + d))) return 'industry';

    return 'blog';
  }

  calculateAuthorityScore(url: string): number {
    let hostname: string;
    try {
      hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return 50;
    }

    for (const [domain, score] of Object.entries(AUTHORITY_DOMAINS)) {
      if (domain.startsWith('.')) {
        if (hostname.endsWith(domain) || hostname.endsWith(domain.slice(1))) {
          return score;
        }
      } else {
        if (hostname === domain || hostname.endsWith('.' + domain)) {
          return score;
        }
      }
    }

    if (hostname.endsWith('.gov') || hostname.split('.').some(p => p === 'gov')) return 90;
    if (hostname.endsWith('.edu') || hostname.split('.').some(p => p === 'edu')) return 85;
    if (hostname.endsWith('.org')) return 70;

    return 50;
  }

  async validateReference(url: string): Promise<{ valid: boolean; status?: number }> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      return { valid: response.ok, status: response.status };
    } catch {
      // Assume valid if we can't check (CORS, timeout, etc.)
      return { valid: true };
    }
  }

  formatReferencesSection(references: Reference[]): string {
    if (references.length === 0) return '';

    const sortedRefs = [...references].sort((a, b) => b.authorityScore - a.authorityScore);

    const typeLabel = (ref: Reference): string => {
      if (ref.type === 'academic') return ' [Academic]';
      if (ref.type === 'government') return ' [Official]';
      return '';
    };

    const listItems = sortedRefs.map((ref) => {
      const safeTitle = ref.title.replace(/"/g, '&quot;');
      const label = typeLabel(ref);
      return `<li><a href="${ref.url}" rel="noopener noreferrer">${safeTitle}</a> &mdash; <em>${ref.domain}</em>${label}</li>`;
    }).join('\n    ');

    return `\n<hr>\n<h2>References &amp; Sources</h2>\n<ol>\n    ${listItems}\n</ol>\n`;
  }

  formatInlineCitation(reference: Reference, index: number): string {
    return `<sup><a href="${reference.url}" rel="noopener noreferrer">[${index + 1}]</a></sup>`;
  }

  async getTopReferences(keyword: string, count: number = 12): Promise<Reference[]> {
    // SOTA Reference Fetching - Multi-Source Strategy for 8-12 High-Quality References
    // Search across ALL types in parallel for comprehensive coverage
    const [academic, industry, news, general] = await Promise.all([
      this.searchReferences(keyword, 'academic', 8),  // Target gov, edu, research sites
      this.searchReferences(keyword, 'industry', 6),  // Forbes, HBR, TechCrunch
      this.searchReferences(keyword, 'news', 5),      // Reuters, BBC, NYT
      this.searchReferences(keyword, 'all', 8)        // General high-authority sources
    ]);

    // Combine all results
    const all = [...academic, ...industry, ...news, ...general];

    // Deduplicate by URL (normalized)
    const seenUrls = new Set<string>();
    const unique = all.filter(ref => {
      const normalizedUrl = ref.url.toLowerCase().replace(/\/$/, '').replace('www.', '');
      if (seenUrls.has(normalizedUrl)) return false;
      seenUrls.add(normalizedUrl);
      return true;
    });

    // Filter out low-quality sources
    const filtered = unique.filter(ref => {
      const domain = ref.domain.toLowerCase();
      const lowQuality = ['pinterest', 'quora', 'reddit', 'facebook', 'twitter', 'x.com',
        'linkedin', 'instagram', 'youtube', 'tiktok', 'medium'];
      return !lowQuality.some(d => domain.includes(d));
    });

    // Sort by authority score (highest first)
    const sorted = filtered.sort((a, b) => b.authorityScore - a.authorityScore);

    // Return 8-12 references, ensuring we get enough coverage
    const targetCount = Math.max(8, Math.min(count, 12));
    const result = sorted.slice(0, targetCount);

    console.log(`[ReferenceService] Found ${result.length} high-quality references for "${keyword}"`);
    return result;
  }
}

export function createReferenceService(serperApiKey: string): ReferenceService {
  return new ReferenceService(serperApiKey);
}
