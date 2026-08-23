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

Automatique : chaque `push` sur `main` declenche `.github/workflows/deploy.yml`, qui envoie
les fichiers modifies en FTPS chez OVH.

    git add -A
    git commit -m "ce que j'ai change"
    git push

Suivre le deploiement : `gh run watch`, ou l'onglet Actions du depot.

### Ce dont le workflow a besoin (a definir une seule fois)

Depot GitHub, Settings > Secrets and variables > Actions :

| Nom | Type | Valeur |
|---|---|---|
| `FTP_SERVER` | secret | `ftp.clusterXXX.hosting.ovh.net`, onglet FTP-SSH d'OVH |
| `FTP_USERNAME` | secret | le login FTP OVH |
| `FTP_PASSWORD` | secret | le mot de passe FTP OVH |
| `FTP_SERVER_DIR` | variable | le dossier racine, si different de `./www/` |

Le dossier racine se lit dans OVH, onglet Multisite, colonne « Dossier racine » de
`www.dembs.fr`.

### Premiere mise en ligne

Le tout premier envoi transfere tout le site. Les suivants ne transferent que les fichiers
modifies : l'action tient un etat de synchronisation sur le serveur.

Activer aussi le certificat SSL Let's Encrypt : OVH, Hebergements, onglet Multisite,
colonne SSL, « Regenerer le certificat SSL ». Sans ca le port 443 reste ferme.

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
