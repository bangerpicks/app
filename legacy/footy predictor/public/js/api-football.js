/*
  API-FOOTBALL generic client — direct calls with domain-locked key
  Only GET is supported per provider policy.

  How it works now:
  - Add <meta name="api-sports-key" content="YOUR_KEY"> to your HTML (index.html, admin.html)
  - In API-SPORTS dashboard, lock the key to your domain(s)
  - The client sends the key in header x-apisports-key

  Example:
    import { af } from './api-football.js';
    const tz = await af.get('/timezone');
    const leagues = await af.get('/leagues', { season: 2024 });
*/

const API_BASE = 'https://v3.football.api-sports.io';

function getApiKey() {
  const meta = document.querySelector('meta[name="api-sports-key"]');
  const keyFromMeta = meta?.content?.trim();
  const keyFromGlobal = typeof window !== 'undefined' ? (window.API_SPORTS_KEY || '').trim() : '';
  return keyFromMeta || keyFromGlobal || '';
}

function buildUrl(path, params) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_BASE}${normalizedPath}`, API_BASE);
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) {
      v.forEach((item) => url.searchParams.append(k, String(item)));
    } else {
      url.searchParams.set(k, String(v));
    }
  });
  return url;
}

async function get(path, params) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing API-SPORTS key. Add <meta name="api-sports-key" content="..."> to the page or set window.API_SPORTS_KEY.');
  }
  
  const url = buildUrl(path.toLowerCase(), params);
  console.log('API Request:', {
    method: 'GET',
    url: url.toString(),
    path: path,
    params: params,
    apiKeyLength: apiKey.length,
    apiKeyPrefix: apiKey.substring(0, 8) + '...'
  });
  
  try {
    console.log('Making fetch request to:', url.toString());
    const res = await fetch(url.toString(), {
      method: 'GET',
      mode: 'cors',
      headers: {
        'x-apisports-key': apiKey,
        'accept': 'application/json',
      },
    });
    
    // Log response details for debugging
    console.log('API Response Status:', res.status);
    console.log('API Response Status Text:', res.statusText);
    console.log('API Response Headers:', Object.fromEntries(res.headers.entries()));
    console.log('API Response URL:', res.url);
    console.log('API Response OK:', res.ok);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('API error response body:', errorText);
      console.error('API error response status:', res.status);
      console.error('API error response headers:', Object.fromEntries(res.headers.entries()));
      
      // Try to parse error response as JSON for more details
      let errorData = null;
      try {
        errorData = JSON.parse(errorText);
        console.error('API error response parsed:', errorData);
      } catch (parseError) {
        console.error('Could not parse error response as JSON:', parseError);
      }
      
      // Provide more specific error messages
      if (res.status === 401) {
        throw new Error(`API authentication failed (401) - check API key validity and domain restrictions`);
      } else if (res.status === 403) {
        throw new Error(`API access forbidden (403) - check API key permissions and domain restrictions`);
      } else if (res.status === 429) {
        throw new Error(`API rate limit exceeded (429) - too many requests`);
      } else if (res.status === 500) {
        throw new Error(`API server error (500) - service temporarily unavailable`);
      } else {
        throw new Error(`API error ${res.status} for ${path}: ${errorText}`);
      }
    }
    
    const data = await res.json();
    console.log('API response data received, type:', typeof data);
    console.log('API response data keys:', data ? Object.keys(data) : 'No data');

    return data;
  } catch (error) {
    console.error('API call failed:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error cause:', error.cause);
    
    // Re-throw with more context
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error(`Network error - fetch failed. This might be a CORS issue or network problem: ${error.message}`);
    } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      throw new Error(`Network error - request failed. Check if the API endpoint is accessible: ${error.message}`);
    }
    
    throw error;
  }
}

export const af = { get };

