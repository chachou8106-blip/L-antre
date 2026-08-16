// Filtres et lecture des métadonnées d'annonce pour L'Antre.
//
// Les annonces de petites annonces suivent des conventions (« [25M4F] [Paris] »)
// qu'on exploite pour déduire âge, genre et rôle. Rien n'est inventé : si
// l'information n'est pas dans le texte, le champ reste nul et l'annonce n'est
// pas exclue pour autant (sauf en mode strict).

const FILTERS = (() => {
  const filters = {
    country: 'fr',
    radiusKm: 50,
    onlyLocated: true,
    sortBy: 'recent',
    matchMode: 'souple', // 'souple' | 'stricte'
    keywords: [],        // pratiques + attributs, saisis ou cochés
    gender: [],          // genre recherché
    role: [],
    ageMin: 18,
    ageMax: 99,
    maxAgeDays: 30,
    excludePros: true,
    excludeNoText: true,
    sources: { reddit: true, bluesky: true, lemmy: true, mastodon: true }
  };

  // --------------------------------------------------------------------------
  // Lecture des métadonnées dans le texte
  // --------------------------------------------------------------------------

  const GENDER_WORDS = {
    Femme: ['femme', 'female', 'woman', 'fille', 'girl', 'meuf'],
    Homme: ['homme', 'male', 'man', 'mec', 'gars', 'guy'],
    Couple: ['couple', 'couples'],
    Trans: ['trans', 'transgenre', 'travesti', 'tv', 'ts', 'mtf', 'ftm']
  };

  const ROLE_WORDS = {
    Dominatrice: ['dominatrice', 'domina', 'maitresse', 'domme', 'femdom'],
    Dominant: ['dominant', 'dom', 'maitre', 'master'],
    Soumis: ['soumis', 'soumise', 'sub', 'submissive', 'sissy', 'esclave'],
    Switch: ['switch', 'versatile']
  };

  const PRO_WORDS = [
    'tarif', 'tarifs', 'payant', 'payante', 'escort', 'escorte', 'escorts',
    'professionnelle', 'professionnel', 'prostituee', 'onlyfans', 'mym',
    'snap premium', 'contre remuneration', 'venale', 'paypal', 'cashapp'
  ];
  const PRO_PATTERNS = [/\d+\s*(?:€|eur\b|\$|usd\b)/i, /\b(?:€|\$)\s*\d+/];

  const GENDER_LETTER = { m: 'Homme', h: 'Homme', f: 'Femme', w: 'Femme', t: 'Trans', c: 'Couple' };

  /**
   * Extrait âge, genre de l'auteur et genre recherché.
   * Gère « [25M4F] », « 25 [M4F] », « M4F », « 30F », « F30 », « 28 ans ».
   */
  function parseMeta(text) {
    const meta = { age: null, gender: null, seeking: null, role: null };
    const raw = String(text || '');
    const flat = UTIL.normalizeText(raw);

    // Code de type « 25m4f » / « m4f » / « 25 m 4 f ».
    const code = flat.match(/(\d{2})?\s*([mfhtcw]{1,2})\s*4\s*([mfhtcwra]{1,3})\s*(\d{2})?/);
    if (code) {
      const [, ageBefore, self, target, ageAfter] = code;
      const age = parseInt(ageBefore || ageAfter, 10);
      if (age >= 18 && age <= 99) meta.age = age;
      meta.gender = GENDER_LETTER[self[0]] || null;
      if (target[0] === 'r' || target[0] === 'a') meta.seeking = 'Indifférent';
      else meta.seeking = GENDER_LETTER[target[0]] || null;
    }

    // « 25F » ou « F25 » isolés.
    if (!meta.age || !meta.gender) {
      const short = flat.match(/\b(\d{2})\s*([mfhtc])\b|\b([mfhtc])\s*(\d{2})\b/);
      if (short) {
        const age = parseInt(short[1] || short[4], 10);
        const letter = short[2] || short[3];
        if (!meta.age && age >= 18 && age <= 99) meta.age = age;
        if (!meta.gender) meta.gender = GENDER_LETTER[letter] || null;
      }
    }

    // « 28 ans », « 28 yo ».
    if (!meta.age) {
      const spelled = flat.match(/\b(\d{2})\s*(?:ans|yo|y\/o|years old)\b/);
      if (spelled) {
        const age = parseInt(spelled[1], 10);
        if (age >= 18 && age <= 99) meta.age = age;
      }
    }

    // Genre en toutes lettres, si le code n'a rien donné.
    if (!meta.gender) {
      for (const [label, words] of Object.entries(GENDER_WORDS)) {
        if (words.some(word => UTIL.containsWord(flat, word))) {
          meta.gender = label;
          break;
        }
      }
    }

    for (const [label, words] of Object.entries(ROLE_WORDS)) {
      if (words.some(word => UTIL.containsWord(flat, word))) {
        meta.role = label;
        break;
      }
    }

    return meta;
  }

  /** Détecte une annonce commerciale (escorting, contenu payant). */
  function looksProfessional(text) {
    const flat = UTIL.normalizeText(text);
    if (PRO_WORDS.some(word => UTIL.containsWord(flat, word))) return true;
    return PRO_PATTERNS.some(pattern => pattern.test(text || ''));
  }

  // --------------------------------------------------------------------------
  // Filtrage
  // --------------------------------------------------------------------------

  /**
   * Évalue une annonce. Renvoie { ok, score, rejected } — `rejected` nomme le
   * critère qui a écarté l'annonce, ce qui est affiché dans le panneau de
   * diagnostic pour comprendre pourquoi une recherche ne donne rien.
   */
  function evaluate(result, state = filters) {
    const haystack = `${result.title || ''} ${result.text || ''}`;
    let score = 0;

    if (state.excludeNoText && haystack.trim().length < 20) {
      return { ok: false, score, rejected: 'texte trop court' };
    }

    if (state.excludePros && looksProfessional(haystack)) {
      return { ok: false, score, rejected: 'annonce commerciale' };
    }

    if (state.maxAgeDays && result.createdAt) {
      const ageDays = (Date.now() - new Date(result.createdAt).getTime()) / 86400000;
      if (ageDays > state.maxAgeDays) {
        return { ok: false, score, rejected: 'annonce trop ancienne' };
      }
      score += Math.max(0, 30 - ageDays) / 30;
    }

    const meta = result.meta || {};

    if (state.gender.length && meta.gender) {
      if (!state.gender.includes(meta.gender)) {
        return { ok: false, score, rejected: 'genre' };
      }
      score += 1;
    } else if (state.gender.length && !meta.gender && state.matchMode === 'stricte') {
      return { ok: false, score, rejected: 'genre indéterminé' };
    }

    if (state.role.length && meta.role) {
      if (!state.role.includes(meta.role)) {
        return { ok: false, score, rejected: 'rôle' };
      }
      score += 1;
    } else if (state.role.length && !meta.role && state.matchMode === 'stricte') {
      return { ok: false, score, rejected: 'rôle indéterminé' };
    }

    if (meta.age != null && (meta.age < state.ageMin || meta.age > state.ageMax)) {
      return { ok: false, score, rejected: 'âge' };
    }
    if (meta.age == null && state.matchMode === 'stricte' &&
        (state.ageMin > 18 || state.ageMax < 99)) {
      return { ok: false, score, rejected: 'âge indéterminé' };
    }

    if (state.keywords.length) {
      const matched = state.keywords.filter(word => UTIL.containsWord(haystack, word));
      if (state.matchMode === 'stricte' && matched.length !== state.keywords.length) {
        return { ok: false, score, rejected: 'mots-clés (mode strict)' };
      }
      if (!matched.length) {
        return { ok: false, score, rejected: 'aucun mot-clé' };
      }
      score += matched.length * 2;
      result.matchedKeywords = matched;
    }

    if (result.distanceKm != null) {
      if (result.distanceKm > state.radiusKm) {
        return { ok: false, score, rejected: 'hors rayon' };
      }
      score += Math.max(0, (state.radiusKm - result.distanceKm) / state.radiusKm) * 3;
    } else if (state.onlyLocated) {
      return { ok: false, score, rejected: 'lieu non identifié' };
    }

    return { ok: true, score, rejected: null };
  }

  /** Applique le filtre à une liste et renvoie résultats + statistiques. */
  function apply(results, state = filters) {
    const kept = [];
    const rejections = {};
    for (const result of results) {
      const verdict = evaluate(result, state);
      if (verdict.ok) {
        result.score = verdict.score;
        kept.push(result);
      } else {
        rejections[verdict.rejected] = (rejections[verdict.rejected] || 0) + 1;
      }
    }
    return { kept, rejections };
  }

  /** Tri final selon le choix de l'utilisateur. */
  function sort(results, sortBy) {
    const sorted = [...results];
    if (sortBy === 'distance') {
      sorted.sort((a, b) => {
        if (a.distanceKm == null) return 1;
        if (b.distanceKm == null) return -1;
        return a.distanceKm - b.distanceKm;
      });
    } else if (sortBy === 'pertinence') {
      sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else {
      sorted.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
    }
    return sorted;
  }

  /**
   * Construit la requête texte envoyée aux moteurs de recherche des sources.
   * On y met la ville et les mots-clés : c'est ce qui rend le scraping ciblé.
   */
  function buildQuery(state = filters, placeLabel = null) {
    const parts = [];
    if (placeLabel) parts.push(placeLabel);
    parts.push(...state.keywords.slice(0, 4));
    return parts.filter(Boolean).join(' ').trim();
  }

  return {
    filters,
    parseMeta,
    looksProfessional,
    evaluate,
    apply,
    sort,
    buildQuery,
    GENDER_WORDS,
    ROLE_WORDS
  };
})();

if (typeof window !== 'undefined') window.FILTERS = FILTERS;
