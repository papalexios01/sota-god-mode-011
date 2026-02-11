export interface NeuronWriterProject {
  id: string;
  name: string;
  language?: string;
  engine?: string;
  created_at?: string;
  queries_count?: number;
}

export interface NeuronWriterQuery {
  id: string;
  query: string;
  keyword?: string;
  status: 'waiting' | 'in progress' | 'ready' | 'not found';
  created_at?: string;
  updated_at?: string;
  lang?: string;
  language?: string;
  location?: string;
  engine?: string;
  source?: string;
  tags?: string[];
}

export interface NeuronWriterHeading {
  text: string;
  level: 'h2' | 'h3';
  usage_pc: number;
  sugg_usage?: [number, number];
}

export interface NeuronWriterEntity {
  entity: string;
  type?: string;
  usage_pc: number;
  sugg_usage?: [number, number];
}

export interface NeuronWriterAnalysis {
  query_id: string;
  keyword: string;
  status: string;
  terms: NeuronWriterTerm[];
  termsExtended: NeuronWriterTerm[];
  entities: NeuronWriterEntity[];
  headingsH2: NeuronWriterHeading[];
  headingsH3: NeuronWriterHeading[];
  terms_txt?: {
    title: string;
    content_basic: string;
    content_basic_w_ranges: string;
    content_extended?: string;
    entities: string;
    headings_h2?: string;
    headings_h3?: string;
  };
  metrics?: {
    word_count: { median: number; target: number };
    readability: { median: number; target: number };
  };
  ideas?: {
    suggest_questions: { q: string }[];
    people_also_ask: { q: string }[];
    content_questions: { q: string }[];
  };
  competitors: NeuronWriterCompetitor[];
  recommended_length: number;
  content_score?: number;
}

export interface NeuronWriterTerm {
  term: string;
  weight: number;
  frequency: number;
  type: 'required' | 'recommended' | 'optional';
  usage_pc?: number;
  sugg_usage?: [number, number];
}

export interface NeuronWriterCompetitor {
  rank: number;
  url: string;
  title: string;
  desc?: string;
  content_score?: number;
  word_count?: number;
  score?: number;
}

export class NeuronWriterService {
  private apiKey: string;

  private static queryCache = new Map<
    string,
    { id: string; keyword: string; status?: NeuronWriterQuery['status']; updatedAt?: number }
  >();

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim();
  }

  private static makeQueryCacheKey(projectId: string, keyword: string): string {
    return `${projectId.trim()}::${keyword.toLowerCase().trim()}`;
  }

  private getProxyEndpoints(): Array<{ url: string; headers: Record<string, string>; label: string }> {
    const endpoints: Array<{ url: string; headers: Record<string, string>; label: string }> = [];

    // 1. Supabase Edge Function (if configured)
    try {
      const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
      if (supabaseUrl && supabaseUrl.includes('.supabase.')) {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const anonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
        if (anonKey) headers['Authorization'] = `Bearer ${anonKey}`;
        endpoints.push({
          url: `${supabaseUrl}/functions/v1/neuronwriter-proxy`,
          headers,
          label: 'edge',
        });
      }
    } catch {}

    // 2. Serverless function - works on both Cloudflare Pages (/functions/api/neuronwriter.ts)
    //    and Vercel (/api/neuronwriter.ts)
    endpoints.push({
      url: '/api/neuronwriter',
      headers: { 'Content-Type': 'application/json' },
      label: 'serverless',
    });

    // 3. Express dev server proxy (local dev only)
    endpoints.push({
      url: '/api/neuronwriter-proxy',
      headers: { 'Content-Type': 'application/json' },
      label: 'express',
    });

    return endpoints;
  }

  private async makeRequest<T>(
    endpoint: string,
    method: string = 'POST',
    body?: Record<string, unknown>
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const payload = JSON.stringify({ endpoint, method, apiKey: this.apiKey, body });
    const proxyEndpoints = this.getProxyEndpoints();

    let lastError = 'All proxy endpoints failed';

    for (const proxy of proxyEndpoints) {
      const result = await this.executeProxyRequest<T>(proxy.url, proxy.headers, payload, proxy.label);
      if (result.success || (result.error && result.error !== '__fallback__')) {
        return result;
      }
      if (result.error && result.error !== '__fallback__') {
        lastError = result.error;
      }
    }

    // 4. Last resort: direct API call (may fail due to CORS but worth trying)
    return this.executeDirectApiCall<T>(endpoint, method, body);
  }

  private async executeDirectApiCall<T>(
    endpoint: string,
    method: string,
    body?: Record<string, unknown>
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const NEURON_API_BASE = 'https://app.neuronwriter.com/neuron-api/0.5/writer';
    try {
      console.log(`[NeuronWriter] direct API call: ${endpoint}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const fetchOptions: RequestInit = {
        method,
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      };

      if (body && (method === 'POST' || method === 'PUT')) {
        fetchOptions.body = JSON.stringify(body);
      }

      const response = await fetch(`${NEURON_API_BASE}${endpoint}`, fetchOptions);
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: `NeuronWriter API error: ${response.status}` };
      }

      return { success: true, data: data as T };
    } catch (error) {
      console.error('[NeuronWriter] direct API call failed:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Request timed out.' };
      }
      return {
        success: false,
        error: 'All proxy endpoints failed and direct API call was blocked by CORS. Please check your deployment configuration.',
      };
    }
  }

  private async executeProxyRequest<T>(
    url: string,
    headers: Record<string, string>,
    payload: string,
    label: string
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      console.log(`[NeuronWriter] ${label} proxy call: ${url}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: payload,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 405 || response.status === 404) {
        console.warn(`[NeuronWriter] ${label} returned ${response.status}, falling back`);
        return { success: false, error: '__fallback__' };
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn(`[NeuronWriter] ${label} returned non-JSON (${contentType}), falling back`);
        return { success: false, error: '__fallback__' };
      }

      let result: any;
      try {
        result = await response.json();
      } catch {
        console.warn(`[NeuronWriter] ${label} returned unparseable JSON (${response.status}), falling back`);
        return { success: false, error: '__fallback__' };
      }

      if (!result.success) {
        let errorMsg = result.error || 'API call failed';
        if (result.status === 401 || result.status === 403) {
          errorMsg = 'Invalid API key. Check your NeuronWriter API key and try again.';
        } else if (result.status === 429) {
          errorMsg = 'Rate limited by NeuronWriter API. Wait a moment and try again.';
        }
        return { success: false, error: errorMsg };
      }

      return { success: true, data: result.data as T };
    } catch (error) {
      console.error(`[NeuronWriter] ${label} proxy error:`, error);
      console.warn(`[NeuronWriter] ${label} failed, falling back to next proxy`);
      return { success: false, error: '__fallback__' };
    }
  }

  async validateApiKey(): Promise<{ valid: boolean; error?: string }> {
    const result = await this.listProjects();
    return { valid: result.success, error: result.error };
  }

  async listProjects(): Promise<{ success: boolean; projects?: NeuronWriterProject[]; error?: string }> {
    const result = await this.makeRequest<NeuronWriterProject[] | { projects: NeuronWriterProject[] }>(
      '/list-projects',
      'POST',
      {}
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    let projects: NeuronWriterProject[] = [];
    if (Array.isArray(result.data)) {
      projects = result.data.map((p: any) => ({
        id: p.project || p.id,
        name: p.name,
        language: p.language,
        engine: p.engine,
      }));
    } else if (result.data && 'projects' in (result.data as any)) {
      projects = (result.data as any).projects;
    }

    return { success: true, projects };
  }

  async listQueries(projectId: string, options?: {
    status?: 'waiting' | 'in progress' | 'ready';
    source?: 'neuron' | 'neuron-api';
    tags?: string[];
  }): Promise<{ success: boolean; queries?: NeuronWriterQuery[]; error?: string }> {
    const result = await this.makeRequest<NeuronWriterQuery[]>(
      '/list-queries',
      'POST',
      { 
        project: projectId,
        ...options
      }
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const queries = ((result.data as any[]) || []).map((q: any) => ({
      id: q.query || q.id,
      query: q.query || q.id,
      keyword: q.keyword,
      status: q.status || 'ready',
      created_at: q.created || q.created_at,
      updated_at: q.updated || q.updated_at,
      language: q.language,
      engine: q.engine,
      source: q.source,
      tags: q.tags,
    }));

    return { success: true, queries };
  }

  async findQueryByKeyword(
    projectId: string,
    keyword: string
  ): Promise<{ success: boolean; query?: NeuronWriterQuery; error?: string }> {
    console.log(`[NeuronWriter] Searching for existing query: "${keyword}" in project ${projectId}`);

    const normalizedKeyword = keyword.toLowerCase().trim();

    const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
    const cacheKey = NeuronWriterService.makeQueryCacheKey(projectId, keyword);
    const cached = NeuronWriterService.queryCache.get(cacheKey);
    if (cached?.id && cached.updatedAt && (Date.now() - cached.updatedAt < CACHE_TTL_MS)) {
      console.log(
        `[NeuronWriter] Using cached query for "${keyword}" (ID: ${cached.id}, status: ${cached.status || 'unknown'}, age: ${Math.round((Date.now() - cached.updatedAt) / 1000)}s)`
      );
      return {
        success: true,
        query: {
          id: cached.id,
          query: cached.id,
          keyword: cached.keyword,
          status: cached.status || 'waiting',
        },
      };
    }


    const statuses: Array<'ready' | 'waiting' | 'in progress'> = ['ready', 'waiting', 'in progress'];
    const listResults = await Promise.all(
      statuses.map((status) => this.listQueries(projectId, { status }))
    );

    const errors = listResults.filter((r) => !r.success).map((r) => r.error).filter(Boolean) as string[];
    const queries = listResults.flatMap((r) => (r.success ? r.queries || [] : []));

    if (queries.length === 0 && errors.length > 0) {
      return { success: false, error: errors[0] };
    }

    const uniqueById = new Map<string, NeuronWriterQuery>();
    for (const q of queries) uniqueById.set(q.id, q);
    const allQueries = Array.from(uniqueById.values());

    let match = allQueries.find(
      (q) => (q.keyword || '').toLowerCase().trim() === normalizedKeyword
    );

    if (!match) {
      match = allQueries.find((q) => {
        const qKeyword = (q.keyword || '').toLowerCase().trim();
        if (!qKeyword) return false;
        return qKeyword.includes(normalizedKeyword) || normalizedKeyword.includes(qKeyword);
      });
    }

    if (match) {
      console.log(`[NeuronWriter] Found existing query: "${match.keyword}" (ID: ${match.id})`);
      NeuronWriterService.queryCache.set(cacheKey, {
        id: match.id,
        keyword: match.keyword || keyword,
        status: match.status,
        updatedAt: Date.now(),
      });
      return { success: true, query: match };
    }

    console.log(`[NeuronWriter] No existing query found for: "${keyword}"`);
    return { success: true, query: undefined };
  }

  async createQuery(
    projectId: string,
    keyword: string,
    language: string = 'English',
    engine: string = 'google.com'
  ): Promise<{ success: boolean; queryId?: string; queryUrl?: string; shareUrl?: string; error?: string }> {
    const result = await this.makeRequest<{
      query: string;
      query_url: string;
      share_url: string;
      readonly_url: string;
    }>(
      '/new-query',
      'POST',
      { 
        project: projectId,
        keyword,
        language,
        engine
      }
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const createdId = result.data?.query;
    if (createdId) {
      const cacheKey = NeuronWriterService.makeQueryCacheKey(projectId, keyword);
      NeuronWriterService.queryCache.set(cacheKey, {
        id: createdId,
        keyword,
        status: 'waiting',
        updatedAt: Date.now(),
      });
    }

    return { 
      success: true, 
      queryId: result.data?.query,
      queryUrl: result.data?.query_url,
      shareUrl: result.data?.share_url
    };
  }

  async getQueryAnalysis(queryId: string): Promise<{ success: boolean; analysis?: NeuronWriterAnalysis; error?: string }> {
    const result = await this.makeRequest<any>(
      '/get-query',
      'POST',
      { query: queryId }
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    const data = result.data;
    
    console.log(`[NeuronWriter] Raw query response keys:`, Object.keys(data || {}));
    console.log(`[NeuronWriter] Raw terms keys:`, Object.keys(data?.terms || {}));
    console.log(`[NeuronWriter] Raw terms_txt keys:`, Object.keys(data?.terms_txt || {}));
    if (data?.terms) {
      console.log(`[NeuronWriter] terms.h2:`, typeof data.terms.h2, Array.isArray(data.terms.h2) ? `(${data.terms.h2.length} items)` : '');
      console.log(`[NeuronWriter] terms.h3:`, typeof data.terms.h3, Array.isArray(data.terms.h3) ? `(${data.terms.h3.length} items)` : '');
      console.log(`[NeuronWriter] entities:`, typeof data.terms.entities, Array.isArray(data.terms.entities) ? `(${data.terms.entities.length} items)` : '');
    }
    if (data?.terms_txt) {
      console.log(`[NeuronWriter] terms_txt.h2:`, typeof data.terms_txt.h2, data.terms_txt.h2 ? `(${String(data.terms_txt.h2).split('\\n').filter(Boolean).length} lines)` : 'empty');
      console.log(`[NeuronWriter] terms_txt.h3:`, typeof data.terms_txt.h3, data.terms_txt.h3 ? `(${String(data.terms_txt.h3).split('\\n').filter(Boolean).length} lines)` : 'empty');
    }
    
    if (data?.status !== 'ready') {
      return { 
        success: false, 
        error: `Query not ready yet. Status: ${data?.status || 'unknown'}. Try again in a few seconds.`
      };
    }

    const terms: NeuronWriterTerm[] = [];
    if (data.terms?.content_basic) {
      data.terms.content_basic.forEach((t: any) => {
        terms.push({
          term: t.t,
          weight: t.usage_pc || 50,
          frequency: t.sugg_usage?.[1] || 1,
          type: t.usage_pc >= 70 ? 'required' : t.usage_pc >= 40 ? 'recommended' : 'optional',
          usage_pc: t.usage_pc,
          sugg_usage: t.sugg_usage,
        });
      });
    }

    const termsExtended: NeuronWriterTerm[] = [];
    if (data.terms?.content_extended) {
      data.terms.content_extended.forEach((t: any) => {
        termsExtended.push({
          term: t.t,
          weight: t.usage_pc || 30,
          frequency: t.sugg_usage?.[1] || 1,
          type: t.usage_pc >= 50 ? 'recommended' : 'optional',
          usage_pc: t.usage_pc,
          sugg_usage: t.sugg_usage,
        });
      });
    }

    const entities: NeuronWriterEntity[] = [];
    if (data.terms?.entities) {
      data.terms.entities.forEach((e: any) => {
        entities.push({
          entity: e.t,
          type: e.type,
          usage_pc: e.usage_pc || 30,
          sugg_usage: e.sugg_usage,
        });
      });
    }

    const headingsH2: NeuronWriterHeading[] = [];
    if (data.terms?.h2 && Array.isArray(data.terms.h2)) {
      data.terms.h2.forEach((h: any) => {
        headingsH2.push({
          text: h.t,
          level: 'h2',
          usage_pc: h.usage_pc || 30,
          sugg_usage: h.sugg_usage,
        });
      });
    } else if (data.terms_txt?.h2 && typeof data.terms_txt.h2 === 'string') {
      const h2Lines = data.terms_txt.h2.split('\n').filter((line: string) => line.trim());
      h2Lines.forEach((line: string, idx: number) => {
        headingsH2.push({
          text: line.trim(),
          level: 'h2',
          usage_pc: Math.max(80 - idx * 5, 30),
        });
      });
    }

    const headingsH3: NeuronWriterHeading[] = [];
    if (data.terms?.h3 && Array.isArray(data.terms.h3)) {
      data.terms.h3.forEach((h: any) => {
        headingsH3.push({
          text: h.t,
          level: 'h3',
          usage_pc: h.usage_pc || 20,
          sugg_usage: h.sugg_usage,
        });
      });
    } else if (data.terms_txt?.h3 && typeof data.terms_txt.h3 === 'string') {
      const h3Lines = data.terms_txt.h3.split('\n').filter((line: string) => line.trim());
      h3Lines.forEach((line: string, idx: number) => {
        headingsH3.push({
          text: line.trim(),
          level: 'h3',
          usage_pc: Math.max(60 - idx * 3, 20),
        });
      });
    }

    console.log(`[NeuronWriter] Parsed: ${terms.length} basic terms, ${termsExtended.length} extended terms, ${entities.length} entities, ${headingsH2.length} H2s, ${headingsH3.length} H3s`);

    const analysis: NeuronWriterAnalysis = {
      query_id: queryId,
      keyword: data.keyword || '',
      status: data.status,
      terms,
      termsExtended,
      entities,
      headingsH2,
      headingsH3,
      terms_txt: data.terms_txt,
      metrics: data.metrics,
      ideas: data.ideas,
      competitors: (data.competitors || []).map((c: any) => ({
        rank: c.rank,
        url: c.url,
        title: c.title,
        desc: c.desc,
        content_score: c.content_score,
      })),
      recommended_length: data.metrics?.word_count?.target || 1500,
      content_score: data.content_score,
    };

    return { success: true, analysis };
  }

  async getRecommendedTerms(queryId: string): Promise<{ success: boolean; terms?: NeuronWriterTerm[]; error?: string }> {
    const analysisResult = await this.getQueryAnalysis(queryId);
    
    if (!analysisResult.success) {
      return { success: false, error: analysisResult.error };
    }

    return { success: true, terms: analysisResult.analysis?.terms || [] };
  }

  async importContent(
    queryId: string,
    content: {
      html?: string;
      title?: string;
      description?: string;
      url?: string;
    }
  ): Promise<{ success: boolean; contentScore?: number; error?: string }> {
    const result = await this.makeRequest<{ status: string; content_score?: number }>(
      '/import-content',
      'POST',
      { 
        query: queryId,
        ...content
      }
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { 
      success: true, 
      contentScore: result.data?.content_score 
    };
  }

  async evaluateContent(
    queryId: string,
    content: {
      html?: string;
      title?: string;
      description?: string;
      url?: string;
    }
  ): Promise<{ success: boolean; contentScore?: number; error?: string }> {
    const result = await this.makeRequest<{ status: string; content_score?: number }>(
      '/evaluate-content',
      'POST',
      { 
        query: queryId,
        ...content
      }
    );

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return { 
      success: true, 
      contentScore: result.data?.content_score 
    };
  }

  calculateContentScore(content: string, terms: NeuronWriterTerm[]): number {
    const contentLower = content.toLowerCase();
    let totalWeight = 0;
    let achievedWeight = 0;

    terms.forEach(term => {
      const termLower = term.term.toLowerCase();
      const regex = new RegExp(termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const count = (contentLower.match(regex) || []).length;
      
      totalWeight += term.weight;
      
      if (count >= term.frequency) {
        achievedWeight += term.weight;
      } else if (count > 0) {
        achievedWeight += (term.weight * count) / term.frequency;
      }
    });

    return totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;
  }

  getOptimizationSuggestions(content: string, terms: NeuronWriterTerm[]): string[] {
    const suggestions: string[] = [];
    const contentLower = content.toLowerCase();

    terms.forEach(term => {
      const termLower = term.term.toLowerCase();
      const regex = new RegExp(termLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const count = (contentLower.match(regex) || []).length;
      
      if (term.type === 'required' && count < term.frequency) {
        const range = term.sugg_usage ? `${term.sugg_usage[0]}-${term.sugg_usage[1]}x` : `${term.frequency}x`;
        suggestions.push(`Add "${term.term}" (currently ${count}x, target: ${range})`);
      } else if (term.type === 'recommended' && count === 0) {
        suggestions.push(`Consider adding "${term.term}" (recommended term, ${term.usage_pc || 50}% competitor usage)`);
      }
    });

    return suggestions.slice(0, 20);
  }

  formatTermsForPrompt(terms: NeuronWriterTerm[], analysis?: NeuronWriterAnalysis): string {
    const required = terms.filter(t => t.type === 'required');
    const recommended = terms.filter(t => t.type === 'recommended');
    
    // Combine basic + extended for comprehensive keyword coverage
    const allTerms = [...terms, ...(analysis?.termsExtended || [])];
    const topTermsByUsage = allTerms
      .sort((a, b) => (b.usage_pc || 0) - (a.usage_pc || 0))
      .slice(0, 50);
    
    let prompt = `
🔴 NEURONWRITER KEYWORD OPTIMIZATION - TARGET: 90%+ CONTENT SCORE 🔴

══════════════════════════════════════════════════════════════════════
TOTAL KEYWORD DATA: ${terms.length} basic + ${analysis?.termsExtended?.length || 0} extended + ${analysis?.entities?.length || 0} entities
══════════════════════════════════════════════════════════════════════

### 🎯 REQUIRED KEYWORDS (MUST include at EXACT frequency - NON-NEGOTIABLE):
${required.length > 0 ? required.map(t => {
  const range = t.sugg_usage ? `${t.sugg_usage[0]}-${t.sugg_usage[1]}x` : `${t.frequency}x`;
  return `• "${t.term}" → use EXACTLY ${range} (${t.usage_pc || 70}% of top competitors use this)`;
}).join('\n') : '(No required terms - focus on recommended and extended terms below)'}

### ⭐ RECOMMENDED KEYWORDS (include ALL of these - 100% coverage for 90%+ score):
${recommended.slice(0, 35).map(t => {
  const range = t.sugg_usage ? `${t.sugg_usage[0]}-${t.sugg_usage[1]}x` : '1-3x';
  return `• "${t.term}" → target ${range} (${t.usage_pc || 50}% competitor usage)`;
}).join('\n')}

### 📊 EXTENDED KEYWORDS (include 70%+ for comprehensive topical coverage):
${(analysis?.termsExtended || []).slice(0, 50).map(t => {
  const range = t.sugg_usage ? `${t.sugg_usage[0]}-${t.sugg_usage[1]}x` : '1-2x';
  return `• "${t.term}" (${t.usage_pc || 30}%)`;
}).join('\n')}

### 🏷️ NAMED ENTITIES - MANDATORY (mention EVERY entity at least once):
${(analysis?.entities || []).slice(0, 30).map(e => `• "${e.entity}"${e.type ? ` [${e.type}]` : ''} - ${e.usage_pc || 30}% usage`).join('\n')}`;

    if (analysis?.headingsH2 && analysis.headingsH2.length > 0) {
      prompt += `\n
### 📌 MANDATORY H2 HEADINGS (use these EXACT headings or very close variations):
${analysis.headingsH2.slice(0, 15).map((h, i) => `${i + 1}. "${h.text}" (${h.usage_pc || 50}% competitor usage)`).join('\n')}`;
    }

    if (analysis?.headingsH3 && analysis.headingsH3.length > 0) {
      prompt += `\n
### 📎 RECOMMENDED H3 SUBHEADINGS (use these under relevant H2s):
${analysis.headingsH3.slice(0, 20).map(h => `• "${h.text}"`).join('\n')}`;
    }

    prompt += `

══════════════════════════════════════════════════════════════════════
🚨 CRITICAL NEURONWRITER SCORE RULES (90%+ REQUIRED):
══════════════════════════════════════════════════════════════════════
1. REQUIRED terms: Use at EXACT frequency specified - no exceptions
2. RECOMMENDED terms: Include 100% of them naturally throughout content
3. EXTENDED terms: Include at least 70% for comprehensive topical coverage
4. ENTITIES: Mention EVERY named entity at least once in relevant context
5. HEADINGS: Use the H2 headings provided (or very close variations)
6. DISTRIBUTION: Spread keywords EVENLY across ALL sections - not clustered
7. NATURAL FLOW: Keywords must flow naturally in sentences - NEVER list them
8. FIRST/LAST: Primary keyword MUST appear in first 100 AND last 100 words
9. H2 KEYWORDS: Include required terms in at least 2-3 H2 headings
10. DENSITY: Maintain 1-2% keyword density for primary term

💡 TIP: The more terms you include naturally, the higher your NeuronWriter score!`;

    return prompt;
  }

  getAnalysisSummary(analysis: NeuronWriterAnalysis): string {
    return `Keywords: ${analysis.terms.length} basic + ${analysis.termsExtended?.length || 0} extended | Entities: ${analysis.entities?.length || 0} | Headings: ${analysis.headingsH2?.length || 0} H2 + ${analysis.headingsH3?.length || 0} H3`;
  }
}

export function createNeuronWriterService(apiKey: string): NeuronWriterService {
  return new NeuronWriterService(apiKey);
}

let serviceInstance: NeuronWriterService | null = null;

export function getNeuronWriterService(apiKey?: string): NeuronWriterService | null {
  if (apiKey) {
    serviceInstance = new NeuronWriterService(apiKey);
  }
  return serviceInstance;
}
