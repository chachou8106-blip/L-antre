// Table de villes embarquée : permet de localiser une annonce et de calculer une
// distance réelle sans aucun appel réseau (donc instantanément, et hors ligne).
// Tout ce qui n'est pas dans cette table est résolu via Nominatim (voir geo.js).
// Coordonnées au centième de degré (~1 km), largement suffisant pour un rayon.

const CITIES = [
  ['Paris', 48.86, 2.35], ['Marseille', 43.3, 5.37], ['Lyon', 45.76, 4.84],
  ['Toulouse', 43.6, 1.44], ['Nice', 43.7, 7.27], ['Nantes', 47.22, -1.55],
  ['Montpellier', 43.61, 3.88], ['Strasbourg', 48.58, 7.75], ['Bordeaux', 44.84, -0.58],
  ['Lille', 50.63, 3.06], ['Rennes', 48.11, -1.68], ['Reims', 49.26, 4.03],
  ['Saint-Etienne', 45.44, 4.39], ['Le Havre', 49.49, 0.11], ['Toulon', 43.12, 5.93],
  ['Grenoble', 45.19, 5.72], ['Dijon', 47.32, 5.04], ['Angers', 47.47, -0.55],
  ['Nimes', 43.84, 4.36], ['Villeurbanne', 45.77, 4.88], ['Clermont-Ferrand', 45.78, 3.08],
  ['Le Mans', 48.01, 0.2], ['Aix-en-Provence', 43.53, 5.45], ['Brest', 48.39, -4.49],
  ['Tours', 47.39, 0.69], ['Amiens', 49.89, 2.3], ['Limoges', 45.83, 1.26],
  ['Annecy', 45.9, 6.13], ['Perpignan', 42.7, 2.9], ['Boulogne-Billancourt', 48.84, 2.24],
  ['Metz', 49.12, 6.18], ['Besancon', 47.24, 6.02], ['Orleans', 47.9, 1.9],
  ['Saint-Denis', 48.94, 2.36], ['Rouen', 49.44, 1.1], ['Argenteuil', 48.95, 2.25],
  ['Mulhouse', 47.75, 7.34], ['Montreuil', 48.86, 2.44], ['Caen', 49.18, -0.37],
  ['Nancy', 48.69, 6.18], ['Tourcoing', 50.72, 3.16], ['Roubaix', 50.69, 3.17],
  ['Nanterre', 48.89, 2.2], ['Vitry-sur-Seine', 48.79, 2.39], ['Creteil', 48.79, 2.46],
  ['Avignon', 43.95, 4.81], ['Poitiers', 46.58, 0.34], ['Aubervilliers', 48.92, 2.38],
  ['Dunkerque', 51.03, 2.38], ['Aulnay-sous-Bois', 48.94, 2.49], ['Versailles', 48.8, 2.13],
  ['Colombes', 48.92, 2.25], ['Asnieres-sur-Seine', 48.92, 2.29], ['Courbevoie', 48.9, 2.25],
  ['Cherbourg', 49.64, -1.62], ['Rueil-Malmaison', 48.88, 2.18], ['Pau', 43.3, -0.37],
  ['Champigny-sur-Marne', 48.82, 2.52], ['Antibes', 43.58, 7.13], ['La Rochelle', 46.16, -1.15],
  ['Saint-Maur-des-Fosses', 48.8, 2.49], ['Cannes', 43.55, 7.02], ['Calais', 50.95, 1.86],
  ['Beziers', 43.34, 3.22], ['Colmar', 48.08, 7.36], ['Bourges', 47.08, 2.4],
  ['Drancy', 48.93, 2.45], ['Merignac', 44.84, -0.65], ['Saint-Nazaire', 47.27, -2.21],
  ['Valence', 44.93, 4.89], ['Ajaccio', 41.93, 8.74], ['Issy-les-Moulineaux', 48.82, 2.27],
  ['Villeneuve-d\'Ascq', 50.62, 3.14], ['Levallois-Perret', 48.89, 2.29],
  ['Noisy-le-Grand', 48.85, 2.55], ['Quimper', 48.0, -4.1], ['La Seyne-sur-Mer', 43.1, 5.88],
  ['Antony', 48.75, 2.3], ['Troyes', 48.3, 4.07], ['Neuilly-sur-Seine', 48.88, 2.27],
  ['Sarcelles', 49.0, 2.38], ['Lorient', 47.75, -3.37], ['Chambery', 45.56, 5.92],
  ['Niort', 46.32, -0.46], ['Saint-Quentin', 49.85, 3.29], ['Beauvais', 49.43, 2.08],
  ['Hyeres', 43.12, 6.13], ['Vannes', 47.66, -2.76], ['Cholet', 47.06, -0.88],
  ['La Roche-sur-Yon', 46.67, -1.43], ['Charleville-Mezieres', 49.77, 4.72],
  ['Bayonne', 43.49, -1.48], ['Biarritz', 43.48, -1.56], ['Arras', 50.29, 2.78],
  ['Belfort', 47.64, 6.86], ['Evreux', 49.02, 1.15], ['Blois', 47.59, 1.33],
  ['Chalon-sur-Saone', 46.78, 4.85], ['Laval', 48.07, -0.77], ['Angouleme', 45.65, 0.16],
  ['Tarbes', 43.23, 0.08], ['Montauban', 44.02, 1.35], ['Albi', 43.93, 2.15],
  ['Carcassonne', 43.21, 2.35], ['Narbonne', 43.18, 3.0], ['Sete', 43.4, 3.7],
  ['Arles', 43.68, 4.63], ['Aubagne', 43.29, 5.57], ['Frejus', 43.43, 6.74],
  ['Grasse', 43.66, 6.92], ['Menton', 43.77, 7.5], ['Saint-Malo', 48.65, -2.03],
  ['Compiegne', 49.42, 2.82], ['Melun', 48.54, 2.66], ['Meaux', 48.96, 2.88],
  ['Chartres', 48.44, 1.49], ['Auxerre', 47.8, 3.57], ['Nevers', 46.99, 3.16],
  ['Roanne', 46.04, 4.07], ['Vichy', 46.13, 3.43], ['Montlucon', 46.34, 2.6],
  ['Perigueux', 45.18, 0.72], ['Agen', 44.2, 0.62], ['Bergerac', 44.85, 0.48],
  ['Brive-la-Gaillarde', 45.16, 1.53], ['Rodez', 44.35, 2.57], ['Ales', 44.13, 4.08],
  ['Gap', 44.56, 6.08], ['Draguignan', 43.54, 6.47], ['Salon-de-Provence', 43.64, 5.1],
  ['Martigues', 43.4, 5.05], ['Istres', 43.51, 4.99], ['Vienne', 45.52, 4.87],
  ['Bourg-en-Bresse', 46.2, 5.23], ['Macon', 46.31, 4.83], ['Dole', 47.09, 5.49],
  ['Epinal', 48.17, 6.45], ['Thionville', 49.36, 6.17], ['Haguenau', 48.82, 7.79],
  ['Saint-Brieuc', 48.51, -2.77], ['Morlaix', 48.58, -3.83], ['Concarneau', 47.87, -3.92],
  ['Fougeres', 48.35, -1.2], ['Alencon', 48.43, 0.09], ['Lisieux', 49.15, 0.23],
  ['Dieppe', 49.92, 1.08], ['Abbeville', 50.11, 1.83], ['Soissons', 49.38, 3.32],
  ['Laon', 49.56, 3.62], ['Sedan', 49.7, 4.94], ['Verdun', 49.16, 5.38],
  ['Bar-le-Duc', 48.77, 5.16], ['Sens', 48.2, 3.28], ['Saint-Raphael', 43.42, 6.77],
  ['Bastia', 42.7, 9.45], ['Tarascon', 43.8, 4.66], ['Douai', 50.37, 3.08],
  ['Valenciennes', 50.36, 3.52], ['Lens', 50.43, 2.83], ['Bethune', 50.53, 2.64],
  ['Boulogne-sur-Mer', 50.73, 1.61], ['Cambrai', 50.17, 3.23], ['Maubeuge', 50.28, 3.97],
  // Belgique, Suisse, Luxembourg, Québec — souvent présents dans les annonces FR
  ['Bruxelles', 50.85, 4.35], ['Anvers', 51.22, 4.4], ['Gand', 51.05, 3.72],
  ['Charleroi', 50.41, 4.44], ['Liege', 50.63, 5.57], ['Bruges', 51.21, 3.22],
  ['Namur', 50.47, 4.87], ['Mons', 50.45, 3.95], ['Louvain', 50.88, 4.7],
  ['Geneve', 46.2, 6.14], ['Lausanne', 46.52, 6.63], ['Zurich', 47.37, 8.54],
  ['Berne', 46.95, 7.45], ['Bale', 47.56, 7.59], ['Neuchatel', 46.99, 6.93],
  ['Fribourg', 46.8, 7.15], ['Sion', 46.23, 7.36], ['Luxembourg', 49.61, 6.13],
  ['Montreal', 45.5, -73.57], ['Quebec', 46.81, -71.21]
];

// Départements français → chef-lieu, pour interpréter « (75) », « dept 33 », « 59 ».
const DEPARTMENTS = {
  '01': 'Bourg-en-Bresse', '02': 'Laon', '03': 'Montlucon', '04': 'Digne',
  '05': 'Gap', '06': 'Nice', '07': 'Valence', '08': 'Charleville-Mezieres',
  '09': 'Foix', '10': 'Troyes', '11': 'Carcassonne', '12': 'Rodez',
  '13': 'Marseille', '14': 'Caen', '15': 'Aurillac', '16': 'Angouleme',
  '17': 'La Rochelle', '18': 'Bourges', '19': 'Brive-la-Gaillarde', '21': 'Dijon',
  '22': 'Saint-Brieuc', '23': 'Gueret', '24': 'Perigueux', '25': 'Besancon',
  '26': 'Valence', '27': 'Evreux', '28': 'Chartres', '29': 'Quimper',
  '30': 'Nimes', '31': 'Toulouse', '32': 'Auch', '33': 'Bordeaux',
  '34': 'Montpellier', '35': 'Rennes', '36': 'Chateauroux', '37': 'Tours',
  '38': 'Grenoble', '39': 'Dole', '40': 'Mont-de-Marsan', '41': 'Blois',
  '42': 'Saint-Etienne', '43': 'Le Puy-en-Velay', '44': 'Nantes', '45': 'Orleans',
  '46': 'Cahors', '47': 'Agen', '48': 'Mende', '49': 'Angers',
  '50': 'Cherbourg', '51': 'Reims', '52': 'Chaumont', '53': 'Laval',
  '54': 'Nancy', '55': 'Bar-le-Duc', '56': 'Vannes', '57': 'Metz',
  '58': 'Nevers', '59': 'Lille', '60': 'Beauvais', '61': 'Alencon',
  '62': 'Arras', '63': 'Clermont-Ferrand', '64': 'Pau', '65': 'Tarbes',
  '66': 'Perpignan', '67': 'Strasbourg', '68': 'Mulhouse', '69': 'Lyon',
  '70': 'Vesoul', '71': 'Chalon-sur-Saone', '72': 'Le Mans', '73': 'Chambery',
  '74': 'Annecy', '75': 'Paris', '76': 'Rouen', '77': 'Melun',
  '78': 'Versailles', '79': 'Niort', '80': 'Amiens', '81': 'Albi',
  '82': 'Montauban', '83': 'Toulon', '84': 'Avignon', '85': 'La Roche-sur-Yon',
  '86': 'Poitiers', '87': 'Limoges', '88': 'Epinal', '89': 'Auxerre',
  '90': 'Belfort', '91': 'Evry', '92': 'Nanterre', '93': 'Saint-Denis',
  '94': 'Creteil', '95': 'Argenteuil'
};

// Expressions régionales courantes dans les annonces.
const REGION_ALIASES = {
  'idf': 'Paris', 'ile de france': 'Paris', 'region parisienne': 'Paris',
  'rp': 'Paris', 'paname': 'Paris', 'sud de la france': 'Marseille',
  'cote d azur': 'Nice', 'paca': 'Marseille', 'bretagne': 'Rennes',
  'normandie': 'Rouen', 'alsace': 'Strasbourg', 'occitanie': 'Toulouse',
  'nouvelle aquitaine': 'Bordeaux', 'hauts de france': 'Lille',
  'grand est': 'Strasbourg', 'pays de la loire': 'Nantes',
  'auvergne rhone alpes': 'Lyon', 'centre val de loire': 'Orleans',
  'bourgogne': 'Dijon', 'corse': 'Ajaccio', 'wallonie': 'Namur',
  'romandie': 'Lausanne', 'suisse romande': 'Lausanne'
};

if (typeof window !== 'undefined') {
  window.CITIES = CITIES;
  window.DEPARTMENTS = DEPARTMENTS;
  window.REGION_ALIASES = REGION_ALIASES;
}
if (typeof module !== 'undefined') {
  module.exports = { CITIES, DEPARTMENTS, REGION_ALIASES };
}
