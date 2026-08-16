// Utilitaires partagés de L'Antre.
// Aucune de ces fonctions ne touche au réseau : elles sont testables hors ligne.

// ---------------------------------------------------------------------------
// Texte
// ---------------------------------------------------------------------------

/** Minuscules sans accents, pour des comparaisons robustes. */
function normalizeText(value) {
  if (!value) return '';
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Convertit du HTML (Mastodon renvoie du HTML) en texte brut. */
function htmlToText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Teste la présence d'un mot entier (et non d'un fragment).
 * Évite le bug historique où « pro » éliminait « je propose ».
 */
function containsWord(haystack, needle) {
  const text = normalizeText(haystack);
  const word = normalizeText(needle).trim();
  if (!text || !word) return false;
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // \b ne fonctionne pas avec les mots composés/accentués : on borne à la main.
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text);
}

/** Hash déterministe (FNV-1a 32 bits) pour identifier un résultat. */
function hashString(value) {
  let hash = 0x811c9dc5;
  const text = String(value || '');
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

// ---------------------------------------------------------------------------
// Géométrie
// ---------------------------------------------------------------------------

/** Distance orthodromique en kilomètres entre deux points GPS. */
function haversineKm(lat1, lon1, lat2, lon2) {
  if ([lat1, lon1, lat2, lon2].some(v => typeof v !== 'number' || Number.isNaN(v))) {
    return null;
  }
  const R = 6371;
  const toRad = deg => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

/**
 * Déduplique une liste de résultats.
 * Deux annonces sont considérées identiques si elles pointent la même URL,
 * ou si le même auteur a publié un texte identique (cross-post fédéré).
 */
function dedupeResults(results) {
  const seen = new Set();
  const output = [];
  for (const result of results) {
    if (!result) continue;
    const urlKey = result.url ? `u:${normalizeText(result.url)}` : null;
    const textKey = `t:${normalizeText(result.author)}|${hashString(
      normalizeText(result.text).slice(0, 400)
    )}`;
    if ((urlKey && seen.has(urlKey)) || seen.has(textKey)) continue;
    if (urlKey) seen.add(urlKey);
    seen.add(textKey);
    output.push(result);
  }
  return output;
}

// ---------------------------------------------------------------------------
// Liens
// ---------------------------------------------------------------------------

/** N'autorise que http/https : bloque javascript: et data: dans les liens. */
function safeUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(String(url), 'https://example.invalid');
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    if (parsed.hostname === 'example.invalid') return null;
    return parsed.href;
  } catch (error) {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

/** « il y a 3 h », « il y a 5 j »… à partir d'une date ISO. */
function relativeTime(isoDate, now = Date.now()) {
  if (!isoDate) return null;
  const timestamp = new Date(isoDate).getTime();
  if (Number.isNaN(timestamp)) return null;
  const minutes = Math.round((now - timestamp) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 31) return `il y a ${days} j`;
  const months = Math.round(days / 30);
  return `il y a ${months} mois`;
}

// ---------------------------------------------------------------------------
// Réseau
// ---------------------------------------------------------------------------

/** fetch avec délai maximum : une source lente ne bloque pas les autres. */
async function fetchWithTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** fetch + JSON, avec message d'erreur exploitable en cas d'échec. */
async function fetchJson(url, options = {}, timeoutMs = 15000) {
  const response = await fetchWithTimeout(url, options, timeoutMs);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error('Réponse illisible (ce n’est pas du JSON)');
  }
}

const UTIL = {
  normalizeText,
  htmlToText,
  containsWord,
  hashString,
  haversineKm,
  dedupeResults,
  safeUrl,
  relativeTime,
  fetchWithTimeout,
  fetchJson
};

if (typeof window !== 'undefined') window.UTIL = UTIL;
if (typeof module !== 'undefined') module.exports = UTIL;
