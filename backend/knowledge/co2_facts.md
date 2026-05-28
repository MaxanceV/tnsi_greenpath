# Base de connaissances CO₂ et empreinte carbone

Ce document contient des faits, ordres de grandeur et bonnes pratiques utilisés
par le chatbot RAG de GreenPath. Sources principales : Base Empreinte de l'ADEME
(Agence de la transition écologique) et Bilan Carbone V8.

---

## Facteurs d'émission par mode de transport (par tonne·km)

Le calcul est : (poids en tonnes) × (distance en km) × (facteur ci-dessous).

- **Avion (fret aérien long-courrier)** : 1.50 kg CO₂eq / t·km. C'est le mode
  le plus émetteur, environ 100 fois plus que le transport maritime.
- **Camion (routier moyen)** : 0.10 kg CO₂eq / t·km. Dominant en Europe pour
  les distances courtes et moyennes (< 1000 km).
- **Train de fret** : 0.025 kg CO₂eq / t·km. Très peu émetteur grâce à
  l'électrification du réseau, particulièrement en France.
- **Bateau (cargo, porte-conteneurs)** : 0.015 kg CO₂eq / t·km. Le mode le
  moins émetteur pour de longues distances internationales.
- **Aucun transport** : 0 kg CO₂eq.

### Comparaison concrète

Transporter 1 tonne de marchandise sur 10 000 km :
- Par avion : 15 000 kg CO₂eq (15 tonnes !)
- Par camion : 1 000 kg CO₂eq
- Par bateau : 150 kg CO₂eq
- Par train : 250 kg CO₂eq

**Conclusion** : pour les produits importés de loin (cacao, café, coton), le
mode maritime est largement préférable à l'avion. Un produit transporté par
bateau peut être moins émetteur qu'un produit transporté par camion sur
de longues distances européennes.

---

## Facteurs d'émission par type d'étape (par kg de produit)

GreenPath utilise les facteurs simplifiés suivants pour les étapes non
transport :

- **Matière première** : 4.0 kg CO₂eq / kg. Englobe la culture, l'extraction
  ou la collecte des matières premières.
- **Fabrication** : 5.0 kg CO₂eq / kg. Inclut la transformation, l'assemblage
  ou l'emballage.
- **Distribution** : 0.2 kg CO₂eq / kg. Étape finale légère (stockage,
  manutention en magasin).

### Ordres de grandeur sectoriels (réels, ADEME)

- **Textile coton** : 5 à 15 kg CO₂eq / kg de tissu (selon le pays de culture)
- **Coton bio** : environ 30 % de moins que le coton conventionnel
- **Bœuf** : 27 à 35 kg CO₂eq / kg de viande
- **Volaille** : 5 à 7 kg CO₂eq / kg
- **Fromage** : 10 à 15 kg CO₂eq / kg
- **Légumes locaux de saison** : 0.3 à 1 kg CO₂eq / kg
- **Légumes hors saison ou serre chauffée** : 2 à 5 kg CO₂eq / kg
- **Smartphone neuf** : 60 à 80 kg CO₂eq par appareil
- **Smartphone reconditionné** : 8 à 15 kg CO₂eq (gain de 70 à 90 %)
- **Ordinateur portable neuf** : 200 à 350 kg CO₂eq
- **Ordinateur reconditionné** : 30 à 50 kg CO₂eq

---

## Empreinte moyenne d'un Français

- Empreinte carbone annuelle moyenne en France : **~9 tonnes CO₂eq / an**
- Objectif accord de Paris pour rester sous 2 °C : **2 tonnes / an / habitant**
  d'ici 2050.
- Répartition typique :
  - Transports : 28 %
  - Logement (chauffage, électricité) : 23 %
  - Alimentation : 22 %
  - Biens et services : 19 %
  - Services publics : 8 %

---

## Comparaisons concrètes (par produit)

- Un T-shirt en coton classique : 5 à 10 kg CO₂eq selon la chaîne logistique
- Une paire de jeans neuve : 20 à 35 kg CO₂eq
- Une tablette de chocolat 100 g : 0.5 à 2 kg CO₂eq
- 1 kg de tomates en serre chauffée Pays-Bas : 5 kg CO₂eq
- 1 kg de tomates locales en saison : 0.4 kg CO₂eq
- 1 kg d'avocats importés du Mexique : 2 à 4 kg CO₂eq
- 1 kg de pommes locales : 0.3 à 0.5 kg CO₂eq

---

## Bonnes pratiques pour les entreprises

### Réduire les émissions de transport

- Privilégier le **transport maritime** ou **ferroviaire** pour les longues
  distances internationales
- **Mutualiser** les flux avec d'autres entreprises (groupage)
- Réduire les **emballages** pour optimiser le remplissage
- Choisir des **fournisseurs locaux** quand c'est possible
- Limiter le fret aérien aux produits à très forte valeur ajoutée et à
  courte durée de vie

### Réduire les émissions de fabrication

- Utiliser de l'**énergie décarbonée** (renouvelable, nucléaire)
- Optimiser les procédés (récupération de chaleur, économies d'énergie)
- Limiter le **gaspillage matière** (chutes, rejets)
- Choisir des matières premières **recyclées** ou **biosourcées**

### Réduire les émissions de matière première

- Choisir des **filières certifiées** (bio, équitable) avec meilleur bilan
- Privilégier des matières **renouvelables** plutôt que pétrosourcées
- Limiter l'usage de **métaux rares** dans l'électronique

---

## Conseils pour les consommateurs

### Faire les bons choix au magasin

- Comparer l'empreinte des produits via GreenPath avant achat
- Préférer les produits **locaux et de saison** pour les fruits et légumes
- Choisir le **reconditionné** pour l'électronique (téléphone, ordinateur)
- Limiter les **achats neufs** dans le textile, privilégier seconde main
- Pour le café/chocolat/cacao, privilégier le **fairtrade** et l'**équitable**
- Limiter les produits **transportés par avion** (souvent identifiable par
  la fraîcheur excessive ou la provenance lointaine)

### Comprendre les ordres de grandeur

- Un repas végétarien : ~0.5 à 1 kg CO₂eq
- Un repas avec viande rouge : ~5 à 7 kg CO₂eq (différence x10)
- 1 trajet Paris-Nice en avion (aller-retour) : ~300 kg CO₂eq
- 1 trajet Paris-Nice en TGV (aller-retour) : ~7 kg CO₂eq
- 1 km en voiture thermique : ~0.2 kg CO₂eq

### Petits gestes à fort impact

- Réduire la viande rouge : économie de 1 à 2 t CO₂eq / an
- Acheter du reconditionné plutôt que du neuf : 80 % d'économie sur l'appareil
- Privilégier les courts trajets en vélo ou transports en commun
- Manger local et de saison
- Acheter moins de vêtements neufs

---

## Réglementations européennes pertinentes

- **CSRD** (Corporate Sustainability Reporting Directive) : reporting
  obligatoire sur l'impact environnemental pour les grandes entreprises
  depuis 2024.
- **ESPR** (Ecodesign for Sustainable Products Regulation) : règlement
  européen de 2024 qui impose un **passeport numérique du produit** (DPP),
  incluant la traçabilité de la chaîne d'approvisionnement et l'empreinte
  environnementale. GreenPath répond directement à cette exigence.
- **CBAM** (Carbon Border Adjustment Mechanism) : taxe carbone aux
  frontières de l'UE sur les importations de certains secteurs (acier,
  ciment, électricité, aluminium, engrais, hydrogène).
- **AGEC** (loi anti-gaspillage) : impose en France un affichage
  environnemental sur les produits, le score Repair et l'indice de
  durabilité depuis 2021.

---

## Vocabulaire

- **CO₂eq** : équivalent CO₂, unité qui ramène tous les gaz à effet de serre
  (méthane CH₄, protoxyde d'azote N₂O, etc.) à leur pouvoir de réchauffement
  équivalent en CO₂. Le méthane vaut par exemple 28 CO₂eq.
- **t·km** ou **tonne-kilomètre** : unité de transport qui correspond au
  transport d'une tonne sur un kilomètre. Standard de l'ADEME pour les
  facteurs de transport.
- **Scope 1, 2, 3** : décomposition des émissions d'une entreprise :
  - Scope 1 : émissions directes (combustion sur site)
  - Scope 2 : émissions indirectes liées à l'énergie achetée
  - Scope 3 : autres émissions indirectes (achats, transport, usage produit,
    fin de vie) — souvent 80 % du total pour une entreprise industrielle.
- **ACV** (Analyse du Cycle de Vie) : méthode normalisée (ISO 14040) pour
  évaluer l'impact environnemental d'un produit sur l'ensemble de son
  cycle de vie (extraction → fin de vie).
- **PEF** (Product Environmental Footprint) : méthode européenne harmonisée
  d'évaluation environnementale des produits.
