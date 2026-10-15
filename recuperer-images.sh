#!/bin/sh
# Télécharge les fichiers binaires du site (images, logo SVG) depuis le site en ligne.
# L'API Hostinger ne renvoie que les fichiers texte ; ceux-ci doivent venir du site public.
set -e
cd "$(dirname "$0")"
BASE=https://laparentheseauvert.com
for f in \
  assets/img/logo.svg assets/img/logo-original.png \
  assets/img/village-eglise.jpg assets/img/pause-sous-arbre.jpg assets/img/ciel-rose.jpg \
  assets/img/chambre-bleue.jpg assets/img/etang-couchant.jpg assets/img/sentier-chien.jpg \
  assets/img/chambre-fenetre.jpg assets/img/toits-eglise.jpg assets/img/arbres-tetards.jpg \
  assets/img/marche-champ.jpg \
  assets/img/immersif/cercle-parole.jpg assets/img/immersif/cuisine-ensemble.jpg \
  assets/img/immersif/marche-nordique.jpg assets/img/immersif/feu-de-camp.jpg \
  assets/img/immersif/colza-village.jpg \
  assets/img/equipe/sabrina.jpg assets/img/equipe/christophe.jpg assets/img/equipe/emilie.jpg \
  assets/img/equipe/isabelle.jpg assets/img/equipe/giuliano.jpg
do
  mkdir -p "$(dirname "$f")"
  curl -fsS -o "$f" "$BASE/$f" && echo "ok  $f" || echo "ÉCHEC $f"
done
