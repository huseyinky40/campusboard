const https = require('https');

const RSS_URL  = 'https://arel.edu.tr/feed/';
const CACHE_TTL = 15 * 60 * 1000;

let _cache    = null;
let _cacheTime = 0;

function fetchRaw(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 7000 }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchRaw(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => resolve(raw));
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

function extractOgImage(html) {
  const m = /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i.exec(html)
         || /<meta[^>]+content=["']([^"']+)["'][^>]*property=["']og:image["']/i.exec(html);
  return m ? m[1] : null;
}

async function fetchOgImage(url) {
  try {
    const html = await fetchRaw(url);
    return extractOgImage(html);
  } catch (_) {
    return null;
  }
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title   = (/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/.exec(block) ||
                     /<title>([\s\S]*?)<\/title>/.exec(block) || [])[1] || '';
    const link    = (/<link>([\s\S]*?)<\/link>/.exec(block) ||
                     /<guid[^>]*>([\s\S]*?)<\/guid>/.exec(block) || [])[1] || '';
    const pubDate = (/<pubDate>([\s\S]*?)<\/pubDate>/.exec(block) || [])[1] || '';
    let dateISO = null;
    if (pubDate) {
      try { dateISO = new Date(pubDate).toISOString(); } catch (_) {}
    }
    if (title && link) {
      items.push({ title: title.trim(), link: link.trim(), date: dateISO });
    }
  }
  return items;
}

async function getUniversityNews() {
  const now = Date.now();
  if (_cache && now - _cacheTime < CACHE_TTL) return _cache;

  const xml      = await fetchRaw(RSS_URL);
  const articles = parseRSS(xml).slice(0, 9);

  // Fetch og:image for each article in parallel
  const items = await Promise.all(
    articles.map(async article => ({
      ...article,
      image: await fetchOgImage(article.link),
    }))
  );

  _cache     = items;
  _cacheTime = now;
  return items;
}

module.exports = { getUniversityNews };
