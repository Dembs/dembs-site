# dembs.fr

Site vitrine statique, une seule page. Aucune dependance, aucun build : ce dossier est
directement le contenu a mettre a la racine web.

## Contenu

    index.html                 structure et contenu essentiel de la page
    assets/css/site.css        styles mobile-first, composants et animations
    assets/js/content.js       donnees des applications et campagnes TikTok
    assets/js/site.js          menu, campagne, carrousel et revelations au defilement
    assets/icons/              les 4 icones d'apps, 256x256
    assets/symbole-dembs.svg   symbole de marque et favicon
    tests/                     contrats de contenu, de balisage et de comportement
    mentions-legales.html
    CNAME
    robots.txt
    sitemap.xml

Le site reste statique, sans dependance d'execution ni etape de build. Les contenus
d'applications et de campagnes se configurent dans `assets/js/content.js`; le HTML
conserve le contenu essentiel utilise lorsque JavaScript n'est pas disponible.

## Deploiement

Heberge par GitHub Pages, servi sur https://dembs.fr .
Chaque `push` sur `main` declenche `.github/workflows/deploy.yml`, qui publie le site.

    git add -A
    git commit -m "ce que j'ai change"
    git push

Suivre le deploiement : `gh run watch`, ou l'onglet Actions du depot.

Le fichier `CNAME` a la racine porte le domaine personnalise. Ne pas le supprimer :
sans lui, GitHub sert le site sur dembs.github.io/dembs-site.

### DNS (chez OVH, une seule fois)

Zone de `dembs.fr` :

| Type | Sous-domaine | Cible |
|---|---|---|
| A | (vide) | 185.199.108.153 |
| A | (vide) | 185.199.109.153 |
| A | (vide) | 185.199.110.153 |
| A | (vide) | 185.199.111.153 |
| CNAME | www | dembs.github.io. |

A ne pas toucher : les MX `mx0` a `mx3.mail.ovh.net`, le TXT SPF, et
l'enregistrement A de `ressources.dembs.fr` qui sert le guide.

## Apercu local avant de pousser

    python -m http.server 8777

puis http://127.0.0.1:8777/ . Ne pas ouvrir le fichier en `file://`, le rendu differe.

Lancer aussi la suite de verification avant de pousser :

    npm test

## Mettre un contenu TikTok en avant

1. Ajouter une entrée complète dans `CAMPAIGNS` dans `assets/js/content.js`.
2. Tester `http://127.0.0.1:8777/?focus=<identifiant>`.
3. Placer `https://dembs.fr/?focus=<identifiant>` dans la bio.
4. Signaler `affiliate: true` pour tout lien affilié.
5. Supprimer l’entrée de `CAMPAIGNS` lorsque la campagne n’est plus utilisée. Il
   n’existe pas de drapeau de désactivation : un identifiant absent est ignoré et le
   bloc contextuel reste masqué.

## Ajouter une recommandation

Les recommandations ne viennent pas d’une configuration JavaScript. Quand un outil,
son usage réel et sa destination sont approuvés :

1. Ajouter manuellement sa carte dans le conteneur `[data-recommendation-list]` de
   `index.html` avec un titre, l’usage concret dans les projets et un lien HTTPS réel.
2. Ajouter la mention `Lien affilié` dans la carte si la destination est affiliée.
3. Retirer l’attribut `hidden` de la section `#recommendations` seulement quand au
   moins une carte complète est présente.
4. Pour retirer la dernière recommandation, supprimer sa carte puis remettre
   l’attribut `hidden` sur la section.

## A finir

- Creer la boite mail contact@dembs.fr dans l'espace OVH : elle est publiee dans les
  mentions legales, elle doit fonctionner avant la mise en ligne.
- Mentions legales, ligne TVA : decommenter la mention de franchise en base (article 293 B)
  ou la remplacer par le numero de TVA intracommunautaire.
- Passer l'evenement cal.com de 30 a 45 minutes, la page affiche 45 min.
- Recommandations : ne publier une carte qu’après validation de son contenu et de sa
  destination réelle. Aucune mention de Wayhost.
