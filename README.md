# L'Antre

**L'Antre** est une PWA qui centralise tes recherches de rencontres. Tu règles tes
critères une fois, l'app construit la requête correspondante pour chaque source et
te l'ouvre. Aucun compte, aucun serveur : tout reste dans le navigateur.

---

## Comment ça marche

L'Antre est un **agrégateur de recherches**, pas un scraper.

| Source | Mode | Détail |
|---|---|---|
| Reddit | **Direct** | Les annonces r4r publiques sont récupérées via l'API JSON publique et affichées dans l'app. |
| FetLife | Lien | Compte requis, et les CGU interdisent l'extraction automatique. |
| Lieux (Google Maps) | Lien | Clubs, saunas et soirées autour de ta position. |
| Forums libertins | Lien | Requête ciblée sur les forums francophones. |
| Craigslist | Lien | Section « activity partners » du site local à ta ville. |
| Recherche web | Lien | Requête généraliste construite depuis tes filtres. |

Pourquoi ce choix : une page web ne peut pas interroger un site tiers sans son
accord (politique CORS du navigateur). Les proxys publics qui contournaient ça
sont hors service, et les sites concernés interdisent l'extraction automatique.
Plutôt que d'afficher des profils inventés, L'Antre construit des liens de
recherche réels, immédiatement ouvrables.

Si Reddit refuse la requête depuis ton réseau, l'app te le dit et te laisse la
carte « lien de recherche » correspondante.

---

## Installation

### Héberger sur GitHub Pages
1. **Settings → Pages** du dépôt, branche `main`, dossier `/ (root)`, puis **Save**.
2. L'app est en ligne sur `https://<ton-compte>.github.io/l-antre/`.
3. Ouvre-la sur ton téléphone, puis **Ajouter à l'écran d'accueil**.

### En local
```bash
npx http-server -p 8080
# puis ouvrir http://127.0.0.1:8080
```
Un simple `file://` ne suffit pas : le service worker et la géolocalisation
exigent `http://localhost` ou du HTTPS.

---

## Fonctionnalités

- **Localisation** : GPS (avec conversion en nom de ville via OpenStreetMap) ou saisie manuelle.
- **Filtres** : genre, rôle BDSM, pratiques, attributs, tranche d'âge, exclusions.
- **Tri** : par date, par pertinence (nombre de mots-clés présents) ou par source.
- **Analyse d'image (option)** : MobileNet via TensorFlow.js, exécuté sur l'appareil.
- **Favoris et historique** : stockés en `localStorage`, rechargeables en un clic.
- **Hors-ligne** : service worker avec app shell en cache.

### À propos de l'analyse d'image

L'option « Analyse d'image » charge TensorFlow.js et MobileNet v1 (~1,3 Mo de
poids, téléchargés seulement si tu coches la case) et classe les vignettes
directement sur ton appareil — aucune image n'est envoyée nulle part.

MobileNet est entraîné sur ImageNet : il reconnaît un millier d'objets courants
(vêtement, animal, véhicule, capture d'écran…). Il sert donc à **étiqueter les
vignettes** et à **écarter celles qui ne sont pas des photos** (logos, bannières
de texte). Il ne reconnaît pas d'attributs corporels : le filtre « attributs »
reste basé sur le texte des annonces, tel que leurs auteurs l'ont écrit.

---

## Structure

```
index.html              interface
manifest.json           métadonnées PWA
service-worker.js       cache hors-ligne
styles/main.css         thème sombre, responsive
scripts/utils.js        échappement HTML, texte, dates
scripts/notifications.js  bandeaux temporaires
scripts/filters.js      état des filtres et construction des requêtes
scripts/geolocation.js  GPS et géocodage inverse
scripts/vision.js       TensorFlow.js / MobileNet
scripts/favorites.js    favoris (localStorage)
scripts/render.js       cartes et modale
scripts/sources.js      registre des sources et recherche
scripts/history.js      historique (localStorage)
scripts/app.js          câblage de l'interface
tools/generate-icons.py régénère les icônes PNG
```

---

## Personnalisation

### Ajouter une source
Ajoute une entrée dans `SOURCES` (`scripts/sources.js`) :

```js
{
  id: 'ma-source',
  name: 'Ma source',
  icon: 'fas fa-star',
  note: 'Ce que fait cette recherche.',
  searchUrl() {
    return `https://exemple.fr/recherche?q=${encodeURIComponent(buildWebQuery())}`;
  }
  // async fetchLive() { ... }  // seulement si le site autorise l'accès CORS
}
```
Puis ajoute la case correspondante dans la section « Sources » d'`index.html`.

### Modifier les filtres
Les critères sont déclarés dans `index.html` et lus par `updateFilters()`
(`scripts/filters.js`). Le tri des résultats vit dans `sortResults()`.

### Régénérer les icônes
```bash
python3 tools/generate-icons.py
```

---

## Limites connues

- **Reddit** peut refuser les requêtes non authentifiées selon le réseau ou la
  région. L'app le signale et bascule sur le lien de recherche.
- **Genre, rôle et âge** sont déduits du texte des annonces (formats `[25F]`,
  `F4M`, « dominatrice »…) : c'est une heuristique, pas une donnée déclarée.
- **Le rayon** sert à cadrer la recherche cartographique ; les annonces Reddit
  n'exposent pas de coordonnées, donc aucune distance n'est calculée.
- **Géolocalisation** : nécessite HTTPS et ton autorisation explicite.

---

## Vie privée et cadre légal

- Aucune donnée ne quitte l'appareil : pas de compte, pas de serveur, pas
  d'analytics. Favoris et historique vivent en `localStorage` et le lien
  « Effacer mes données » les supprime.
- L'app ne contourne aucune protection technique et n'archive aucun profil :
  elle ouvre des recherches sur les sites, qui restent seuls responsables de
  leurs contenus.
- Les annonces affichées émanent de personnes réelles. Ce sont des données
  sensibles au sens de l'article 9 du RGPD : ne les republie pas, ne les
  recoupe pas avec d'autres sources, et respecte les CGU de chaque site.

---

## Licence

Usage personnel — voir [LICENSE](LICENSE).
