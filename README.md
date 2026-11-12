# StudyMind AI: Assistant intelligent de révision

**Une application web conçue pour aider les étudiants à apprendre, comprendre et réviser leurs cours grâce à l'intelligence artificielle.**

**Développé par :** TCHANA EMMANUELLE
**Formation :** Étudiante en informatique au CESI
**Statut :** Projet personnel en développement

---

## Présentation du projet

StudyMind AI est une application d'accompagnement pédagogique qui permet aux étudiants de centraliser leurs cours et de faciliter leurs révisions.

L'objectif est de proposer un environnement de travail intuitif qui combine organisation, apprentissage et intelligence artificielle.

L'application utilise des modèles d'IA exécutés localement pour analyser les documents et proposer des explications adaptées aux questions des utilisateurs.

## Fonctionnalités

- **Bibliothèque de cours :** importer et consulter des documents PDF.
- **Ask AI :** poser des questions et obtenir des explications sur différentes matières.
- **Fiches de révision :** générer des synthèses structurées à partir des cours.
- **Flashcards :** créer des questions-réponses pour mémoriser les notions importantes.
- **Examens blancs :** s'entraîner avec des questions générées par l'IA et recevoir des corrections.
- **Recherche Web :** compléter certaines réponses avec des ressources en ligne.
- **Calendrier :** organiser les séances de révision.
- **Focus Timer :** améliorer la concentration grâce à un minuteur de travail.

*Certaines fonctionnalités IA sont encore en phase de test et d'amélioration.*

## Technologies utilisées

| Technologie | Utilisation                                           |
| ----------- | ----------------------------------------------------- |
| React       | Interface utilisateur                                 |
| Vite        | Environnement de développement                        |
| JavaScript  | Fonctionnalités de l'application                      |
| CSS         | Design et mise en page                                |
| Python      | Serveur local et fonctionnalités IA                   |
| Ollama      | Exécution des modèles d'intelligence artificielle     |
| Qwen        | Génération d'explications et de contenus pédagogiques |
| SymPy       | Vérification de certains calculs mathématiques        |

## Installation et lancement

### Prérequis

- Node.js et npm
- Python 3
- Ollama
- Git

### 1. Récupérer le projet

```bash
git clone https://github.com/Skyline000002/STUDYMIND-AI.git
cd STUDYMIND-AI
```

### 2. Installer les dépendances React

```bash
npm install
```

### 3. Installer les dépendances Python

```bash
python -m pip install sympy
```

### 4. Installer un modèle IA avec Ollama

```bash
ollama pull qwen3.5:2b
```

Le modèle est exécuté localement sur l'ordinateur de l'utilisateur.

### 5. Démarrer le serveur Python

Sous Windows :

```powershell
py -3 .\StudyMind-local-ai.py
```

### 6. Démarrer l'application React

Dans un deuxième terminal :

```powershell
npm.cmd run dev
```

Ouvrir ensuite l'adresse locale affichée par Vite dans le terminal.

## Fonctionnement de l'intelligence artificielle

StudyMind AI combine plusieurs approches :

- L'analyse du contenu des documents importés.
- La génération de réponses avec des modèles locaux.
- La vérification de certaines expressions mathématiques.
- La consultation de ressources Web selon les fonctionnalités configurées.

L'objectif est de fournir des réponses pédagogiques et compréhensibles.

**Important :** les réponses générées par l'IA peuvent contenir des erreurs. Les résultats importants doivent être vérifiés, notamment dans les matières scientifiques.

## État d'avancement

Le projet est actuellement en développement.

Les prochaines améliorations concernent :

- La fiabilité des réponses de l'assistant IA.
- La pertinence des flashcards et des examens blancs.
- La qualité des corrections personnalisées.
- Le suivi des progrès des étudiants.
- L'amélioration de l'expérience utilisateur.

##

---

