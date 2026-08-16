// Test navigateur de L'Antre — charge la vraie page dans Chromium.
//
//   NODE_PATH=$(npm root -g) node tests/browser-test.js
//
// Les appels réseau sortants sont interceptés et remplacés par des charges
// utiles au format réel des APIs : on valide ainsi le câblage complet de
// l'interface (formulaire, recherche, rendu, favoris, diagnostic) sans
// dépendre d'un accès à Reddit ou Bluesky.

const path = require('path');
const http = require('http');
const fs = require('fs');
const assert = require('assert');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..');
const PORT = 8749;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png'
};

function serve() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const relative = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
      const file = path.join(ROOT, relative);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(fs.readFileSync(file));
    });
    server.listen(PORT, () => resolve(server));
  });
}

// Une annonce piégée : si le rendu utilisait innerHTML, ce script s'exécuterait.
const XSS_PAYLOAD = '<img src=x onerror="window.__XSS_FIRED=true">Cherche sur Lyon du bdsm';

function redditPayload() {
  const now = Math.floor(Date.now() / 1000);
  return {
    data: {
      children: [
        { data: {
          subreddit: 'r4r', author: 'lyonnaise_30',
          title: '[30F4M] [Lyon] Cherche partenaire',
          selftext: 'Femme de 30 ans sur Lyon, je cherche quelqu’un pour du bdsm régulier.',
          permalink: '/r/r4r/comments/1/', created_utc: now - 3600, over_18: true, thumbnail: 'self'
        } },
        { data: {
          subreddit: 'r4r', author: '<script>alert(1)</script>',
          title: '[28F4M] [Lyon] Annonce piégée',
          selftext: XSS_PAYLOAD,
          permalink: '/r/r4r/comments/2/', created_utc: now - 1800, over_18: true, thumbnail: 'self'
        } }
      ]
    }
  };
}

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`  ok   ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error });
    console.log(`  FAIL ${name}`);
    console.log(`       ${error.message}`);
  }
}

(async () => {
  const server = await serve();
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', error => pageErrors.push(String(error)));

  // Interception réseau : tout ce qui sort du localhost est simulé.
  await context.route('**/*', async routeCtx => {
    const url = routeCtx.request().url();
    if (url.includes(`localhost:${PORT}`)) return routeCtx.continue();

    const json = body => routeCtx.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body)
    });

    if (url.includes('reddit.com')) return json(redditPayload());
    if (url.includes('public.api.bsky.app')) return json({ posts: [] });
    if (url.includes('lemmy')) return routeCtx.fulfill({ status: 503, body: 'nope' });
    if (url.includes('/api/v1/timelines/tag/')) return json([]);
    if (url.includes('nominatim')) return json([]);
    return routeCtx.fulfill({ status: 204, body: '' });
  });

  await page.goto(`http://localhost:${PORT}/index.html`);
  await page.waitForLoadState('networkidle');

  check('la page se charge sans erreur JavaScript', () => {
    assert.deepStrictEqual(pageErrors, []);
  });

  const globals = await page.evaluate(() => ({
    util: typeof window.UTIL,
    filters: typeof window.FILTERS,
    geo: typeof window.GEO,
    search: typeof window.SEARCH,
    render: typeof window.RENDER,
    favorites: typeof window.FAVORITES,
    history: typeof window.HISTORY,
    scraping: typeof window.scrapeFetLife
  }));

  check('les modules attendus sont chargés', () => {
    for (const [name, type] of Object.entries(globals)) {
      if (name === 'scraping') continue;
      assert.strictEqual(type, 'object', `${name} devrait être un objet, reçu ${type}`);
    }
  });

  check('les anciens connecteurs simulés ont disparu', () => {
    assert.strictEqual(globals.scraping, 'undefined');
  });

  const disabledBefore = await page.locator('#search-button').isDisabled();
  check('recherche bloquée tant qu’aucune position n’est définie', () => {
    assert.strictEqual(disabledBefore, true);
  });

  // Définit la position via la ville (résolue par la table embarquée, sans réseau).
  await page.fill('#city-input', 'Lyon');
  await page.dispatchEvent('#city-input', 'change');
  await page.waitForFunction(() => !document.getElementById('search-button').disabled);

  const positionLabel = await page.locator('#position-label').textContent();
  check('la ville saisie est résolue en coordonnées réelles', () => {
    assert.ok(/Lyon/.test(positionLabel), positionLabel);
    assert.ok(/45\.7/.test(positionLabel), positionLabel);
  });

  // Coche un mot-clé et lance la recherche.
  await page.check('input[name="keyword"][value="bdsm"]');
  await page.click('#search-button');
  await page.waitForSelector('.result-card, .no-results', { timeout: 20000 });
  await page.waitForTimeout(600);

  const cardCount = await page.locator('.result-card').count();
  check('des résultats réels sont rendus', () => {
    assert.ok(cardCount >= 1, `aucune carte rendue (${cardCount})`);
  });

  const xssFired = await page.evaluate(() => Boolean(window.__XSS_FIRED));
  check('une annonce piégée n’exécute aucun script', () => {
    assert.strictEqual(xssFired, false);
  });

  const rawAuthor = await page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('.result-identity h3'));
    return nodes.map(node => node.textContent).join(' | ');
  });
  check('le pseudo piégé est affiché comme du texte', () => {
    assert.ok(rawAuthor.includes('<script>alert(1)</script>'), rawAuthor);
  });

  const injectedScripts = await page.evaluate(
    () => document.querySelectorAll('#results script, #results img[onerror]').length
  );
  check('aucune balise injectée n’a été créée dans le DOM', () => {
    assert.strictEqual(injectedScripts, 0);
  });

  const diagnostics = await page.locator('#diagnostics').textContent();
  check('le diagnostic signale la source en panne', () => {
    assert.ok(/Lemmy/.test(diagnostics), diagnostics);
    assert.ok(/échec/.test(diagnostics), diagnostics);
  });

  check('le diagnostic annonce le succès de Reddit', () => {
    assert.ok(/Reddit/.test(diagnostics), diagnostics);
  });

  // Favoris
  await page.locator('.result-card .favorite-button').first().click();
  await page.waitForTimeout(200);
  const favCount = await page.locator('#favorites-count').textContent();
  check('un favori est enregistré localement', () => {
    assert.strictEqual(favCount.trim(), '1');
  });

  // Historique
  const historyText = await page.locator('#history').textContent();
  check('la recherche est ajoutée à l’historique', () => {
    assert.ok(/Lyon/.test(historyText), historyText);
  });

  // Liens externes
  const externalCount = await page.locator('#external-links a').count();
  check('les liens de recherche externe sont proposés', () => {
    assert.ok(externalCount >= 3, `${externalCount} lien(s)`);
  });

  const targetBlank = await page.evaluate(
    () => Array.from(document.querySelectorAll('#results a')).every(a => a.rel.includes('noopener'))
  );
  check('les liens sortants sont en rel=noopener', () => {
    assert.strictEqual(targetBlank, true);
  });

  check('aucune erreur console bloquante', () => {
    // Les 503 proviennent de la panne Lemmy simulée plus haut : c'est le
    // comportement attendu, la source est signalée dans le diagnostic.
    const blocking = consoleErrors.filter(
      text => !/favicon|font-awesome|cdnjs|503|Service Unavailable/i.test(text)
    );
    assert.deepStrictEqual(blocking, []);
  });

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(__dirname, 'screenshot.png'), fullPage: true });

  await browser.close();
  server.close();

  const failed = results.filter(result => !result.ok);
  console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies`);
  if (failed.length) process.exit(1);
})();
