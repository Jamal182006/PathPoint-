const backendBaseUrl = 'https://backend-cyan-eight-57.vercel.app/api';
const hopByHopHeaders = new Set([
  'connection',
  'content-length',
  // Node's fetch transparently decompresses upstream responses. Forwarding
  // the original encoding header would make the browser try to decompress twice.
  'content-encoding',
  'host',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

const readRequestBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
};

export default async function handler(request, response) {
  const requestUrl = new URL(request.url || '/', 'http://localhost');
  const apiPath = requestUrl.pathname.replace(/^\/api\/?/, '');
  const upstreamUrl = new URL(apiPath, `${backendBaseUrl}/`);
  upstreamUrl.search = requestUrl.search;

  const method = request.method || 'GET';
  const headers = new Headers(request.headers);
  for (const name of hopByHopHeaders) headers.delete(name);
  headers.delete('origin');

  try {
    const upstream = await fetch(upstreamUrl, {
      method,
      headers,
      body: ['GET', 'HEAD'].includes(method) ? undefined : await readRequestBody(request),
    });

    response.statusCode = upstream.status;
    for (const [name, value] of upstream.headers) {
      if (!hopByHopHeaders.has(name.toLowerCase())) response.setHeader(name, value);
    }

    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error('[API Proxy Error]:', error.message);
    response.statusCode = 502;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ success: false, message: 'API service is unavailable' }));
  }
}
