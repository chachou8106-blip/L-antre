// Harnais de test de L'Antre — Node, sans dépendance.
//   node tests/run-tests.js
//
// Les scripts du navigateur sont chargés tels quels dans un contexte VM avec
// des stubs minimalistes (window, localStorage, fetch). Le réseau est simulé
// par des charges utiles copiées sur le format réel de chaque API, ce qui
// permet de valider toute la chaîne : parsing → dédoublonnage → localisation
// → distance → filtrage → tri.

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const SCRIPTS = [
  'scripts/config.js',
  'scripts/cities.js',
  'scripts/util.js',
  'scripts/filters.js',
  'scripts/geo.js',
  'scripts/sources/base.js',
  'scripts/sources/reddit.js',
  'scripts/sources/bluesky.js',
  'scripts/sources/lemmy.js',
  'scripts/sources/mastodon.js',
  'scripts/search.js'
];

// ---------------------------------------------------------------------------
// Environnement simulé
// ---------------------------------------------------------------------------

function makeLocalStorage() {
  const store = new Map();
  return {
    getItem: key => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: key => store.delete(key),
    clear: () => store.clear()
  };
}

const fetchRoutes = [];

/** Enregistre une réponse simulée pour toute URL contenant `pattern`. */
function route(pattern, handler) {
  fetchRoutes.push({ pattern, handler });
}

function resetRoutes() {
  fetchRoutes.length = 0;
}

async function stubFetch(url) {
  const target = String(url);
  for (const entry of fetchRoutes) {
    if (target.includes(entry.pattern)) {
      const outcome = await entry.handler(target);
      if (outcome instanceof Error) throw outcome;
      return {
        ok: outcome.status ? outcome.status < 400 : true,
        status: outcome.status || 200,
        text: async () => JSON.stringify(outcome.body)
      };
    }
  }
  throw new Error(`Aucune route simulée pour ${target}`);
}

const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  Date,
  Math,
  JSON,
  URL,
  URLSearchParams,
  AbortController,
  Promise,
  Error,
  Set,
  Map,
  Number,
  parseInt,
  parseFloat,
  RegExp,
  Array,
  Object,
  String,
  localStorage: makeLocalStorage(),
  fetch: stubFetch,
  navigator: {}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
for (const file of SCRIPTS) {
  const code = fs.readFileSync(path.join(ROOT, file), 'utf8');
  vm.runInContext(code, sandbox, { filename: file });
}

const { UTIL, FILTERS, GEO, SEARCH, SOURCE_REDDIT, SOURCE_BLUESKY, SOURCE_LEMMY,
        SOURCE_MASTODON, CONFIG } = sandbox;

// ---------------------------------------------------------------------------
// Micro-runner
// ---------------------------------------------------------------------------

const tests = [];
let passed = 0;
const failures = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function run() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      passed += 1;
      console.log(`  ok   ${name}`);
    } catch (error) {
      failures.push({ name, error });
      console.log(`  FAIL ${name}`);
      console.log(`       ${error.message}`);
    }
  }
  console.log(`\n${passed}/${tests.length} tests réussis`);
  if (failures.length) process.exit(1);
}

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------

test('containsWord ne confond pas un fragment avec un mot', () => {
  assert.strictEqual(UTIL.containsWord('je propose une soirée', 'pro'), false);
  assert.strictEqual(UTIL.containsWord('mes tarifs sont fixes', 'tarif'), false);
  assert.strictEqual(UTIL.containsWord('mon tarif est fixe', 'tarif'), true);
  assert.strictEqual(UTIL.containsWord('je suis Pro du BDSM', 'pro'), true);
});

test('containsWord ignore les accents et la casse', () => {
  assert.strictEqual(UTIL.containsWord('Cherche une Tatouée sympa', 'tatouee'), true);
  assert.strictEqual(UTIL.containsWord('ECHANGISME entre couples', 'echangisme'), true);
});

test('haversineKm donne une distance réelle', () => {
  const parisLyon = UTIL.haversineKm(48.86, 2.35, 45.76, 4.84);
  assert.ok(parisLyon > 380 && parisLyon < 400, `Paris-Lyon = ${parisLyon} km`);
  assert.strictEqual(UTIL.haversineKm(48.86, 2.35, 48.86, 2.35), 0);
  assert.strictEqual(UTIL.haversineKm(null, 2.35, 45.76, 4.84), null);
});

test('safeUrl bloque les schémas dangereux', () => {
  assert.strictEqual(UTIL.safeUrl('javascript:alert(1)'), null);
  assert.strictEqual(UTIL.safeUrl('data:text/html,<script>'), null);
  assert.strictEqual(UTIL.safeUrl('https://bsky.app/profile/x'), 'https://bsky.app/profile/x');
});

test('dedupeResults élimine URL identiques et reposts fédérés', () => {
  const input = [
    { url: 'https://a.test/1', author: 'ana', text: 'bonjour tout le monde' },
    { url: 'https://a.test/1', author: 'ana', text: 'bonjour tout le monde' },
    { url: 'https://b.test/2', author: 'ana', text: 'bonjour tout le monde' },
    { url: 'https://c.test/3', author: 'bob', text: 'un autre message ici' }
  ];
  const output = UTIL.dedupeResults(input);
  assert.strictEqual(output.length, 2);
});

// ---------------------------------------------------------------------------
// Lecture des annonces
// ---------------------------------------------------------------------------

test('parseMeta lit les conventions r4r', () => {
  const a = FILTERS.parseMeta('[25M4F] [Paris] Cherche une partenaire');
  assert.strictEqual(a.age, 25);
  assert.strictEqual(a.gender, 'Homme');
  assert.strictEqual(a.seeking, 'Femme');

  const b = FILTERS.parseMeta('[F4M] Dominatrice sur Lyon, 32 ans');
  assert.strictEqual(b.gender, 'Femme');
  assert.strictEqual(b.seeking, 'Homme');
  assert.strictEqual(b.role, 'Dominatrice');

  const c = FILTERS.parseMeta('Soumis 41 ans région de Nantes');
  assert.strictEqual(c.age, 41);
  assert.strictEqual(c.role, 'Soumis');
});

test('looksProfessional repère le commercial sans faux positif', () => {
  assert.strictEqual(FILTERS.looksProfessional('Tarif 80€ la séance'), true);
  assert.strictEqual(FILTERS.looksProfessional('Rejoins mon OnlyFans'), true);
  assert.strictEqual(FILTERS.looksProfessional('Je propose une soirée sympa'), false);
  assert.strictEqual(FILTERS.looksProfessional('Couple proche de Lille'), false);
});

// ---------------------------------------------------------------------------
// Géographie
// ---------------------------------------------------------------------------

test('lookupLocal résout villes, départements et régions', () => {
  assert.strictEqual(GEO.lookupLocal('Paris').name, 'Paris');
  assert.strictEqual(GEO.lookupLocal('MARSEILLE').name, 'Marseille');
  // Un numéro de département garde son libellé mais porte les coordonnées
  // de son chef-lieu.
  const dept = GEO.lookupLocal('69');
  assert.strictEqual(dept.name, 'Dépt 69');
  assert.strictEqual(dept.precision, 'departement');
  assert.strictEqual(UTIL.haversineKm(dept.lat, dept.lon, 45.76, 4.84), 0);
  assert.strictEqual(GEO.lookupLocal('IDF').precision, 'region');
  assert.strictEqual(GEO.lookupLocal('Neverland'), null);
});

test('extractPlaceCandidates ignore les codes 25M4F', () => {
  const found = GEO.extractPlaceCandidates('[25M4F] [Bordeaux] cherche quelqu’un');
  assert.ok(found.includes('Bordeaux'), `candidats: ${found.join(', ')}`);
  assert.ok(!found.includes('25M4F'));
});

test('extractPlaceCandidates trouve une ville citée dans le corps du texte', () => {
  const found = GEO.extractPlaceCandidates('Salut, je vis près de Toulouse et je cherche.');
  assert.ok(found.some(c => c.toLowerCase() === 'toulouse'), found.join(', '));
});

// ---------------------------------------------------------------------------
// Normalisation par source (charges utiles au format réel des APIs)
// ---------------------------------------------------------------------------

test('Reddit : normalisation d’un post', () => {
  const result = SOURCE_REDDIT.normalize({
    data: {
      subreddit: 'r4r',
      author: 'someone_42',
      title: '[28F4M] [Lille] Cherche un partenaire',
      selftext: 'Bonjour, je cherche quelqu’un de sérieux pour du bdsm soft.',
      permalink: '/r/r4r/comments/abc/xyz/',
      created_utc: 1755000000,
      over_18: true,
      thumbnail: 'self'
    }
  });
  assert.strictEqual(result.source, 'reddit');
  assert.strictEqual(result.author, 'someone_42');
  assert.strictEqual(result.url, 'https://www.reddit.com/r/r4r/comments/abc/xyz/');
  assert.strictEqual(result.authorUrl, 'https://www.reddit.com/user/someone_42');
  assert.strictEqual(result.image, null);
  assert.strictEqual(result.meta.age, 28);
  assert.strictEqual(result.nsfw, true);
});

test('Reddit : les posts épinglés sont ignorés', () => {
  assert.strictEqual(SOURCE_REDDIT.normalize({ data: { stickied: true, title: 'Règles' } }), null);
});

test('Bluesky : construction du lien de post', () => {
  const result = SOURCE_BLUESKY.normalize({
    uri: 'at://did:plc:abc123/app.bsky.feed.post/3kxyz',
    author: { handle: 'quelquun.bsky.social', displayName: 'Quelqu’un' },
    record: { text: 'Cherche rencontre sur Nantes', createdAt: '2026-08-10T10:00:00Z' },
    embed: { images: [{ thumb: 'https://cdn.bsky.app/img/1.jpg' }] }
  });
  assert.strictEqual(result.url, 'https://bsky.app/profile/quelquun.bsky.social/post/3kxyz');
  assert.strictEqual(result.authorUrl, 'https://bsky.app/profile/quelquun.bsky.social');
  assert.strictEqual(result.image, 'https://cdn.bsky.app/img/1.jpg');
});

test('Lemmy : normalisation d’une vue de post', () => {
  const result = SOURCE_LEMMY.normalize({
    post: {
      id: 12,
      name: 'Rencontre à Rennes',
      body: 'Description complète de l’annonce.',
      ap_id: 'https://lemmy.world/post/12',
      published: '2026-08-12T08:00:00',
      nsfw: false
    },
    creator: { name: 'utilisateur', actor_id: 'https://lemmy.world/u/utilisateur' },
    community: { name: 'personals' }
  }, 'https://lemmy.world');
  assert.strictEqual(result.url, 'https://lemmy.world/post/12');
  assert.strictEqual(result.sourceLabel, 'Lemmy · c/personals');
  assert.ok(result.createdAt.startsWith('2026-08-12'));
});

test('Mastodon : le HTML est converti en texte brut', () => {
  const result = SOURCE_MASTODON.normalize({
    id: '1',
    url: 'https://mastodon.social/@x/1',
    created_at: '2026-08-14T12:00:00.000Z',
    content: '<p>Bonjour <b>Grenoble</b><br>cherche quelqu’un</p>',
    account: { acct: 'x', display_name: 'X', url: 'https://mastodon.social/@x' },
    media_attachments: [],
    sensitive: true
  }, 'https://mastodon.social');
  assert.ok(!result.text.includes('<'), result.text);
  assert.ok(result.text.includes('Grenoble'));
  assert.strictEqual(result.nsfw, true);
});

test('les balises d’une annonce ne survivent pas telles quelles', () => {
  const result = SOURCE_MASTODON.normalize({
    content: '<p>coucou<script>alert(1)</script></p>',
    account: { acct: 'y', url: 'https://mastodon.social/@y' },
    url: 'https://mastodon.social/@y/2',
    created_at: '2026-08-14T12:00:00.000Z',
    media_attachments: []
  }, 'https://mastodon.social');
  assert.ok(!result.text.includes('<script'), result.text);
});

// ---------------------------------------------------------------------------
// Filtrage
// ---------------------------------------------------------------------------

function baseState(overrides = {}) {
  return Object.assign(JSON.parse(JSON.stringify(FILTERS.filters)), overrides);
}

function fakeResult(overrides = {}) {
  const result = Object.assign({
    title: '[30F4M] [Lyon] Cherche partenaire',
    text: 'Femme de 30 ans à Lyon, je cherche quelqu’un pour du bdsm doux et régulier.',
    createdAt: new Date().toISOString(),
    distanceKm: 5,
    place: { name: 'Lyon', lat: 45.76, lon: 4.84 },
    matchedKeywords: [],
    nsfw: false
  }, overrides);
  result.meta = FILTERS.parseMeta(`${result.title} ${result.text}`);
  return result;
}

test('une annonce hors rayon est écartée', () => {
  const verdict = FILTERS.evaluate(fakeResult({ distanceKm: 400 }), baseState({ radiusKm: 50 }));
  assert.strictEqual(verdict.ok, false);
  assert.strictEqual(verdict.rejected, 'hors rayon');
});

test('une annonce non localisée est écartée si onlyLocated', () => {
  const result = fakeResult({ distanceKm: null, place: null });
  assert.strictEqual(FILTERS.evaluate(result, baseState({ onlyLocated: true })).rejected,
    'lieu non identifié');
  assert.strictEqual(FILTERS.evaluate(result, baseState({ onlyLocated: false })).ok, true);
});

test('mode souple : un mot-clé sur deux suffit, mode strict non', () => {
  const state = baseState({ keywords: ['bdsm', 'bondage'] });
  assert.strictEqual(FILTERS.evaluate(fakeResult(), state).ok, true);
  assert.strictEqual(
    FILTERS.evaluate(fakeResult(), baseState({ keywords: ['bdsm', 'bondage'], matchMode: 'stricte' })).rejected,
    'mots-clés (mode strict)'
  );
});

test('le filtre d’âge ne s’applique que si l’âge est connu', () => {
  const jeune = fakeResult({ title: '[22F4M] [Lyon] coucou' });
  assert.strictEqual(FILTERS.evaluate(jeune, baseState({ ageMin: 30 })).rejected, 'âge');
  const inconnu = fakeResult({ title: 'Annonce sans age', text: 'Bonjour je suis a Lyon et je cherche du monde.' });
  assert.strictEqual(FILTERS.evaluate(inconnu, baseState({ ageMin: 30 })).ok, true);
});

test('une annonce trop ancienne est écartée', () => {
  const vieille = fakeResult({ createdAt: new Date(Date.now() - 90 * 86400000).toISOString() });
  assert.strictEqual(FILTERS.evaluate(vieille, baseState({ maxAgeDays: 30 })).rejected,
    'annonce trop ancienne');
});

test('le tri par distance place le plus proche en tête', () => {
  const sorted = FILTERS.sort([
    fakeResult({ distanceKm: 40 }),
    fakeResult({ distanceKm: 3 }),
    fakeResult({ distanceKm: null })
  ], 'distance');
  assert.strictEqual(sorted[0].distanceKm, 3);
  assert.strictEqual(sorted[2].distanceKm, null);
});

// ---------------------------------------------------------------------------
// Chaîne complète
// ---------------------------------------------------------------------------

test('SEARCH.run : chaîne complète avec sources réelles simulées', async () => {
  resetRoutes();

  route('reddit.com', () => ({
    body: {
      data: {
        children: [
          { data: {
            subreddit: 'r4r', author: 'lyonnaise_30',
            title: '[30F4M] [Lyon] Cherche partenaire bdsm',
            selftext: 'Femme de 30 ans sur Lyon, je cherche un partenaire pour du bdsm régulier.',
            permalink: '/r/r4r/comments/1/', created_utc: Math.floor(Date.now() / 1000) - 3600,
            over_18: true, thumbnail: 'self'
          } },
          { data: {
            subreddit: 'r4r', author: 'tres_loin',
            title: '[30F4M] [Brest] Cherche partenaire bdsm',
            selftext: 'Je suis à Brest et je cherche quelqu’un pour du bdsm.',
            permalink: '/r/r4r/comments/2/', created_utc: Math.floor(Date.now() / 1000) - 7200,
            over_18: true, thumbnail: 'self'
          } },
          { data: {
            subreddit: 'r4r', author: 'commercial',
            title: '[30F4M] [Lyon] Séances bdsm',
            selftext: 'Séances bdsm, tarif 100€ l’heure, paiement PayPal.',
            permalink: '/r/r4r/comments/3/', created_utc: Math.floor(Date.now() / 1000) - 1800,
            over_18: true, thumbnail: 'self'
          } }
        ]
      }
    }
  }));

  route('public.api.bsky.app', () => ({
    body: {
      posts: [{
        uri: 'at://did:plc:zz/app.bsky.feed.post/3aaa',
        author: { handle: 'quelquun.bsky.social', displayName: 'Quelqu’un' },
        record: {
          text: 'Sur Villeurbanne, je cherche des gens pour du bdsm bienveillant.',
          createdAt: new Date().toISOString()
        }
      }]
    }
  }));

  // Lemmy tombe en panne : la source doit être signalée, sans résultat inventé.
  route('lemmy', () => new Error('HTTP 503'));
  route('mastodon.social', () => ({ body: [] }));
  route('piaille.fr', () => ({ body: [] }));

  await GEO.setCity('Lyon', 'fr');

  const state = baseState({
    keywords: ['bdsm'],
    radiusKm: 50,
    onlyLocated: true,
    excludePros: true,
    sortBy: 'distance'
  });

  const outcome = await SEARCH.run(state);

  const authors = outcome.results.map(r => r.author);
  assert.ok(authors.includes('lyonnaise_30'), `attendu lyonnaise_30, reçu ${authors.join(', ')}`);
  assert.ok(authors.includes('Quelqu’un'), `attendu le post Bluesky, reçu ${authors.join(', ')}`);
  assert.ok(!authors.includes('tres_loin'), 'Brest est à plus de 50 km de Lyon');
  assert.ok(!authors.includes('commercial'), 'annonce commerciale non exclue');

  for (const result of outcome.results) {
    assert.ok(result.distanceKm != null, 'chaque résultat retenu doit avoir une distance réelle');
    assert.ok(result.place, 'chaque résultat retenu doit avoir un lieu');
  }

  const lemmy = outcome.reports.find(report => report.id === 'lemmy');
  assert.strictEqual(lemmy.ok, false, 'Lemmy doit être signalée en échec');
  assert.strictEqual(lemmy.results.length, 0, 'une source en échec ne renvoie aucun résultat');

  const reddit = outcome.reports.find(report => report.id === 'reddit');
  assert.strictEqual(reddit.ok, true);
  assert.strictEqual(reddit.results.length, 3);

  assert.ok(outcome.stats.fetched >= 4);
  assert.ok(Object.keys(outcome.stats.rejections).length > 0);
});

test('SEARCH.run : Reddit bascule sur un relais CORS si le direct échoue', async () => {
  resetRoutes();

  let directCalls = 0;
  route('https://www.reddit.com', () => {
    directCalls += 1;
    return new Error('HTTP 403');
  });
  route('allorigins.win', () => ({
    body: {
      data: {
        children: [{ data: {
          subreddit: 'r4r', author: 'via_proxy',
          title: '[30F4M] [Lyon] Coucou',
          selftext: 'Je suis sur Lyon et je cherche quelqu’un pour du bdsm.',
          permalink: '/r/r4r/comments/9/', created_utc: Math.floor(Date.now() / 1000) - 600,
          over_18: false, thumbnail: 'self'
        } }]
      }
    }
  }));

  const report = await SOURCE_REDDIT.search({ query: 'Lyon bdsm' });
  assert.strictEqual(directCalls, 1, 'le direct doit être tenté en premier');
  assert.strictEqual(report.ok, true);
  assert.strictEqual(report.results[0].author, 'via_proxy');
  assert.strictEqual(report.attempts[0].ok, false);
  assert.strictEqual(report.attempts[1].ok, true);
});

test('SEARCH.run : toutes les sources en échec ⇒ zéro résultat, zéro invention', async () => {
  resetRoutes();
  route('', () => new Error('réseau coupé'));

  await GEO.setCity('Lyon', 'fr');
  const outcome = await SEARCH.run(baseState({ keywords: [] }));

  assert.strictEqual(outcome.results.length, 0);
  assert.ok(outcome.reports.every(report => !report.ok), 'toutes les sources doivent être en échec');
  assert.ok(outcome.reports.every(report => report.results.length === 0));
});

test('les liens de recherche externe sont bien formés', () => {
  const links = SEARCH.buildExternalSearches(baseState({ keywords: ['bdsm'] }), 'Lyon');
  assert.ok(links.length >= 3);
  for (const link of links) {
    assert.ok(/^https:\/\//.test(link.url), link.url);
    assert.ok(link.url.includes('Lyon'), link.url);
  }
});

test('la configuration ne contient aucune source qui exigerait un compte', () => {
  const serialized = JSON.stringify(CONFIG).toLowerCase();
  for (const forbidden of ['fetlife.com', 'okcupid', 'craigslist']) {
    assert.ok(!serialized.includes(forbidden), `${forbidden} ne doit pas être une source scrapée`);
  }
});

run();
