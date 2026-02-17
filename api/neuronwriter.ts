import type { VercelRequest, VercelResponse } from '@vercel/node';

const NEURON_API_BASE = "https://app.neuronwriter.com/neuron-api/0.5/writer";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-NeuronWriter-Key, X-API-KEY",
};

interface ProxyRequest {
  endpoint: string;
  method?: string;
  apiKey: string;
  body?: Record<string, unknown>;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    const { endpoint, method = "POST", apiKey, body: requestBody } = req.body as ProxyRequest;
    const apiKeyFromHeader = (req.headers["x-neuronwriter-key"] || req.headers["x-api-key"]) as string | undefined;
    const finalApiKey = apiKey || apiKeyFromHeader;

    if (!endpoint) {
      return res.status(400).json({ success: false, error: "Missing endpoint" });
    }

    if (!finalApiKey || finalApiKey.trim().length < 5) {
      return res.status(400).json({ success: false, error: "Missing or invalid API key" });
    }

    const cleanApiKey = finalApiKey.trim();
    const url = `${NEURON_API_BASE}${endpoint}`;

    let timeoutMs = 30000;
    if (endpoint === "/new-query") timeoutMs = 55000;
    else if (endpoint === "/get-query") timeoutMs = 25000;
    else if (endpoint === "/list-projects" || endpoint === "/list-queries") timeoutMs = 20000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        "X-API-KEY": cleanApiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      signal: controller.signal,
    };

    if (requestBody && (method === "POST" || method === "PUT")) {
      fetchOptions.body = JSON.stringify(requestBody);
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    const responseText = await response.text();
    let responseData: unknown;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText.substring(0, 500) };
    }

    // Return actual status from NeuronWriter, not always 200
    const proxyStatus = response.ok ? 200 : response.status;

    return res.status(proxyStatus).json({
      success: response.ok,
      status: response.status,
      data: responseData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const isTimeout = message.includes("abort") || message.includes("timeout");

    // Return proper HTTP status codes so monitoring/logging can detect failures
    const statusCode = isTimeout ? 408 : 502;

    return res.status(statusCode).json({
      success: false,
      status: statusCode,
      error: isTimeout
        ? "Request timed out. The NeuronWriter API may be slow - try again."
        : message,
      type: isTimeout ? "timeout" : "network_error",
    });
  }
}
