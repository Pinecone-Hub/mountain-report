---
title: Déclaration d'accessibilité
description: État de l'accessibilité de ce site de démonstration, méthode
  d'évaluation, limites connues et moyen de signaler un problème.
---

## État de conformité

La présente déclaration a été établie le 25 novembre 2026 et mise à jour le 26 novembre 2026. Le site vise la conformité au niveau AA des Règles pour l'accessibilité des contenus Web (WCAG) 2.2. Il s'agit d'un site de démonstration et non d'un service en production. La présente déclaration décrit l'état de la démonstration à cette date.

## Méthode d'évaluation

Des tests automatisés au moyen d'axe-core, exécutés avec Playwright dans les navigateurs Chromium, Firefox et WebKit, ont porté sur toutes les pages du site en anglais et en français, ainsi que sur le Résumé en arabe. Chaque page a été testée dans une fenêtre d'affichage de bureau et dans une fenêtre d'affichage mobile, au regard des règles des WCAG 2.0, 2.1 et 2.2 aux niveaux A et AA. À la date de la présente déclaration, ces tests n'ont relevé aucune non-conformité.

Des vérifications automatisées au clavier confirment que :

- la première pression sur la touche Tab mène au lien d'évitement ;
- les vignettes de la page d'accueil, la table des matières, les notes de bas de page et le sélecteur de langue fonctionnent avec les touches Tab et Entrée ;
- les infobulles des termes calibrés du GIEC s'ouvrent à la prise de focus et se ferment avec la touche Échap ;
- les liens de citation mènent à la référence et permettent de revenir au texte ;
- le graphique peut être lu avec les touches fléchées ;
- la visionneuse de figures s'ouvre, se ferme avec la touche Échap et rend le focus ;
- les entrées de la FAQ s'ouvrent au clavier ;
- la recherche peut être utilisée au clavier, du champ de recherche jusqu'à un résultat.

Une vérification manuelle au clavier a été effectuée le 26 novembre 2026 dans Safari sous macOS. Elle a porté sur le lien d'évitement, la visibilité du focus, les vignettes de la page d'accueil, le graphique, la visionneuse de figures et le sélecteur de langue. Aucun problème n'a été relevé.

Google Lighthouse (version mobile) a attribué un score d'accessibilité de 100 à la page d'accueil, au Résumé et au chapitre 1.

Le site n'a pas été testé avec un lecteur d'écran. À la place, une vérification automatisée a relevé les noms et les rôles que le navigateur transmet aux technologies d'assistance pour le lien d'évitement, les repères de la page, le sélecteur de langue, les figures et leurs légendes, le graphique et l'année qu'il affiche, les liens vers les notes de bas de page et vers les citations, les infobulles des termes calibrés, la recherche et le bouton vidéo. Cette vérification ne remplace pas des tests avec un lecteur d'écran.

## Fonctions d'accessibilité

- Chaque page comporte un repère principal et un lien d'évitement.
- Chaque page comporte un seul titre de premier niveau.
- Le focus clavier est visible.
- Les figures disposent d'un texte de remplacement, d'une légende, d'une description détaillée et d'un tableau de données.
- Les graphiques fonctionnent sans JavaScript, sous forme d'images accompagnées de leurs tableaux de données. La lecture interactive des graphiques nécessite JavaScript.
- Le contenu fonctionne sans JavaScript, à l'exception de la recherche et de l'affichage de l'année sur les graphiques.
- Le site respecte le paramètre de réduction des animations.
- Le texte et les couleurs respectent les exigences de contraste du niveau AA.
- Le site est disponible en anglais et en français, avec un Résumé en arabe présenté de droite à gauche.

## Limites connues

- Le site n'a pas été testé avec un lecteur d'écran.
- Le Résumé en arabe a été traduit automatiquement à des fins de démonstration et n'a pas été révisé par un traducteur.
- Les fichiers PDF téléchargeables sont des fichiers provisoires et ne sont pas balisés pour l'accessibilité.
- La recherche nécessite JavaScript.
- Les pages de l'éditeur de contenu (admin et admin-demo) utilisent Decap CMS, une interface tierce. Elles ne sont pas couvertes par la présente déclaration.
- Les vidéos proviennent de YouTube et ne se chargent qu'après un clic. Leurs sous-titres dépendent de l'éditeur d'origine.

## Signaler un problème

Pour signaler un problème d'accessibilité, veuillez écrire à l'adresse [hello@pinecone.lu](mailto:hello@pinecone.lu).
