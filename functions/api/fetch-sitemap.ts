/// <reference types="@cloudflare/workers-types" />

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*", // TODO: Restrict in production
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function isPublicUrl(input: string): boolean {
  let parsed: URL;
  try { parsed = new URL(input); } catch { return false; }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  const h = parsed.hostname.toLowerCase();
  if (h === "localhost" || h === "[::1]" || h.endsWith(".local") || h.endsWith(".internal")) return false;
  if (h === "metadata.google.internal" || h === "instance-data") return false;
  if (/^0x[0-9a-f]+$/i.test(h) || /^\d+$/.test(h)) return false;
  const p = h.split(".").map(Number);
  if (p.length === 4 && p.every((n) => !isNaN(n) && n >= 0 && n <= 255)) {
    if (p[0] === 127 || p[0] === 10 || p[0] === 0) return false;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return false;
    if (p[0] === 192 && p[1] === 168) return false;
    if (p[0] === 169 && p[1] === 254) return false;
  }
  return true;
}

async function fetchWithTimeout(url: string, timeout = 90_000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ContentOptimizer/3.0)",
        Accept: "application/xml, text/xml, text/html, */*",
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export const onRequest: PagesFunction = async (context) => {
  const { request } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    let targetUrl: string | null = null;

    if (request.method === "GET") {
      const url = new URL(request.url);
      targetUrl = url.searchParams.get("url");
    } else if (request.method === "POST") {
      const body: Record<string, unknown> = await request.json();
      targetUrl = typeof body.url === "string" ? body.url : null;
    }

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing 'url' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!isPublicUrl(targetUrl)) {
      return new Response(
        JSON.stringify({ success: false, error: "URL must be a public HTTP/HTTPS address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const response = await fetchWithTimeout(targetUrl, 90_000);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ success: false, error: `Upstream returned ${response.status}: ${response.statusText}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contentType = response.headers.get("content-type") || "text/plain";
    const text = await response.text();

    return new Response(text, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isTimeout = message.includes("abort");
    return new Response(
      JSON.stringify({ success: false, error: isTimeout ? "Request timed out" : message }),
      { status: isTimeout ? 408 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
};
