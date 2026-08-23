# dembs.fr

Site vitrine statique, une seule page. Aucune dependance, aucun build : ce dossier est
directement le contenu a mettre a la racine web.

## Contenu

    index.html          la page (HTML + CSS + JS inline)
    mentions-legales.html
    assets/icons/       les 4 icones d'apps, 256x256
    robots.txt
    sitemap.xml

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

## A finir

- Creer la boite mail contact@dembs.fr dans l'espace OVH : elle est publiee dans les
  mentions legales, elle doit fonctionner avant la mise en ligne.
- Mentions legales, ligne TVA : decommenter la mention de franchise en base (article 293 B)
  ou la remplacer par le numero de TVA intracommunautaire.
- Passer l'evenement cal.com de 30 a 45 minutes, la page affiche 45 min.
- Section « Ce que j'utilise » : ecrite mais commentee dans `index.html`, a reactiver
  quand un partenariat sera signe. Aucune mention de Wayhost.
