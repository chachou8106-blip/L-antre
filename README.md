# L'Antre

PWA qui agrège **des annonces réelles, publiées publiquement**, pour trouver des
personnes près de chez toi selon tes critères.

- **Aucun compte** — ni sur L'Antre, ni sur les sources.
- **Aucun serveur** — tout tourne dans ton navigateur, hébergé sur GitHub Pages.
- **Aucune donnée simulée** — si une source ne répond pas, l'app te le dit ; elle
  n'invente jamais de profil.

---

## Installation

1. **Settings → Pages** du dépôt `l-antre` → branche `main`, dossier `/ (root)` → **Save**.
2. Ouvre `https://chachou8106-blip.github.io/l-antre/` sur ton téléphone.
3. « Ajouter à l'écran d'accueil » : l'app s'installe comme une app native et
   fonctionne hors ligne (l'interface ; les annonces demandent évidemment du réseau).

---

## Comment ça marche

```
Ta position (GPS ou ville)
        │
        ▼
4 APIs publiques interrogées en parallèle depuis ton navigateur
        │
        ▼
Dédoublonnage  →  Localisation de chaque annonce  →  Distance réelle (Haversine)
        │
        ▼
Filtres (mots-clés, genre, rôle, âge, rayon, anti-commercial)  →  Tri  →  Affichage
```

### Les sources

| Source | Endpoint | Compte requis | Ce qu'on en tire |
|---|---|---|---|
| **Reddit** | `/r/<subs>/search.json` | Non | Petites annonces r4r, avec titre `[30F4M] [Lyon]` |
| **Bluesky** | `public.api.bsky.app` | Non | Posts publics, la source la plus fiable en CORS |
| **Lemmy** | `/api/v3/search` | Non | Posts des instances fédérées |
| **Mastodon** | `/api/v1/timelines/tag/<tag>` | Non | Toots publics par hashtag |

Les subreddits, instances et hashtags se modifient dans **`scripts/config.js`** —
c'est le seul fichier à toucher pour élargir la couverture.

### Ce qui est déduit de chaque annonce

L'app lit les conventions des petites annonces pour remplir les champs :

- **Âge et genre** : `[25M4F]`, `25 [M4F]`, `30F`, `F30`, `28 ans` → 28 ans, Homme, cherche Femme.
- **Rôle** : dominatrice / dominant / soumis / switch, repérés dans le texte.
- **Lieu** : crochets (`[Bordeaux]`), numéro de département (`dept 33`), nom de
  ville cité dans le texte, expressions régionales (`IDF`, `région parisienne`).
- **Distance réelle** : la ville trouvée est convertie en coordonnées, puis la
  distance orthodromique est calculée. `~50 km` n'existe plus.

Rien n'est inventé : si l'information n'est pas dans le texte, le champ reste
vide et l'annonce n'est pas écartée pour autant (sauf en mode strict).

### Géocodage

Une table de ~170 villes est embarquée (`scripts/cities.js`) : instantané, hors
ligne, sans limite. Ce qu'elle ne couvre pas passe par **Nominatim**
(OpenStreetMap, sans clé), avec cache permanent et 1 requête/seconde maximum,
conformément à leur politique d'usage.

---

## Filtres

| Filtre | Effet |
|---|---|
| Rayon | 10 à 200 km, ou tout le pays — appliqué sur la distance réelle |
| Uniquement les annonces localisées | Écarte celles dont on ne sait pas situer l'auteur |
| Pratiques / attributs | Mots entiers cherchés dans le texte écrit par la personne |
| Mots-clés libres | Tes propres termes, séparés par des virgules |
| Genre / rôle | Sur les valeurs déduites du texte |
| Âge | Ne s'applique que si un âge est réellement annoncé |
| Publiées depuis | 48 h à 3 mois |
| Correspondance souple / stricte | Souple : un critère suffit. Stricte : tous doivent matcher |
| Exclure les annonces commerciales | Tarifs, escorting, OnlyFans, montants en € ou $ |

Le panneau **État des sources** dit, après chaque recherche, combien d'annonces
chaque source a renvoyées, laquelle a échoué et pourquoi, et combien d'annonces
chaque filtre a écartées. Quand une recherche ne donne rien, la réponse est là.

---

## Ce que l'app ne fait pas, et pourquoi

**FetLife, OkCupid, Craigslist, Google Maps ne sont pas scrapés.** Ces sites
exigent une session authentifiée et bloquent les requêtes venant d'une page web.
Il n'existe aucun moyen honnête de les interroger depuis un site statique : la
version précédente de l'app le « faisait » en affichant des profils fabriqués de
toutes pièces, avec des liens qui ne menaient nulle part. Ils ont été supprimés.

À la place, le panneau **Recherches externes** ouvre la vraie recherche sur ces
plateformes (dont FetLife via l'index Google/DuckDuckGo), pré-remplie avec tes
critères. C'est réel, et ça ne demande toujours pas de compte pour chercher.

**Pas de détection d'images.** L'ancienne version chargeait TensorFlow.js (1 Mo)
sans jamais l'utiliser. Je ne l'ai pas implémenté : analyser automatiquement le
corps de personnes réelles à partir de leurs photos, sans qu'elles le sachent,
n'est pas quelque chose que je vais coder. Les filtres d'attributs cherchent donc
ces termes dans la description que la personne a écrite elle-même — ce qui a
l'avantage d'être exact, alors qu'un classifieur d'images se serait trompé
souvent.

---

## Personnalisation

**Ajouter des subreddits, instances ou hashtags** → `scripts/config.js` :

```js
reddit: { subreddits: ['r4r', 'dirtyr4r', 'monNouveauSub'] },
mastodon: { tags: ['r4r', 'bdsm', 'monHashtag'] }
```

**Ajouter une source complètement nouvelle** :

1. Crée `scripts/sources/masource.js` sur le modèle de `bluesky.js` (le plus court) :
   une fonction `search(context)` qui renvoie `SOURCE_BASE.report(...)`.
2. Ajoute-la dans `SEARCH.allSources()` (`scripts/search.js`) et dans le tableau
   `APP_SHELL` du `service-worker.js`.
3. Ajoute une case à cocher `<input name="source" value="masource">` dans `index.html`.

**Ajouter des villes** → `scripts/cities.js`, format `['Nom', latitude, longitude]`.

---

## Tests

```bash
node tests/run-tests.js                          # logique : 27 tests, sans réseau
NODE_PATH=$(npm root -g) node tests/browser-test.js   # interface réelle dans Chromium
```

Le second lance la vraie page, intercepte le réseau avec des réponses au format
exact des APIs, et vérifie notamment qu'une annonce contenant
`<img src=x onerror=...>` s'affiche comme du texte au lieu de s'exécuter.

---

## Limites connues

- **Reddit** bloque parfois les requêtes navigateur venant d'une origine tierce.
  L'app tente l'appel direct, puis deux relais CORS publics
  (`allorigins.win`, `codetabs.com`), et signale l'échec le cas échéant. Ces
  relais voient passer tes requêtes : si ça te gêne, vide la liste
  `corsProxies` dans `config.js` (Reddit sera alors en direct uniquement).
- **Le volume dépend des sources.** Les annonces francophones géolocalisables
  sont peu nombreuses certains jours. Élargis le rayon, retire des mots-clés,
  ou passe « Annonces publiées depuis » à 3 mois.
- **Nominatim** limite à 1 requête/seconde : la première recherche dans une
  nouvelle zone peut prendre quelques secondes. Ensuite c'est en cache.

---

## Vie privée

Position, favoris, historique et cache de géocodage restent dans le
`localStorage` de ton navigateur. Aucun serveur ne les reçoit — L'Antre n'en a
pas. Le bouton « Effacer toutes mes données locales » vide tout.

À noter : les annonces affichées appartiennent à des personnes réelles. Reddit,
Bluesky, Lemmy et Mastodon encadrent la réutilisation de ces contenus dans leurs
conditions, et les informations relatives à la vie sexuelle sont des données
sensibles au sens du RGPD (art. 9). L'app est conçue pour un usage personnel de
consultation : elle ne stocke rien côté serveur, ne republie rien, et n'agrège
pas de base de profils.

---

## Licence

Usage personnel uniquement — voir `LICENSE`.
