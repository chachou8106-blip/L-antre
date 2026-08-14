# L'Antre

**L'Antre** est une **PWA (Progressive Web App)** conçue pour trouver des partenaires près de chez toi, selon tes critères personnalisés. **100% discrète, gratuite et sans compte requis**.

---

## 🚀 Installation

### 1. Héberger sur GitHub Pages
1. **Active GitHub Pages** :
   - Va dans **Settings** > **Pages** de ton repo `l-antre`.
   - Sélectionne la branche **`main`** et le dossier **`/ (root)`**.
   - Clique sur **Save**.

2. **Accède à ton application** :
   - Le lien sera : `https://chachou8106-blip.github.io/l-antre/`
   - Ouvre-le sur ton téléphone et ajoute-le à ton **écran d’accueil** (comme une app native).

---

## 🎯 Fonctionnalités

- **Géolocalisation** : Utilise ta position GPS ou une ville manuelle pour cibler les recherches.
- **Scraping large** : Reddit (r/DirtyR4R, r/BDSM), FetLife (pages publiques), Google Maps, etc.
- **Filtres ultra-personnalisables** : Genre, rôle BDSM, pratiques, attributs physiques, âge, exclusions.
- **Détection d’images** (TensorFlow.js) pour identifier des attributs comme "gros seins".
- **Historique et favoris** : Sauvegarde tes recherches et tes profils préférés.
- **Notifications** : Alertes pour les nouveaux résultats.
- **Design responsive** : Adapté pour mobile et desktop.

---

## 🛠️ Personnalisation

### Ajouter un site à scraper
1. Ajoute une nouvelle fonction dans `scripts/scraping.js` (ex: `scrapeNouveauSite`).
2. Appele cette fonction dans `searchAll()`.

### Modifier les filtres
Édite le fichier `scripts/filters.js` pour ajouter ou modifier les critères de recherche.

---

## ⚠️ Limitations

- **Scraping** : Certains sites peuvent bloquer les requêtes automatiques. Utilise un **VPN** si nécessaire.
- **Géolocalisation** : Doit être activée dans ton navigateur.
- **Légalité** : Respecte les conditions d’utilisation des sites scrapés.

---

## 📜 Licence
Usage **personnel uniquement**.

---

## 🙌 Contribuer
Si tu veux améliorer cette application, n’hésite pas à modifier le code et à adapter les fonctionnalités selon tes besoins.