# Vue Water System Boilerplate

Ce projet est un boilerplate pour un système de gestion d'eau utilisant Vue.js avec TypeScript. Il fournit une structure de base robuste et modulaire pour développer des applications de surveillance et de contrôle de systèmes hydrauliques.

## Table des matières

- [Vue Water System Boilerplate](#vue-water-system-boilerplate)
  - [Table des matières](#table-des-matières)
  - [Architecture](#architecture)
  - [Fonctionnalités](#fonctionnalités)
  - [Technologies utilisées](#technologies-utilisées)
  - [Prérequis](#prérequis)
  - [Installation](#installation)
  - [Développement](#développement)
    - [Scripts utiles](#scripts-utiles)
  - [Structure du projet](#structure-du-projet)
  - [Composants principaux](#composants-principaux)
  - [Tests](#tests)
  - [Contribution](#contribution)
  - [Licence](#licence)

## Architecture

L'architecture du projet est représentée par le diagramme suivant :

```mermaid
graph TD
    subgraph Composables
        useWaterSystem
        useDam
        useWaterLevelChart
    end

    subgraph Services
        damSimulation
        errorHandlingService
        loggingService
    end

    subgraph Utilitaires
        errorHandlerUtil
    end

    subgraph Domaine
        DamInterface
    end

    subgraph Composants
        WaterSystemDashboard
        DamComponent
        WaterLevelChart
        ErrorNotification
        GlobalErrorHandler
    end

    useWaterSystem -->|utilise| damSimulation
    useWaterSystem -->|utilise| errorHandlingService
    useWaterSystem -->|utilise| loggingService
    useWaterSystem -->|retourne| DamInterface

    useDam -->|utilise| errorHandlingService
    useDam -->|retourne| DamInterface

    useWaterLevelChart -->|utilise| errorHandlerUtil

    damSimulation -->|crée| DamInterface
    errorHandlingService -->|émet| ErrorDataInterface

    errorHandlerUtil -->|utilise| errorHandlingService

    WaterSystemDashboard -->|utilise| useWaterSystem
    WaterSystemDashboard -->|contient| DamComponent
    WaterSystemDashboard -->|utilise| loggingService

    DamComponent -->|utilise| DamInterface
    DamComponent -->|contient| WaterLevelChart

    WaterLevelChart -->|utilise| useWaterLevelChart

    ErrorNotification -->|utilise| errorHandlingService

    GlobalErrorHandler -->|utilise| errorHandlingService
    GlobalErrorHandler -->|contient| ErrorNotification

    subgraph Décorateurs
        errorHandler
    end

    errorHandler -->|utilise| errorHandlingService

    subgraph Configuration
        browserConfig
    end

    useWaterSystem -->|utilise| browserConfig
    useDam -->|utilise| browserConfig
    damSimulation -->|utilise| browserConfig

    subgraph Tests
        WaterSystemDashboard.spec
        useWaterSystem.spec
        useDam.spec
    end

    WaterSystemDashboard.spec -->|teste| WaterSystemDashboard
    useWaterSystem.spec -->|teste| useWaterSystem
    useDam.spec -->|teste| useDam
```

Ce diagramme illustre les relations entre les différents composants, services et utilitaires du projet.


Architecture RxJS

```mermaid
graph TD
    %% Observables
    DamState[DamState Observable<br><b>useDam.ts</b>] -->|map| CurrentWaterLevel[CurrentWaterLevel Observable<br><b>useDam.ts</b>]
    DamState -->|map| OutflowRate[OutflowRate Observable<br><b>useDam.ts</b>]
    DamState -->|map| InflowRate[InflowRate Observable<br><b>useDam.ts</b>]
    ErrorSubject[Error Subject<br><b>errorHandlingService.ts</b>] -->|asObservable| ErrorObservable[Error Observable<br><b>errorHandlingService.ts</b>]

    %% Operators and Transformations
    CurrentWaterLevel -->|distinctUntilChanged| DistinctWaterLevel[Distinct Water Level<br><b>useDam.ts</b>]
    OutflowRate -->|distinctUntilChanged| DistinctOutflow[Distinct Outflow<br><b>useDam.ts</b>]
    InflowRate -->|distinctUntilChanged| DistinctInflow[Distinct Inflow<br><b>useDam.ts</b>]

    %% Combine Latest for System State
    DistinctWaterLevel -->|combineLatest| SystemState[System State<br><b>useWaterSystem.ts</b>]
    DistinctOutflow --> SystemState
    DistinctInflow --> SystemState

    %% Error Handling
    SystemState -->|catchError| ErrorHandler[Error Handler<br><b>errorHandlerUtil.ts</b>]
    ErrorHandler -->|emitError| ErrorSubject

    %% Outputs to UI Components
    SystemState -->|subscribe| WaterSystemDashboard[(Water System Dashboard<br><b>WaterSystemDashboard.vue</b>)]
    DistinctWaterLevel -->|subscribe| WaterLevelChart[(Water Level Chart<br><b>WaterLevelChart.vue</b>)]
    ErrorObservable -->|subscribe| ErrorNotification[(Error Notification<br><b>ErrorNotification.vue</b>)]

    %% Triggers
    UserInput[User Input<br><b>initializeDam</b><br><b>useWaterSystem.ts</b>] -.->|initializeDam| DamState
    Interval[Interval Timer<br><b>damSimulation.ts</b>] -.->|updateDamState| DamState

    %% Annotations
    classDef annotation fill:#f9f,stroke:#333,stroke-width:2px;
    class MapAnnotation,FilterAnnotation,CombineAnnotation annotation;

    MapAnnotation[Map: Extract specific properties<br><b>useDam.ts</b>]
    FilterAnnotation[Filter: Remove duplicate values<br><b>useDam.ts</b>]
    CombineAnnotation[Combine: Merge latest values<br><b>useWaterSystem.ts</b>]

    DamState --> MapAnnotation
    DistinctWaterLevel --> FilterAnnotation
    SystemState --> CombineAnnotation
```

2 schémas résumant les flux d'observables et de sujets :

[![Schéma du système de barrage](docs/schema-dam.svg)](docs/schema-dam.svg)

[![Schéma en graphe du système de barrage](docs/schema-dam-graph.svg)](docs/schema-dam-graph.svg)



Schéma en code Mermaid


```mermaid
graph TD
    %% Observables et Subjects
    DamState[DamState BehaviorSubject<br><b>useDam.ts</b>] -->|map| CurrentWaterLevel[CurrentWaterLevel Observable<br><b>useDam.ts</b>]
    DamState -->|map| OutflowRate[OutflowRate Observable<br><b>useDam.ts</b>]
    DamState -->|map| InflowRate[InflowRate Observable<br><b>useDam.ts</b>]
    ErrorSubject[Error Subject<br><b>errorHandlingService.ts</b>] -->|asObservable| ErrorObservable[Error Observable<br><b>errorHandlingService.ts</b>]
    AggregatedInflow[AggregatedInflow Observable<br><b>useDam.ts</b>]

    %% Operators and Transformations
    CurrentWaterLevel -->|distinctUntilChanged| DistinctWaterLevel[Distinct Water Level<br><b>useDam.ts</b>]
    OutflowRate -->|distinctUntilChanged| DistinctOutflow[Distinct Outflow<br><b>useDam.ts</b>]
    InflowRate -->|distinctUntilChanged| DistinctInflow[Distinct Inflow<br><b>useDam.ts</b>]

    %% Combine Latest for System State
    DistinctWaterLevel -->|combineLatest| SystemState[System State Observable<br><b>useWaterSystem.ts</b>]
    DistinctOutflow --> SystemState
    DistinctInflow --> SystemState
    AggregatedInflow --> SystemState

    %% Error Handling
    SystemState -->|catchError| ErrorHandler[Error Handler<br><b>errorHandlerUtil.ts</b>]
    ErrorHandler -->|emitError| ErrorSubject

    %% Outputs to UI Components
    SystemState -->|subscribe| WaterSystemDashboard[(Water System Dashboard<br><b>WaterSystemDashboard.vue</b>)]
    DistinctWaterLevel -->|subscribe| WaterLevelChart[(Water Level Chart<br><b>WaterLevelChart.vue</b>)]
    ErrorObservable -->|subscribe| ErrorNotification[(Error Notification<br><b>ErrorNotification.vue</b>)]

    %% Triggers
    UserInput[User Input<br><b>initializeDam</b><br><b>useWaterSystem.ts</b>] -.->|initializeDam| DamState
    Interval[Interval Timer<br><b>damSimulation.ts</b>] -.->|updateDamState| DamState

    %% New Elements
    GlacierState[GlacierState BehaviorSubject<br><b>useGlacier.ts</b>] -->|map| GlacierOutflowRate[GlacierOutflowRate Observable<br><b>useGlacier.ts</b>]
    GlacierState -->|combineLatest| SystemState
    TotalWaterLevel[TotalWaterLevel Observable<br><b>useWaterSystem.ts</b>] -->|subscribe| WaterSystemDashboard

    %% Annotations
    classDef annotation fill:#f9f,stroke:#333,stroke-width:2px;
    class MapAnnotation,FilterAnnotation,CombineAnnotation,ShareReplayAnnotation annotation;

    MapAnnotation[Map: Extract specific properties<br><b>useDam.ts, useGlacier.ts</b>]
    FilterAnnotation[Filter: Remove duplicate values<br><b>useDam.ts, useGlacier.ts</b>]
    CombineAnnotation[Combine: Merge latest values<br><b>useWaterSystem.ts</b>]
    ShareReplayAnnotation[ShareReplay: Share last emission<br><b>useDam.ts, useGlacier.ts</b>]

    DamState --> MapAnnotation
    GlacierState --> MapAnnotation
    DistinctWaterLevel --> FilterAnnotation
    SystemState --> CombineAnnotation
    CurrentWaterLevel --> ShareReplayAnnotation
    GlacierOutflowRate --> ShareReplayAnnotation
```

## Fonctionnalités

- **Simulation de barrage** : Gestion dynamique des niveaux d'eau et des débits
- **Tableau de bord interactif** : Visualisation en temps réel des données du système hydraulique
- **Gestion des erreurs centralisée** : Capture et traitement unifié des erreurs à travers l'application
- **Journalisation des événements** : Enregistrement détaillé des activités du système
- **Tests unitaires et d'intégration** : Assurance qualité et fiabilité du code

## Technologies utilisées

- **Vue.js 3** : Framework JavaScript progressif pour la construction d'interfaces utilisateur
- **TypeScript** : Superset typé de JavaScript pour un développement plus robuste
- **RxJS** : Bibliothèque pour la programmation réactive
- **Chart.js** : Bibliothèque de visualisation de données
- **Biome** : Outil de linting et de formatage de code
- **Vitest** : Framework de test unitaire pour Vue.js
- **Docker** : Plateforme de conteneurisation pour le déploiement et l'exécution

## Prérequis

- Docker
- Docker Compose
- Node.js (version 18 ou supérieure)
- pnpm (gestionnaire de paquets)

## Installation

1. Clonez ce dépôt :
   ```bash
   git clone https://github.com/votre-nom/vue-water-system-boilerplate.git mon-projet
   cd mon-projet
   ```

2. Copiez le fichier .env.example en .env et ajustez les variables si nécessaire :
   ```bash
   cp .env.example .env
   ```

3. Construisez et lancez les conteneurs Docker :
   ```bash
   docker-compose -f docker/docker-compose.yml up -d --build
   ```

4. Accédez à l'application sur `http://localhost:3000` (ou le port que vous avez défini)

## Développement

Ce projet utilise Biome pour le linting et le formatage du code, ainsi que Husky et lint-staged pour assurer la qualité du code à chaque commit.

### Scripts utiles

- `pnpm dev` : Démarre le serveur de développement
- `pnpm build` : Construit l'application pour la production
- `pnpm test` : Exécute les tests unitaires
- `pnpm format:check` : Vérifie le formatage du code
- `pnpm format:write` : Formate le code automatiquement
- `pnpm docker:dev` : Lance l'environnement de développement dans Docker

## Structure du projet

```
.
├── docker/                 # Configuration Docker
├── docs/                   # Documentation supplémentaire
├── src/
│   ├── assets/             # Ressources statiques (images, styles)
│   ├── components/         # Composants Vue réutilisables
│   ├── composables/        # Logique réutilisable (hooks)
│   ├── config/             # Fichiers de configuration
│   ├── domain/             # Logique métier et interfaces
│   ├── presentation/       # Composants de présentation (pages)
│   ├── services/           # Services (API, gestion d'erreurs, etc.)
│   ├── types/              # Définitions de types TypeScript
│   └── utils/              # Fonctions utilitaires
├── tests/                  # Tests unitaires et d'intégration
└── README.md               # Ce fichier
```

## Composants principaux

- **WaterSystemDashboard** : Composant principal affichant l'ensemble du système
- **DamComponent** : Représente un barrage individuel avec ses données
- **WaterLevelChart** : Graphique montrant l'évolution du niveau d'eau
- **ErrorNotification** : Affiche les erreurs système à l'utilisateur
- **GlobalErrorHandler** : Gère la capture et l'affichage des erreurs globales

## Tests

Les tests sont écrits avec Vitest et peuvent être exécutés avec la commande `pnpm test`. Ils couvrent :

- Les composants Vue (tests unitaires et de rendu)
- Les composables (logique réutilisable)
- Les services (simulations et gestion des erreurs)

## Contribution

Les contributions sont les bienvenues ! Veuillez consulter le fichier CONTRIBUTING.md pour plus de détails sur notre processus de contribution. En général :

1. Forkez le projet
2. Créez votre branche de fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Poussez vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

## Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.
