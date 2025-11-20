// api/proxy.js
export default async function handler(req, res) {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400'
  };

  // Bloklanan header'lar
  const BLOCKED_HEADERS = [
    'host', 'x-forwarded-for', 'x-real-ip', 'x-vercel-id',
    'x-vercel-deployment-url', 'x-vercel-forwarded-for',
    'x-vercel-ip-country', 'x-vercel-ip-city', 'cf-connecting-ip',
    'cf-ray', 'cf-ipcountry', 'cf-visitor', 'cf-request-id'
  ];

  // İzin verilen header'lar
  const ALLOWED_HEADERS = [
    'user-agent', 'accept', 'accept-language', 'accept-encoding',
    'content-type', 'cookie', 'x-xsrf-token', 'referer', 'origin',
    'cache-control', 'sec-ch-ua', 'sec-ch-ua-mobile', 'sec-ch-ua-platform',
    'sec-fetch-dest', 'sec-fetch-mode', 'sec-fetch-site', 'sec-fetch-user',
    'app-key', 'priority', 'authorization', 'viewport-width'
  ];

  // İzin verilen domain'ler
  const ALLOWED_DOMAINS = [
    'hepsiburada.com',
    'oauth.hepsiburada.com', 
    'giris.hepsiburada.com',
    'www.hepsiburada.com'
  ];

  console.log('🚀 Vercel Proxy Başlatıldı');

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Sadece POST methodu' });
  }

  try {
    const requestData = req.body;
    
    console.log('🎯 İstek Alındı:', {
      url: requestData.targetUrl,
      method: requestData.method
    });

    if (!requestData.targetUrl) {
      return res.status(400).json({ error: 'targetUrl zorunlu' });
    }

    const { targetUrl, method = 'GET', headers = {}, body = null } = requestData;

    // Domain kontrolü
    let targetDomain;
    try {
      targetDomain = new URL(targetUrl).hostname;
      const isAllowed = ALLOWED_DOMAINS.some(domain => targetDomain.endsWith(domain));
      if (!isAllowed) {
        throw new Error(`Domain not allowed: ${targetDomain}`);
      }
    } catch (urlError) {
      return res.status(400).json({ error: 'Geçersiz URL' });
    }

    // Header filtreleme
    const cleanHeaders = {};
    Object.keys(headers).forEach(key => {
      const lowerKey = key.toLowerCase();
      
      if (BLOCKED_HEADERS.includes(lowerKey)) {
        console.log(`🚫 Bloklanan header: ${key}`);
        return;
      }
      
      if (ALLOWED_HEADERS.includes(lowerKey)) {
        cleanHeaders[key] = headers[key];
      }
    });

    console.log(`🔍 ${Object.keys(cleanHeaders).length} header filtrelendi`);

    // Fetch options
    const fetchOptions = {
      method: method.toUpperCase(),
      headers: cleanHeaders,
      redirect: 'manual'
    };

    if (body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) {
      fetchOptions.body = body;
    }

    // Timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout after 30s')), 30000);
    });

    const fetchPromise = fetch(targetUrl, fetchOptions);
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    // Response header'larını filtrele
    const responseHeaders = {};
    const setCookieHeaders = [];
    
    for (const [key, value] of response.headers.entries()) {
      if (BLOCKED_HEADERS.includes(key.toLowerCase()) || 
          key.startsWith('cf-') || 
          key.startsWith('x-vercel')) {
        continue;
      }
      
      responseHeaders[key] = value;
      
      if (key.toLowerCase() === 'set-cookie') {
        setCookieHeaders.push(value);
      }
    }

    const responseBody = await response.text();
    
    console.log('✅ Response Alındı:', {
      status: response.status,
      bodyLength: responseBody.length,
      headers: Object.keys(responseHeaders).length,
      cookies: setCookieHeaders.length
    });

    if (setCookieHeaders.length > 0) {
      responseHeaders['set-cookie'] = setCookieHeaders;
    }

    // CORS headers ile response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    
    return res.status(200).json({
      status: response.status,
      headers: responseHeaders,
      body: responseBody
    });

  } catch (error) {
    console.log('❌ Hata:', error.message);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ 
      error: error.message
    });
  }
}
