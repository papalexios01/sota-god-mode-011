// src/lib/sota/NeuronWriterService.ts
// SOTA NeuronWriter Service v4.0 — Backward-Compatible Class + Factory Export
// Exports: NeuronWriterService (class), createNeuronWriterService (factory), NeuronWriterAnalysis (type)

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface NeuronWriterTerm {
  term: string;
  weight: number;
  frequency: number;
  type: 'required' | 'recommended' | 'optional';
  usage_pc?: number;
}

export interface NeuronWriterEntity {
  entity: string;
  usage_pc?: number;
  type?: string;
}

export interface NeuronWriterHeading {
  text: string;
  usage_pc?: number;
  count?: number;
}

export interface NeuronWriterAnalysis {
  terms: NeuronWriterTerm[];
  termsExtended?: NeuronWriterTerm[];
  entities?: NeuronWriterEntity[];
  headingsH1?: NeuronWriterHeading[];
  headingsH2?: NeuronWriterHeading[];
  headingsH3?: NeuronWriterHeading[];
  content_score?: number;
  recommended_length?: number;
  language?: string;
  keyword?: string;

  // Structured sections (used by ContentViewerPanel NeuronWriter tab)
  basicKeywords?: NeuronWriterTermData[];
  extendedKeywords?: NeuronWriterTermData[];
  h1Suggestions?: NeuronWriterHeadingData[];
  h2Suggestions?: NeuronWriterHeadingData[];
  h3Suggestions?: NeuronWriterHeadingData[];
  competitorData?: {
    url: string;
    title: string;
    wordCount: number;
    score: number;
  }[];
  recommendations?: {
    targetWordCount: number;
    targetScore: number;
    minH2Count: number;
    minH3Count: number;
    contentGaps: string[];
  };
  allTerms?: string[];
}

/** Structured term data for ContentViewerPanel display */
export interface NeuronWriterTermData {
  term: string;
  type: 'basic' | 'extended' | 'entity';
  weight: number;
  recommended: number;
  found: number;
  status: 'missing' | 'underused' | 'optimal' | 'overused';
}

/** Structured heading data for ContentViewerPanel display */
export interface NeuronWriterHeadingData {
  text: string;
  level: 'h1' | 'h2' | 'h3';
  source?: string;
  relevanceScore?: number;
}

interface NWApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  status?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEURONWRITER API PROXY
// ═══════════════════════════════════════════════════════════════════════════════

const PROXY_ENDPOINTS = [
  '/api/neuronwriter-proxy',
  '/api/neuronwriter',
];

async function callNeuronWriterProxy(
  apiKey: string,
  endpoint: string,
  body?: Record<string, unknown>
): Promise<NWApiResponse> {
  let lastError = '';

  for (const proxy of PROXY_ENDPOINTS) {
    try {
      const res = await fetch(proxy, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-NeuronWriter-Key': apiKey,
        },
        body: JSON.stringify({ endpoint, apiKey, body: body || {} }),
      });

      const data = await res.json();

      if (data && typeof data === 'object') {
        if (data.success !== undefined) return data as NWApiResponse;
        return { success: res.ok, data, status: res.status };
      }

      return { success: false, error: 'Invalid response format', status: res.status };
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      continue;
    }
  }

  return { success: false, error: `All proxy endpoints failed: ${lastError}` };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEURONWRITER SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class NeuronWriterService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // ─── Query Management ──────────────────────────────────────────────

  async findQueryByKeyword(
    projectId: string,
    keyword: string
  ): Promise<{ success: boolean; query?: { id: string; keyword: string; status: string }; error?: string }> {
    try {
      const res = await callNeuronWriterProxy(this.apiKey, '/list-queries', {
        project: projectId,
      });

      if (!res.success || !res.data) {
        return { success: false, error: res.error || 'Failed to list queries' };
      }

      const queries = Array.isArray(res.data) ? res.data :
        Array.isArray(res.data?.queries) ? res.data.queries :
        Array.isArray(res.data?.data) ? res.data.data : [];

      const keywordLower = keyword.toLowerCase().trim();

      // Try exact match first
      let match = queries.find((q: any) =>
        (q.keyword || q.query || '').toLowerCase().trim() === keywordLower
      );

      // Try partial match
      if (!match) {
        match = queries.find((q: any) =>
          (q.keyword || q.query || '').toLowerCase().includes(keywordLower) ||
          keywordLower.includes((q.keyword || q.query || '').toLowerCase())
        );
      }

      if (match) {
        return {
          success: true,
          query: {
            id: match.id || match.query_id || match._id || '',
            keyword: match.keyword || match.query || '',
            status: match.status || 'unknown',
          },
        };
      }

      return { success: false, error: 'No matching query found' };
    } catch (e) {
      return { success: false, error: `findQueryByKeyword failed: ${e}` };
    }
  }

  async createQuery(
    projectId: string,
    keyword: string
  ): Promise<{ success: boolean; queryId?: string; error?: string }> {
    try {
      const res = await callNeuronWriterProxy(this.apiKey, '/new-query', {
        project: projectId,
        keyword,
        language: 'en',
        search_engine: 'google.com',
      });

      if (!res.success) {
        return { success: false, error: res.error || 'Failed to create query' };
      }

      const queryId = res.data?.query_id || res.data?.id || res.data?.queryId || null;

      if (!queryId) {
        return { success: false, error: 'No query ID in response' };
      }

      return { success: true, queryId: String(queryId) };
    } catch (e) {
      return { success: false, error: `createQuery failed: ${e}` };
    }
  }

  // ─── Analysis Retrieval ────────────────────────────────────────────

  async getQueryAnalysis(
    queryId: string
  ): Promise<{ success: boolean; analysis?: NeuronWriterAnalysis; error?: string }> {
    try {
      const res = await callNeuronWriterProxy(this.apiKey, '/get-query', {
        query: queryId,
      });

      if (!res.success || !res.data) {
        const errorMsg = res.error || 'Query not ready';
        return { success: false, error: errorMsg };
      }

      const raw = res.data?.data || res.data;

      // Check if analysis is actually ready
      const status = raw?.status || raw?.query_status || '';
      if (status && !['ready', 'done', 'completed', 'finished'].includes(status.toLowerCase())) {
        return { success: false, error: `Query not ready. Status: ${status}` };
      }

      const analysis = this.parseRawAnalysis(raw, queryId);
      return { success: true, analysis };
    } catch (e) {
      return { success: false, error: `getQueryAnalysis failed: ${e}` };
    }
  }

  // ─── Content Evaluation ────────────────────────────────────────────

  async evaluateContent(
    queryId: string,
    content: { html: string; title?: string }
  ): Promise<{ success: boolean; contentScore?: number; error?: string }> {
    try {
      const res = await callNeuronWriterProxy(this.apiKey, '/set-content', {
        query: queryId,
        content: content.html,
        title: content.title || '',
      });

      if (res.success && res.data) {
        const score = res.data?.content_score ??
          res.data?.score ??
          res.data?.nw_score ??
          res.data?.data?.content_score;

        if (typeof score === 'number') {
          return { success: true, contentScore: Math.round(score) };
        }
      }

      // Fallback: calculate locally
      return { success: false, error: res.error || 'No score in response' };
    } catch (e) {
      return { success: false, error: `evaluateContent failed: ${e}` };
    }
  }

  // ─── Analysis Helpers ──────────────────────────────────────────────

  getAnalysisSummary(analysis: NeuronWriterAnalysis): string {
    const parts: string[] = [];
    if (analysis.terms?.length) parts.push(`${analysis.terms.length} terms`);
    if (analysis.termsExtended?.length) parts.push(`${analysis.termsExtended.length} extended`);
    if (analysis.entities?.length) parts.push(`${analysis.entities.length} entities`);
    if (analysis.headingsH2?.length) parts.push(`${analysis.headingsH2.length} H2s`);
    if (analysis.headingsH3?.length) parts.push(`${analysis.headingsH3.length} H3s`);
    if (analysis.content_score !== undefined) parts.push(`score: ${analysis.content_score}%`);
    if (analysis.recommended_length) parts.push(`target: ${analysis.recommended_length} words`);
    return parts.join(', ') || 'No data';
  }

  formatTermsForPrompt(
    terms: NeuronWriterTerm[],
    analysis?: NeuronWriterAnalysis
  ): string {
    const sections: string[] = [];

    // Basic/required terms
    const required = terms.filter(t => t.type === 'required' || t.weight >= 70);
    const recommended = terms.filter(t => t.type === 'recommended' && t.weight < 70);

    if (required.length > 0) {
      sections.push('REQUIRED TERMS (MUST include all, 2-3x each):');
      required.slice(0, 40).forEach(t => {
        sections.push(`  • "${t.term}" (weight: ${t.weight}, use ${Math.max(1, t.frequency)}x)`);
      });
    }

    if (recommended.length > 0) {
      sections.push('\nRECOMMENDED TERMS (include most, 1-2x each):');
      recommended.slice(0, 30).forEach(t => {
        sections.push(`  • "${t.term}" (weight: ${t.weight})`);
      });
    }

    // Extended terms
    if (analysis?.termsExtended && analysis.termsExtended.length > 0) {
      sections.push('\nEXTENDED TERMS (weave naturally):');
      analysis.termsExtended.slice(0, 25).forEach(t => {
        sections.push(`  • "${t.term}" (weight: ${t.weight})`);
      });
    }

    // Entities
    if (analysis?.entities && analysis.entities.length > 0) {
      sections.push('\nENTITIES (reference naturally for topical authority):');
      analysis.entities.slice(0, 20).forEach(e => {
        sections.push(`  • "${e.entity}"${e.usage_pc ? ` (${e.usage_pc}% of competitors use)` : ''}`);
      });
    }

    // H2 headings
    if (analysis?.headingsH2 && analysis.headingsH2.length > 0) {
      sections.push('\nRECOMMENDED H2 HEADINGS (use or adapt):');
      analysis.headingsH2.slice(0, 12).forEach(h => {
        sections.push(`  • "${h.text}"${h.usage_pc ? ` (${h.usage_pc}% competitors)` : ''}`);
      });
    }

    // H3 headings
    if (analysis?.headingsH3 && analysis.headingsH3.length > 0) {
      sections.push('\nRECOMMENDED H3 SUBHEADINGS:');
      analysis.headingsH3.slice(0, 15).forEach(h => {
        sections.push(`  • "${h.text}"`);
      });
    }

    // Target length
    if (analysis?.recommended_length) {
      sections.push(`\nTARGET WORD COUNT: ${analysis.recommended_length}+`);
    }

    return sections.join('\n');
  }

  getOptimizationSuggestions(
    content: string,
    terms: NeuronWriterTerm[] | Array<{ term: string; weight?: number; frequency?: number; type?: string; usage_pc?: number }>
  ): string[] {
    const contentLower = content.replace(/<[^>]*>/g, ' ').toLowerCase();
    const missing: string[] = [];

    for (const t of terms) {
      const termText = (t as any).term || '';
      if (!termText || termText.length < 2) continue;

      const termLower = termText.toLowerCase();
      const escaped = termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      try {
        const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
        const matches = contentLower.match(regex);
        const count = matches ? matches.length : 0;
        const target = (t as any).frequency || 1;

        if (count < target) {
          missing.push(termText);
        }
      } catch {
        // Regex failed for this term — skip
        if (!contentLower.includes(termLower)) {
          missing.push(termText);
        }
      }
    }

    // Sort by weight (highest first)
    return missing.sort((a, b) => {
      const termA = terms.find((t: any) => t.term === a) as any;
      const termB = terms.find((t: any) => t.term === b) as any;
      return (termB?.weight || 0) - (termA?.weight || 0);
    });
  }

  calculateContentScore(
    content: string,
    terms: NeuronWriterTerm[]
  ): number {
    if (!terms || terms.length === 0) return 0;

    const contentLower = content.replace(/<[^>]*>/g, ' ').toLowerCase();
    let totalWeight = 0;
    let achievedWeight = 0;

    for (const term of terms) {
      const weight = term.weight || 50;
      totalWeight += weight;

      const termLower = term.term.toLowerCase();
      const escaped = termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      try {
        const regex = new RegExp(escaped, 'gi');
        const matches = contentLower.match(regex);
        const count = matches ? matches.length : 0;
        const target = Math.max(1, term.frequency || 1);

        if (count >= target) {
          achievedWeight += weight;
        } else if (count > 0) {
          achievedWeight += weight * (count / target);
        }
      } catch {
        if (contentLower.includes(termLower)) {
          achievedWeight += weight;
        }
      }
    }

    return totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;
  }

  // ─── Private: Parse Raw API Response ───────────────────────────────

  private parseRawAnalysis(raw: any, queryId?: string): NeuronWriterAnalysis {
    const terms: NeuronWriterTerm[] = [];
    const termsExtended: NeuronWriterTerm[] = [];
    const entities: NeuronWriterEntity[] = [];
    const headingsH1: NeuronWriterHeading[] = [];
    const headingsH2: NeuronWriterHeading[] = [];
    const headingsH3: NeuronWriterHeading[] = [];

    // Parse terms
    const rawTerms = raw?.terms || raw?.keywords || raw?.data?.terms || [];
    if (Array.isArray(rawTerms)) {
      for (const t of rawTerms) {
        const termText = t.term || t.keyword || t.text || t.name || '';
        if (!termText) continue;

        const weight = t.weight || t.importance || t.score || 50;
        const frequency = t.frequency || t.recommended || t.rec || t.target || 1;
        const type: 'required' | 'recommended' | 'optional' =
          t.type === 'required' || weight >= 70 ? 'required' :
          t.type === 'recommended' || weight >= 40 ? 'recommended' : 'optional';

        terms.push({ term: termText, weight, frequency, type, usage_pc: t.usage_pc });
      }
    }

    // Parse extended terms
    const rawExtended = raw?.terms_extended || raw?.termsExtended || raw?.data?.terms_extended || [];
    if (Array.isArray(rawExtended)) {
      for (const t of rawExtended) {
        const termText = t.term || t.keyword || t.text || '';
        if (!termText) continue;
        termsExtended.push({
          term: termText,
          weight: t.weight || t.importance || 30,
          frequency: t.frequency || t.recommended || 1,
          type: 'recommended',
          usage_pc: t.usage_pc,
        });
      }
    }

    // Parse entities
    const rawEntities = raw?.entities || raw?.data?.entities || [];
    if (Array.isArray(rawEntities)) {
      for (const e of rawEntities) {
        const name = e.entity || e.name || e.text || '';
        if (!name) continue;
        entities.push({ entity: name, usage_pc: e.usage_pc, type: e.type });
      }
    }

    // Parse headings
    const parseHeadings = (source: any[]): NeuronWriterHeading[] => {
      if (!Array.isArray(source)) return [];
      return source.map(h => ({
        text: h.text || h.heading || h.title || '',
        usage_pc: h.usage_pc || h.count,
        count: h.count,
      })).filter(h => h.text);
    };

    headingsH1.push(...parseHeadings(raw?.headings_h1 || raw?.headingsH1 || raw?.data?.headings_h1 || []));
    headingsH2.push(...parseHeadings(raw?.headings_h2 || raw?.headingsH2 || raw?.data?.headings_h2 || []));
    headingsH3.push(...parseHeadings(raw?.headings_h3 || raw?.headingsH3 || raw?.data?.headings_h3 || []));

    // Parse competitors
    const rawCompetitors = raw?.competitors || raw?.serp || raw?.data?.competitors || [];
    const competitorData = Array.isArray(rawCompetitors) ? rawCompetitors.map((c: any) => ({
      url: c.url || c.link || '',
      title: c.title || '',
      wordCount: c.wordCount || c.word_count || c.words || 0,
      score: c.score || c.nw_score || 0,
    })).filter((c: any) => c.url) : [];

    // Build structured sections for ContentViewerPanel
    const basicKeywords: NeuronWriterTermData[] = terms
      .filter(t => t.type === 'required' || t.weight >= 70)
      .map(t => ({
        term: t.term,
        type: 'basic' as const,
        weight: t.weight,
        recommended: Math.max(1, t.frequency),
        found: 0,
        status: 'missing' as const,
      }));

    const extendedKeywords: NeuronWriterTermData[] = [
      ...terms.filter(t => t.type !== 'required' && t.weight < 70),
      ...termsExtended,
    ].map(t => ({
      term: t.term,
      type: 'extended' as const,
      weight: t.weight,
      recommended: Math.max(1, t.frequency),
      found: 0,
      status: 'missing' as const,
    }));

    const entityTermData: NeuronWriterTermData[] = entities.map(e => ({
      term: e.entity,
      type: 'entity' as const,
      weight: e.usage_pc || 50,
      recommended: 1,
      found: 0,
      status: 'missing' as const,
    }));

    const toHeadingData = (headings: NeuronWriterHeading[], level: 'h1' | 'h2' | 'h3'): NeuronWriterHeadingData[] =>
      headings.map(h => ({
        text: h.text,
        level,
        source: 'NeuronWriter analysis',
        relevanceScore: h.usage_pc || 70,
      }));

    // Content gaps = high-weight terms that are commonly missing
    const allTermTexts = [...terms, ...termsExtended].map(t => t.term);
    const contentGaps = terms
      .filter(t => t.weight >= 60)
      .map(t => t.term)
      .slice(0, 20);

    const avgCompWordCount = competitorData.length > 0
      ? Math.round(competitorData.reduce((s: number, c: any) => s + (c.wordCount || 0), 0) / competitorData.length)
      : 2500;

    return {
      // Core data (used by EnterpriseContentOrchestrator)
      terms: terms.sort((a, b) => b.weight - a.weight),
      termsExtended: termsExtended.sort((a, b) => b.weight - a.weight),
      entities,
      headingsH1,
      headingsH2,
      headingsH3,
      content_score: raw?.content_score ?? raw?.score ?? undefined,
      recommended_length: raw?.recommended_length ?? raw?.word_count ?? avgCompWordCount,
      language: raw?.language || raw?.lang || 'en',
      keyword: raw?.keyword || raw?.query || '',

      // Structured sections (used by ContentViewerPanel NeuronWriter tab)
      basicKeywords,
      extendedKeywords: extendedKeywords,
      h1Suggestions: toHeadingData(headingsH1, 'h1'),
      h2Suggestions: toHeadingData(headingsH2, 'h2'),
      h3Suggestions: toHeadingData(headingsH3, 'h3'),
      competitorData,
      recommendations: {
        targetWordCount: Math.max(2500, avgCompWordCount),
        targetScore: 90,
        minH2Count: Math.max(5, headingsH2.length > 0 ? Math.min(headingsH2.length, 10) : 7),
        minH3Count: Math.max(3, headingsH3.length > 0 ? Math.min(headingsH3.length, 15) : 5),
        contentGaps,
      },
      allTerms: allTermTexts,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY EXPORT (required by SetupConfig.tsx and EnterpriseContentOrchestrator)
// ═══════════════════════════════════════════════════════════════════════════════

export function createNeuronWriterService(apiKey: string): NeuronWriterService {
  return new NeuronWriterService(apiKey);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE STANDALONE FUNCTIONS (used by ContentViewerPanel for live scoring)
// ═══════════════════════════════════════════════════════════════════════════════

export function scoreContentAgainstNeuron(
  htmlContent: string,
  analysis: NeuronWriterAnalysis
): { score: number; missing: string[]; underused: string[]; optimal: string[] } {
  const plainText = htmlContent.replace(/<[^>]*>/g, ' ').toLowerCase();
  const missing: string[] = [];
  const underused: string[] = [];
  const optimal: string[] = [];

  const allTerms: Array<{ term: string; weight: number; recommended: number }> = [
    ...(analysis.basicKeywords || []).map(t => ({ term: t.term, weight: t.weight, recommended: t.recommended })),
    ...(analysis.extendedKeywords || []).map(t => ({ term: t.term, weight: t.weight, recommended: t.recommended })),
    ...(analysis.entities || []).map(e => ({
      term: (e as any).term || (e as any).entity || '',
      weight: (e as any).weight || (e as any).usage_pc || 50,
      recommended: (e as any).recommended || 1,
    })),
  ].filter(t => t.term);

  // Fallback: if no structured data, use raw terms
  if (allTerms.length === 0 && analysis.terms) {
    for (const t of analysis.terms) {
      allTerms.push({ term: t.term, weight: t.weight, recommended: Math.max(1, t.frequency) });
    }
  }

  let totalWeight = 0;
  let achievedWeight = 0;

  for (const term of allTerms) {
    totalWeight += term.weight;
    const termLower = term.term.toLowerCase();
    const escaped = termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    try {
      const regex = new RegExp(escaped, 'gi');
      const matches = plainText.match(regex);
      const count = matches ? matches.length : 0;

      if (count === 0) {
        missing.push(term.term);
      } else if (count < term.recommended) {
        underused.push(term.term);
        achievedWeight += term.weight * (count / term.recommended);
      } else {
        optimal.push(term.term);
        achievedWeight += term.weight;
      }
    } catch {
      if (!plainText.includes(termLower)) {
        missing.push(term.term);
      } else {
        optimal.push(term.term);
        achievedWeight += term.weight;
      }
    }
  }

  const score = totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;
  return { score, missing, underused, optimal };
}

export default NeuronWriterService;
