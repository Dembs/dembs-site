# Refonte mobile-first de dembs.fr

Date : 29 août 2026  
Statut : conception validée, en attente de validation du document avant planification

## 1. Objectif

Transformer dembs.fr en une vitrine personnelle rapide et mobile-first, pensée en priorité pour les visiteurs venant de TikTok.

La page doit permettre à une personne de comprendre immédiatement :

- que Dembs est développeur d’applications ;
- qu’il conçoit et publie réellement ses propres produits ;
- qu’elle peut obtenir une aide adaptée à l’étape où se trouve son projet ;
- qu’elle peut accéder directement au contenu mentionné dans une vidéo ;
- que le site pourra accueillir de nouvelles offres, ressources et recommandations sans nouvelle refonte.

La page ne doit pas ressembler à un catalogue de liens, à une agence généraliste ou à un portfolio surchargé.

## 2. Positionnement

Dembs est présenté comme un développeur qui construit, publie et documente ses propres applications, puis accompagne d’autres personnes dans ce parcours.

L’intelligence artificielle est un outil important de sa pratique, mais elle ne remplace pas son identité de développeur. Le site évite donc les formulations génériques comme « expert IA » et les codes visuels artificiellement associés au hacking.

Le parcours réel est exprimé par des faits courts, à un endroit secondaire de la page :

> Formé au développement · Première app créée sans IA · 4 apps au compteur

Cette formulation ne suggère pas d’expérience professionnelle salariée qui n’existe pas.

## 3. Message principal

Le hero utilise le contenu validé suivant :

> Développeur d’applications  
> Je crée des apps. Et je les mène jusqu’aux stores.  
> Je partage le processus et j’accompagne ceux qui veulent lancer la leur.

L’action principale conduit vers la partie qui aide le visiteur à identifier son besoin. L’action secondaire permet d’explorer les applications.

## 4. Architecture de la page

### 4.1 En-tête

- Logo ou mot-symbole « dembs. » à gauche.
- Bouton hamburger à droite, y compris sur mobile.
- Menu contenant les raccourcis utiles : applications, accompagnements, ressources et réseaux.
- Le menu s’ouvre comme un panneau léger, reste utilisable au clavier, se ferme avec Échap et expose correctement son état aux technologies d’assistance.

### 4.2 Hero

- Positionnement et message principal validés.
- Preuves courtes : quatre apps créées, deux présentes sur les stores, construction documentée publiquement.
- Action principale vers « Tu en es où ? ».
- Action secondaire vers les applications.
- Le hero est visible immédiatement et ne dépend pas d’une animation au scroll.

### 4.3 Mise en avant contextuelle

Un bloc « Vu dans ma dernière vidéo » peut apparaître juste après le hero.

Un lien tel que `https://dembs.fr/?focus=hebergeur` sélectionne une campagne connue. Chaque campagne possède :

- un identifiant stable ;
- une catégorie ou un court libellé ;
- un titre ;
- une description courte ;
- un libellé d’action ;
- une URL de destination ;
- éventuellement une mention d’affiliation.

Sans paramètre, le bloc peut être masqué ou afficher la priorité configurée pour la semaine. Un identifiant inconnu ou incomplet masque le bloc sans produire d’erreur visible. Les URL et contenus sont définis localement ; aucune valeur arbitraire reçue dans l’URL n’est injectée dans la page.

### 4.4 Aiguillage « Tu en es où ? »

Trois entrées sont affichées :

- J’ai une idée d’app — cadrer avant de construire.
- Je construis mais je bloque — débloquer un point précis.
- Je veux passer les stores — éviter les refus et les semaines perdues.

La première et la deuxième orientent vers l’accompagnement le plus pertinent. La troisième conduit en priorité vers le guide gratuit, puis vers la possibilité de réserver un appel.

### 4.5 Applications

Le carrousel existant est conservé dans son principe, mais redessiné.

- Il défile doucement en boucle.
- Le toucher ou le clic sélectionne une application sans être confondu avec un geste de glissement.
- Le défilement se met temporairement en pause pendant une interaction.
- L’application active est clairement identifiable.
- Sa fiche apparaît sous le rail, avec icône, nom, catégorie, description et statut.
- Pour une app publiée, les destinations App Store et Google Play remontent avec un léger décalage après l’ouverture de la fiche.
- Les deux destinations restent explicitement visibles : aucune détection automatique du système ne cache une plateforme.
- Pour une app non publiée, les boutons sont remplacés par son statut réel.

L’apparition recommandée dure environ 280 ms, puis le second bouton suit environ 70 ms plus tard. Elle reste sobre et ne fait pas rebondir l’interface.

### 4.6 Accompagnements

Les offres sont formulées par résultat plutôt que comme un catalogue abstrait.

Contenu de lancement :

- Appel de cadrage — 45 minutes pour clarifier l’idée, le périmètre et la prochaine étape.
- Accompagnement personnalisé — de l’idée à la publication, sans prix affiché tant que le format commercial n’est pas arrêté.
- Montage vidéo accéléré par l’IA — présence secondaire « en préparation », sans gros appel à l’action ni fausse urgence.

Lorsque la formation au montage est prête, la mention pourra devenir une carte complète avec liste d’attente, puis conduire vers sa propre page de vente.

### 4.7 Ressources gratuites

Une grille extensible accueille le guide existant et les prochaines ressources.

Le premier contenu est le guide sur les erreurs de publication App Store et Google Play. Chaque ressource possède un type, un titre, une courte promesse et une action explicite.

### 4.8 Outils et recommandations

Cette section reste visuellement secondaire. Elle n’est affichée que lorsqu’au moins une recommandation réelle est prête.

- Chaque outil indique clairement à quoi il sert dans les projets de Dembs.
- Un lien affilié est signalé sans ambiguïté.
- Une campagne TikTok peut pointer directement vers une recommandation précise et la faire remonter dans le bloc contextuel.

### 4.9 Pied de page

- TikTok, Instagram et YouTube.
- Mentions légales.
- Formulation courte rappelant que la construction est documentée publiquement.

## 5. Direction visuelle

Direction retenue : « Source claire ».

### Palette

- Nuage — `#F4F7FB`, fond principal.
- Encre — `#10233F`, texte principal et surfaces très contrastées.
- Cobalt — `#2864DC`, actions et repères actifs.
- Brume — `#DCE7FF`, fiches et surfaces secondaires.
- Ardoise — `#53647A`, texte secondaire.

Les couleurs propres à chaque application restent utilisées dans sa fiche afin de préserver son identité.

### Typographie

- Bricolage Grotesque pour les grands titres, avec une utilisation mesurée.
- IBM Plex Sans pour le texte courant et les contrôles.
- IBM Plex Mono pour les petits statuts, libellés techniques et preuves factuelles.

La hiérarchie repose sur la taille, l’espacement et le contraste plutôt que sur une accumulation de décorations.

### Signature

Le seul élément volontairement distinctif est la carte évolutive « en construction / vu dans ma dernière vidéo ». Elle donne au site un caractère vivant et reflète la pratique de construction publique de Dembs.

Le reste de l’interface est calme, clair et précis.

## 6. Mouvement

Les sections apparaissent progressivement pendant le défilement :

- opacité de 0 à 1 ;
- translation verticale de 16 px à 0 ;
- durée d’environ 420 ms ;
- décalage d’environ 70 ms entre les cartes d’un même groupe ;
- exécution une seule fois par élément.

Le mouvement ne doit jamais masquer durablement le contenu. Sans JavaScript, les éléments sont visibles par défaut. Avec `prefers-reduced-motion: reduce`, le défilement automatique du carrousel et toutes les transitions non essentielles sont désactivés.

## 7. Structure technique

Le projet reste statique, sans framework ni étape de compilation.

- `index.html` : structure sémantique et contenu essentiel.
- `assets/css/site.css` : tokens, composants, responsive et mouvement.
- `assets/js/content.js` : données des applications et campagnes temporaires.
- `assets/js/site.js` : navigation, campagne active, carrousel et révélations au scroll.

Le contenu principal reste présent dans le HTML pour le référencement, la robustesse et la lecture sans JavaScript. Les données JavaScript sont réservées aux éléments qui nécessitent réellement un comportement dynamique.

Les composants visuels utilisent des classes réutilisables pour permettre l’ajout d’une offre, d’une ressource ou d’une recommandation sans réécrire leurs styles.

## 8. Résilience et accessibilité

- La page reste compréhensible si JavaScript échoue.
- Le menu annonce son état ouvert ou fermé et gère Échap.
- Les contrôles du carrousel sont de vrais boutons.
- Les zones tactiles mesurent au moins 44 px.
- Le focus clavier reste visible.
- Les informations ne reposent pas uniquement sur la couleur.
- La fiche d’application utilise une région annoncée sans provoquer de lecture excessive.
- Les liens externes sont identifiables et sûrs.
- Une campagne absente, inconnue ou incomplète est ignorée proprement.

## 9. Responsive et performance

La conception est vérifiée en priorité à 360, 390 et 430 px, puis sur tablette et ordinateur.

- Aucun défilement horizontal involontaire en dehors du carrousel.
- Aucun texte essentiel tronqué.
- Les boutons restent confortables avec une seule main.
- Les polices sont chargées avec une stratégie non bloquante et des familles de secours métriquement proches.
- Les icônes d’app existantes sont réutilisées et dimensionnées explicitement pour limiter les décalages de mise en page.
- Aucune bibliothèque JavaScript ou animation tierce n’est ajoutée.

## 10. Vérification

Avant livraison :

1. Vérifier chaque section et chaque lien sur les largeurs 360, 390 et 430 px.
2. Tester le menu au clavier, à la souris et au tactile.
3. Tester la sélection, le glissement, la pause et la reprise du carrousel.
4. Tester les apps publiées et non publiées.
5. Tester une campagne valide, une campagne inconnue et l’absence de paramètre `focus`.
6. Tester avec JavaScript désactivé.
7. Tester `prefers-reduced-motion: reduce`.
8. Vérifier les contrastes, le focus et les tailles de cibles tactiles.
9. Vérifier l’absence d’erreur JavaScript et de lien cassé.
10. Contrôler visuellement une capture mobile et une capture desktop avant de conclure.

## 11. Hors périmètre immédiat

- Paiement et vente directe sur le site.
- Système de gestion de contenu ou interface d’administration.
- Collecte d’adresses pour la formation montage tant qu’aucune destination de liste d’attente n’est fournie.
- Page de vente complète pour la formation montage.
- Tableau de bord analytique.
- Publication automatique de campagnes depuis TikTok.

Ces fonctions pourront être ajoutées plus tard sans remettre en cause la structure de la page.
