# Yeni proxy kodu - Kopyala yapıştır için
$newProxyCode = @'
// api/proxy.js - FIXED VERSION
export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { targetUrl, method, headers = {}, body } = req.body;

    console.log('🚀 Proxy Request:', { targetUrl, method });

    if (!targetUrl) {
      return res.status(400).json({ error: 'targetUrl required' });
    }

    // Fetch options
    const fetchOptions = {
      method: method || 'GET',
      headers: {
        ...headers,
        'Origin': 'https://www.hepsiburada.com',
        'Referer': 'https://www.hepsiburada.com/'
      }
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(targetUrl, fetchOptions);
    const responseBody = await response.text();
    
    // Response headers
    const responseHeaders = {};
    for (const [key, value] of response.headers.entries()) {
      if (['set-cookie', 'content-type', 'x-xsrf-token'].includes(key.toLowerCase())) {
        responseHeaders[key] = value;
      }
    }

    console.log('✅ Proxy Success:', { status: response.status });

    res.status(200).json({
      status: response.status,
      body: responseBody,
      headers: responseHeaders
    });

  } catch (error) {
    console.log('❌ Proxy Error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
'@

Write-Host $newProxyCode -ForegroundColor Cyan
