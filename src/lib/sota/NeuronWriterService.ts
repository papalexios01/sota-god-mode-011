// src/lib/sota/NeuronWriterService.ts
// SOTA NeuronWriter Service v4.1 — With listProjects() fix
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
  level?: 'h1' | 'h2' | 'h3';
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
  query_id?: string;
  status?: string;

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

export interface NeuronWriterTermData {
  term: string;
  type: 'basic' | 'extended' | 'entity';
  weight: number;
  recommended: number;
  found: number;
  status: 'missing' | 'underused' | 'optimal' | 'overused';
}

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

const NEURON_API_BASE = 'https://app.neuronwriter.com/neuron-api/0.5/writer';

async function callNeuronWriterProxy(
  apiKey: string,
  endpoint: string,
  body?: Record<string, unknown>
): Promise<NWApiResponse> {
  let lastError = '';
  const errors: string[] = [];

  // Attempt 1 & 2: Try through server-side proxy endpoints
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

      // Detect HTML responses (SPA fallback / 404 returning index.html)
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html')) {
        errors.push(`${proxy}: returned HTML (likely 404/SPA fallback)`);
        continue;
      }

      const data = await res.json();

      if (data && typeof data === 'object') {
        if (data.success !== undefined) return data as NWApiResponse;
        return { success: res.ok, data, status: res.status };
      }

      errors.push(`${proxy}: invalid response format`);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      errors.push(`${proxy}: ${lastError}`);
      continue;
    }
  }

  // Attempt 3: Direct NeuronWriter API call (browser → NeuronWriter)
  // This works when no server-side proxy is available
  try {
    const url = `${NEURON_API_BASE}${endpoint}`;
    const fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey.trim(),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };
    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const directRes = await fetch(url, fetchOptions);
    const directText = await directRes.text();

    let directData: any;
    try {
      directData = JSON.parse(directText);
    } catch {
      directData = { raw: directText.substring(0, 500) };
    }

    if (directRes.ok) {
      console.log(`[NeuronWriter] Direct API call succeeded for ${endpoint}`);
      return { success: true, data: directData, status: directRes.status };
    }

    return {
      success: false,
      data: directData,
      error: `NeuronWriter API ${directRes.status}: ${directData?.message || directData?.error || 'Unknown error'}`,
      status: directRes.status,
    };
  } catch (directErr) {
    const directMsg = directErr instanceof Error ? directErr.message : String(directErr);
    errors.push(`direct API: ${directMsg}`);
  }

  console.error('[NeuronWriter] All connection methods failed:', errors.join(' | '));
  return { success: false, error: `All NeuronWriter connection methods failed: ${errors.join(' | ')}` };
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEURONWRITER SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

export class NeuronWriterService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  // ─── Project Management ────────────────────────────────────────────

  async listProjects(): Promise<{
    success: boolean;
    projects?: Array<{ id: string; name: string; queries_count?: number }>;
    error?: string;
  }> {
    try {
      const res = await callNeuronWriterProxy(this.apiKey, '/list-projects', {});

      if (!res.success || !res.data) {
        return { success: false, error: res.error || 'Failed to fetch projects' };
      }

      const raw = res.data;

      const rawProjects: any[] =
        Array.isArray(raw) ? raw :
          Array.isArray(raw?.projects) ? raw.projects :
            Array.isArray(raw?.data) ? raw.data :
              Array.isArray(raw?.data?.projects) ? raw.data.projects :
                [];

      const projects = rawProjects.map((p: any) => ({
        id: String(p.id || p.project_id || p._id || ''),
        name: String(p.name || p.project_name || p.title || `Project ${p.id || 'unknown'}`),
        queries_count: typeof p.queries_count === 'number' ? p.queries_count :
          typeof p.queries === 'number' ? p.queries :
            typeof p.count === 'number' ? p.count :
              undefined,
      })).filter((p: any) => p.id);

      if (projects.length === 0 && rawProjects.length > 0) {
        console.warn('[NeuronWriter] Received project data but could not parse:', rawProjects.slice(0, 2));
        return { success: false, error: 'Received data but could not parse project list' };
      }

      return { success: true, projects };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: `listProjects failed: ${message}` };
    }
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

      let match = queries.find((q: any) =>
        (q.keyword || q.query || '').toLowerCase().trim() === keywordLower
      );

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

    if (analysis?.termsExtended && analysis.termsExtended.length > 0) {
      sections.push('\nEXTENDED TERMS (weave naturally):');
      analysis.termsExtended.slice(0, 25).forEach(t => {
        sections.push(`  • "${t.term}" (weight: ${t.weight})`);
      });
    }

    if (analysis?.entities && analysis.entities.length > 0) {
      sections.push('\nENTITIES (reference naturally for topical authority):');
      analysis.entities.slice(0, 20).forEach(e => {
        sections.push(`  • "${e.entity}"${e.usage_pc ? ` (${e.usage_pc}% of competitors use)` : ''}`);
      });
    }

    if (analysis?.headingsH2 && analysis.headingsH2.length > 0) {
      sections.push('\nRECOMMENDED H2 HEADINGS (use or adapt):');
      analysis.headingsH2.slice(0, 12).forEach(h => {
        sections.push(`  • "${h.text}"${h.usage_pc ? ` (${h.usage_pc}% competitors)` : ''}`);
      });
    }

    if (analysis?.headingsH3 && analysis.headingsH3.length > 0) {
      sections.push('\nRECOMMENDED H3 SUBHEADINGS:');
      analysis.headingsH3.slice(0, 15).forEach(h => {
        sections.push(`  • "${h.text}"`);
      });
    }

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
        if (!contentLower.includes(termLower)) {
          missing.push(termText);
        }
      }
    }

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

    const query_id = queryId || raw?.query_id || raw?.id || undefined;
    const status = raw?.status || raw?.query_status || undefined;

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

    const rawEntities = raw?.entities || raw?.data?.entities || [];
    if (Array.isArray(rawEntities)) {
      for (const e of rawEntities) {
        const name = e.entity || e.name || e.text || '';
        if (!name) continue;
        entities.push({ entity: name, usage_pc: e.usage_pc, type: e.type });
      }
    }

    const parseHeadings = (source: any[], level: 'h1' | 'h2' | 'h3'): NeuronWriterHeading[] => {
      if (!Array.isArray(source)) return [];
      return source.map(h => ({
        text: h.text || h.heading || h.title || '',
        usage_pc: h.usage_pc || h.count,
        count: h.count,
        level,
      })).filter(h => h.text);
    };

    headingsH1.push(...parseHeadings(raw?.headings_h1 || raw?.headingsH1 || raw?.data?.headings_h1 || [], 'h1'));
    headingsH2.push(...parseHeadings(raw?.headings_h2 || raw?.headingsH2 || raw?.data?.headings_h2 || [], 'h2'));
    headingsH3.push(...parseHeadings(raw?.headings_h3 || raw?.headingsH3 || raw?.data?.headings_h3 || [], 'h3'));

    const rawCompetitors = raw?.competitors || raw?.serp || raw?.data?.competitors || [];
    const competitorData = Array.isArray(rawCompetitors) ? rawCompetitors.map((c: any) => ({
      url: c.url || c.link || '',
      title: c.title || '',
      wordCount: c.wordCount || c.word_count || c.words || 0,
      score: c.score || c.nw_score || 0,
    })).filter((c: any) => c.url) : [];

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

    const toHeadingData = (headings: NeuronWriterHeading[], level: 'h1' | 'h2' | 'h3'): NeuronWriterHeadingData[] =>
      headings.map(h => ({
        text: h.text,
        level,
        source: 'NeuronWriter analysis',
        relevanceScore: h.usage_pc || 70,
      }));

    const allTermTexts = [...terms, ...termsExtended].map(t => t.term);
    const contentGaps = terms
      .filter(t => t.weight >= 60)
      .map(t => t.term)
      .slice(0, 20);

    const avgCompWordCount = competitorData.length > 0
      ? Math.round(competitorData.reduce((s: number, c: any) => s + (c.wordCount || 0), 0) / competitorData.length)
      : 2500;

    return {
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
      query_id,
      status,

      basicKeywords,
      extendedKeywords,
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
