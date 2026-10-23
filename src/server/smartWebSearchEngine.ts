/**
 * smartWebSearchEngine.ts — محرك البحث الذكي واستخراج المحتوى والمقارنة لتيدكلت AI
 *
 * يدير:
 *  1) استخراج المحتوى الفعلي وتاريخ النشر من روابط الويب (بدون الاكتفاء بالعناوين)
 *  2) حفظ النتائج المرقمة في سياق الجلسة للأسئلة المتابعة («اشرح المصدر الثاني»، «قارن النتيجة الأولى بالثالثة»)
 *  3) البحث الاحتياطي عبر ويكيبيديا العربية/الفرنسية/الإنجليزية و DuckDuckGo عند تعذر البحث المباشر
 */
import type { SessionSearchSource } from './intentAndContextEngine.ts';

export interface EnrichedSearchResult extends SessionSearchSource {
  domain: string;
  reliability: 'high' | 'medium';
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
}

function stripHtmlToCleanText(html: string): {
  title: string;
  publishedDate?: string;
  text: string;
} {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : '';

  // Try to detect publication date from meta tags or time elements
  const dateMetaMatch =
    html.match(/(?:article:published_time|datePublished|pubdate|date)["'\s content=:]+["'](\d{4}-\d{2}-\d{2})/i) ||
    html.match(/<time[^>]*datetime=["'](\d{4}-\d{2}-\d{2})/i);
  const publishedDate = dateMetaMatch ? dateMetaMatch[1] : undefined;

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return {
    title,
    publishedDate,
    text: cleaned.slice(0, 2200),
  };
}

/**
 * يستخرج المحتوى الفعلي وتاريخ النشر لصفحة ويب بمهلة زمنية آمنة.
 */
export async function fetchAndExtractWebPage(
  url: string,
  timeoutMs = 3500
): Promise<{ title?: string; publishedDate?: string; extractedContent: string } | null> {
  if (!url || !/^https?:\/\//i.test(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TidikeltAI/2.0; +https://tidikelt.ai)',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
      },
    });
    if (!res.ok) return null;
    const raw = await res.text();
    const parsed = stripHtmlToCleanText(raw);
    if (!parsed.text || parsed.text.length < 40) return null;
    return {
      title: parsed.title || undefined,
      publishedDate: parsed.publishedDate,
      extractedContent: parsed.text,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * يبحث في ويكيبيديا (العربية أو الفرنسية أو الإنجليزية) كمصدر معرفي موثوق ومجاني.
 */
export async function searchWikipediaSources(
  query: string,
  lang: 'ar' | 'fr' | 'en' = 'ar',
  limit = 4
): Promise<EnrichedSearchResult[]> {
  const cleanQuery = String(query || '').trim();
  if (!cleanQuery) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const endpoint = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      cleanQuery
    )}&utf8=1&format=json&srlimit=${limit}`;
    const res = await fetch(endpoint, { signal: controller.signal });
    if (!res.ok) return [];
    const data = (await res.json()) as any;
    const items: any[] = data?.query?.search || [];
    return items.map((item, idx) => {
      const snippet = String(item.snippet || '')
        .replace(/<[^>]+>/g, '')
        .replace(/&quot;/g, '"')
        .trim();
      const pageUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(
        String(item.title || '').replace(/\s+/g, '_')
      )}`;
      const pubDate = item.timestamp ? String(item.timestamp).slice(0, 10) : undefined;
      return {
        index: idx + 1,
        title: String(item.title || `مصدر ${idx + 1}`),
        url: pageUrl,
        snippet,
        extractedContent: snippet,
        publishedDate: pubDate,
        domain: `${lang}.wikipedia.org`,
        reliability: 'high',
      };
    });
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * يثري قائمة المصادر باستخراج محتوى الصفحة الفعلي وتاريخ النشر لأهم المصادر.
 */
export async function enrichSearchSourcesWithPageContent(
  rawSources: Array<{ title: string; url: string; snippet?: string; publishedDate?: string }>
): Promise<EnrichedSearchResult[]> {
  const enriched: EnrichedSearchResult[] = [];
  const topSources = rawSources.slice(0, 6);

  await Promise.all(
    topSources.map(async (src, idx) => {
      let extractedContent = src.snippet || '';
      let publishedDate = src.publishedDate;
      let title = src.title || `مصدر ${idx + 1}`;

      if (!extractedContent || extractedContent.length < 120) {
        const fetched = await fetchAndExtractWebPage(src.url, 3000);
        if (fetched) {
          extractedContent = fetched.extractedContent || extractedContent;
          publishedDate = publishedDate || fetched.publishedDate;
          if (!src.title && fetched.title) title = fetched.title;
        }
      }

      const domain = extractDomain(src.url);
      const isHighReliability =
        /wikipedia\.org|\.gov|\.edu|\.dz|aps\.dz|aljazeera|bbc|reuters|unesco/i.test(domain);

      enriched[idx] = {
        index: idx + 1,
        title,
        url: src.url,
        snippet: (src.snippet || extractedContent).slice(0, 320),
        extractedContent: (extractedContent || src.snippet || title).slice(0, 1800),
        publishedDate,
        domain,
        reliability: isHighReliability ? 'high' : 'medium',
      };
    })
  );

  return enriched.filter(Boolean);
}

/**
 * يبني ملخصاً منظماً أو مقارنة مباشرة عندما يطلب المستخدم:
 * - «اشرح المصدر الثاني»
 * - «قارن بين النتيجة الأولى والثالثة»
 */
export function buildSessionSourceFollowUpContext(
  sources: SessionSearchSource[],
  referencedIndices: number[],
  isComparison: boolean
): string {
  if (!sources || sources.length === 0) return '';
  const selected =
    referencedIndices.length > 0
      ? referencedIndices
          .map((idx) => sources.find((s) => s.index === idx) || sources[idx - 1])
          .filter((s): s is SessionSearchSource => Boolean(s))
      : sources.slice(0, 3);

  if (selected.length === 0) return '';

  const formattedSources = selected
    .map(
      (s) =>
        `[المصدر #${s.index}] العنوان: ${s.title}\nالرابط: ${s.url}\nتاريخ النشر: ${
          s.publishedDate || 'غير محدد'
        }\nالمحتوى المستخرج: ${s.extractedContent || s.snippet}`
    )
    .join('\n\n---\n\n');

  if (isComparison && selected.length >= 2) {
    return `[توجيه مقارنة المصادر]:
طلب المستخدم مقارنة مباشرة بين المصادر المحددة أعلاه (${selected.map((s) => `#${s.index}`).join(' و ')}).
قدم مقارنة منظمة تشمل:
1. أوجه الاتفاق والتشابه
2. أوجه الاختلاف والتباين
3. جدول مقارنة واضح بالمعايير الأساسية
4. خلاصة تحليلية مع ذكر روابط المصادر وتواريخها.

المصادر المرجعية:\n${formattedSources}`;
  }

  return `[المصادر المرجعية المطلوبة من البحث السابق]:\n${formattedSources}\n\nاشرح وحلل هذا المصدر بوضوح وعمق مع الاستشهاد ببياناته ورابطه.`;
}

function decodeHtmlEntities(str: string): string {
  return String(str || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * يجلب بيانات الطقس الحية من Open-Meteo للمدن الجزائرية والعالمية عند السؤال عن الطقس أو الحرارة أو الرياح.
 */
async function fetchLiveWeatherSource(
  query: string,
  timeoutMs = 3500
): Promise<{ title: string; url: string; snippet: string; publishedDate?: string } | null> {
  if (!/طقس|جو|حرارة|رياح|أمطار|عجاج|أحوال الجو|weather|meteo|météo|temperature/i.test(query)) {
    return null;
  }

  const cities: Array<{ pattern: RegExp; nameAr: string; lat: number; lon: number }> = [
    { pattern: /تمنراست|tamanrasset/i, nameAr: 'تمنراست', lat: 22.785, lon: 5.5228 },
    { pattern: /أدرار|ادرار|adrar/i, nameAr: 'أدرار', lat: 27.8742, lon: -0.2939 },
    { pattern: /المنيعة|el menia/i, nameAr: 'المنيعة', lat: 30.5833, lon: 2.8833 },
    { pattern: /ورقلة|ouargla/i, nameAr: 'ورقلة', lat: 31.9493, lon: 5.325 },
    { pattern: /غرداية|ghardaia/i, nameAr: 'غرداية', lat: 32.4909, lon: 3.6735 },
    { pattern: /بشار|bechar/i, nameAr: 'بشار', lat: 31.6167, lon: -2.2167 },
    { pattern: /وهران|oran/i, nameAr: 'وهران', lat: 35.6971, lon: -0.6308 },
    { pattern: /قسنطينة|constantine/i, nameAr: 'قسنطينة', lat: 36.365, lon: 6.6147 },
    { pattern: /الجزائر العاصمة|العاصمة|algiers|alger/i, nameAr: 'الجزائر العاصمة', lat: 36.7538, lon: 3.0588 },
    { pattern: /عين صالح|إن صالح|ان صالح|تيديكلت|تديكلت|in salah|ain salah/i, nameAr: 'عين صالح (تيديكلت)', lat: 27.1935, lon: 2.4822 },
  ];

  const matchedCity = cities.find((c) => c.pattern.test(query)) || cities[cities.length - 1];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${matchedCity.lat}&longitude=${matchedCity.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=Africa%2FAlgiers&forecast_days=1`;
    const res = await fetch(apiUrl, { signal: controller.signal });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const cur = data?.current;
    if (!cur || typeof cur.temperature_2m !== 'number') return null;

    const maxT = data?.daily?.temperature_2m_max?.[0];
    const minT = data?.daily?.temperature_2m_min?.[0];
    const tempStr = `${cur.temperature_2m}°C`;
    const windStr = typeof cur.wind_speed_10m === 'number' ? `${cur.wind_speed_10m} كم/سا` : 'معتدلة';
    const humStr = typeof cur.relative_humidity_2m === 'number' ? `${cur.relative_humidity_2m}%` : '';
    const rangeStr =
      typeof maxT === 'number' && typeof minT === 'number'
        ? ` (العظمى اليوم: ${maxT}°C، الصغرى: ${minT}°C)`
        : '';
    const todayIso = new Date().toISOString().slice(0, 10);

    return {
      title: `الأرصاد الجوية الحية (Open-Meteo) — طقس ${matchedCity.nameAr} المباشر`,
      url: `https://open-meteo.com/en/docs#latitude=${matchedCity.lat}&longitude=${matchedCity.lon}`,
      snippet: `بيانات الرصد الجوي المباشر في ${matchedCity.nameAr} الآن (${todayIso}): درجة الحرارة الحالية ${tempStr}${rangeStr}، سرعة الرياح ${windStr}${humStr ? `، الرطوبة النسبية ${humStr}` : ''}.`,
      publishedDate: todayIso,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * يبحث في Google News RSS للحصول على أحدث الأخبار والمستجدات الحية باللغتين العربية والإنجليزية.
 */
async function searchGoogleNewsRss(
  query: string,
  timeoutMs = 3800,
  limit = 4
): Promise<Array<{ title: string; url: string; snippet: string; publishedDate?: string }>> {
  const clean = String(query || '').trim();
  if (!clean) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const isLatin = /^[a-zA-Z0-9\s.,?!'"-]+$/.test(clean);
    const rssUrl = isLatin
      ? `https://news.google.com/rss/search?q=${encodeURIComponent(clean)}&hl=en&gl=US&ceid=US:en`
      : `https://news.google.com/rss/search?q=${encodeURIComponent(clean)}&hl=ar&gl=DZ&ceid=DZ:ar`;

    const res = await fetch(rssUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TidikeltAI/2.0)',
      },
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, limit);

    const results: Array<{ title: string; url: string; snippet: string; publishedDate?: string }> = [];
    for (const m of itemMatches) {
      const block = m[1];
      const rawTitle = block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '';
      const rawLink = block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '';
      const rawDesc = block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || '';
      const rawPubDate = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || '';
      const rawSource = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || '';

      const title = decodeHtmlEntities(rawTitle);
      const url = decodeHtmlEntities(rawLink);
      const desc = decodeHtmlEntities(rawDesc);
      const sourceName = decodeHtmlEntities(rawSource);
      let pubIso: string | undefined;
      if (rawPubDate) {
        const d = new Date(rawPubDate.trim());
        if (!Number.isNaN(d.getTime())) {
          pubIso = d.toISOString().slice(0, 10);
        }
      }

      if (title && /^https?:\/\//i.test(url)) {
        results.push({
          title: sourceName && !title.includes(sourceName) ? `${title} — ${sourceName}` : title,
          url,
          snippet: `${pubIso ? `[تاريخ النشر: ${pubIso}] ` : ''}${desc || title}`.slice(0, 340),
          publishedDate: pubIso,
        });
      }
    }
    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * يبحث في DuckDuckGo HTML لاسترجاع صفحات ويب حية ومباشرة مع روابطها الحقيقية.
 */
async function searchDuckDuckGoHtml(
  query: string,
  timeoutMs = 3800,
  limit = 4
): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const clean = String(query || '').trim();
  if (!clean) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(clean)}`;
    const res = await fetch(ddgUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!res.ok) return [];
    const html = await res.text();

    const results: Array<{ title: string; url: string; snippet: string }> = [];
    const anchorRegex = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;

    const anchors = [...html.matchAll(anchorRegex)];
    const snippets = [...html.matchAll(snippetRegex)];

    for (let i = 0; i < Math.min(anchors.length, limit); i++) {
      let rawHref = anchors[i][1] || '';
      const rawTitle = anchors[i][2] || '';
      const rawSnippet = snippets[i]?.[1] || '';

      const uddgMatch = rawHref.match(/[?&]uddg=([^&]+)/i);
      if (uddgMatch) {
        try {
          rawHref = decodeURIComponent(uddgMatch[1]);
        } catch {
          // keep rawHref
        }
      } else if (rawHref.startsWith('//')) {
        rawHref = `https:${rawHref}`;
      }

      const title = decodeHtmlEntities(rawTitle);
      const snippet = decodeHtmlEntities(rawSnippet) || title;

      if (title && /^https?:\/\//i.test(rawHref) && !rawHref.includes('duckduckgo.com/y.js')) {
        results.push({
          title,
          url: rawHref,
          snippet: snippet.slice(0, 340),
        });
      }
    }

    return results;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * ينفذ بحث ويب حي فعلي عبر مصادر متعددة (Open-Meteo للطقس، Google News RSS للأخبار الحديثة،
 * DuckDuckGo HTML للويب المباشر، وويكيبيديا للمعرفة الموثقة) مع إزالة التكرار وضمان روابط حقيقية.
 */
export async function searchLiveWebSources(
  query: string,
  timeoutMs = 4500
): Promise<Array<{ title: string; url: string; snippet: string; publishedDate?: string }>> {
  const clean = String(query || '').trim();
  if (!clean) return [];

  const [weatherRes, newsRes, ddgRes, wikiArRes] = await Promise.allSettled([
    fetchLiveWeatherSource(clean, Math.min(timeoutMs, 3500)),
    searchGoogleNewsRss(clean, Math.min(timeoutMs, 4000), 4),
    searchDuckDuckGoHtml(clean, Math.min(timeoutMs, 4000), 4),
    searchWikipediaSources(clean, 'ar', 3),
  ]);

  const combined: Array<{ title: string; url: string; snippet: string; publishedDate?: string }> = [];
  const seenUrls = new Set<string>();

  const pushUnique = (item: { title: string; url: string; snippet: string; publishedDate?: string } | null | undefined) => {
    if (!item || !item.title || !item.url || !/^https?:\/\//i.test(item.url)) return;
    const key = item.url.toLowerCase();
    if (seenUrls.has(key)) return;
    seenUrls.add(key);
    combined.push(item);
  };

  if (weatherRes.status === 'fulfilled' && weatherRes.value) {
    pushUnique(weatherRes.value);
  }
  if (newsRes.status === 'fulfilled') {
    for (const item of newsRes.value) pushUnique(item);
  }
  if (ddgRes.status === 'fulfilled') {
    for (const item of ddgRes.value) pushUnique(item);
  }
  if (wikiArRes.status === 'fulfilled') {
    for (const item of wikiArRes.value) {
      pushUnique({
        title: `ويكيبيديا: ${item.title}`,
        url: item.url,
        snippet: item.snippet,
        publishedDate: item.publishedDate,
      });
    }
  }

  return combined.slice(0, 6);
}

