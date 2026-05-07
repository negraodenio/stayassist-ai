# StayAssist AI - Documentation Complète du Projet

Bienvenue dans la documentation de **StayAssist AI** (Malia Concierge). Cette plateforme est une solution d'hospitalité de nouvelle génération conçue pour les chaînes d'hôtels de luxe, utilisant l'Intelligence Artificielle pour améliorer l'expérience client et optimiser l'efficacité opérationnelle.

---

## 1. Aperçu du Projet
StayAssist AI est une plateforme multi-locataire (multi-tenant) qui propose :
- **PWA Client** : Une application web progressive, sans téléchargement, basée sur des codes QR pour les demandes des clients, le chat de conciergerie IA et les informations de l'hôtel.
- **Tableau de Bord Admin** : Un "Command Center" centralisé pour les gestionnaires d'hôtels afin de traiter les demandes, gérer les codes QR et configurer les propriétés.
- **IA RAG (Retrieval-Augmented Generation)** : Une conciergerie IA spécialisée qui utilise le RAG pour répondre aux questions des clients à partir de PDFs téléchargés ou d'entrées manuelles.
- **Alertes WhatsApp** : Notifications en temps réel pour le personnel lors de demandes prioritaires ou de maintenance.

---

## 2. Pile Technologique
- **Frontend** : Next.js 16 (App Router), React, Tailwind CSS, Lucide React (Icônes).
- **Backend** : Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **IA** : OpenRouter (GPT-4o/text-embedding-3-small), pgvector pour la recherche sémantique.
- **Intégrations** : Twilio (WhatsApp API), Google Maps Geocoding API.
- **Déploiement** : Vercel.

---

## 3. Installation et Configuration

### Prérequis
- Node.js 20+ et pnpm.
- Projet Supabase avec `pgvector` activé.
- Clé API OpenRouter.
- Compte Twilio (pour WhatsApp).
- Clé API Google Maps (pour la géolocalisation).

### Variables d'Environnement
Créez un fichier `.env` basé sur les éléments suivants :
```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role
OPENROUTER_API_KEY=votre_cle_openrouter
TWILIO_ACCOUNT_SID=votre_sid
TWILIO_AUTH_TOKEN=votre_token
TWILIO_MESSAGING_SERVICE_SID=votre_service_sid
GOOGLE_PLACES_API_KEY=votre_cle_google
```

### Initialisation de la Base de Données
Exécutez os scripts SQL fournis dans l'éditeur SQL de Supabase dans cet ordre :
1. `schema.sql` (Tables initiales).
2. `add_management_columns.sql` (Standardisation des statuts).
3. `final_production_hardening.sql` (Politiques RLS et index de performance).

---

## 4. Guide des Fonctionnalités

### Tableau de Bord Administratif
Accédez au tableau de bord via `/dashboard`.
- **Aperçu (Overview)** : Métriques en temps réel et agrégateur "Top Issues".
- **Demandes (Requests)** : Tableau Kanban pour gérer les besoins des clients (`open`, `in_progress`, `resolved`).
- **Gestion QR** : Génération de tokens uniques pour les unités et aperçu/téléchargement des codes QR.
- **Propriétés** : Configuration des emplacements (géocodage auto via code postal) et nombre d'unités.

### Base de Connaissances (RAG)
- **Entrée Manuelle** : Ajoutez des sujets et réponses spécifiques.
- **Téléchargement de Fichier** : Téléchargez des fichiers PDF/TXT. Le système segmente automatiquement le texte, génère des embeddings et les stocke pour la récupération par l'IA.

### Configuration WhatsApp
1. Allez dans l'onglet **Overview** du tableau de bord.
2. Entrez le numéro de téléphone au format international (ex: `+33612345678`).
3. Envoyez une **Alerte Test** pour vérifier la connexion Twilio.
4. Une fois activé, le personnel recevra des alertes pour chaque nouvelle demande client.

---

## 5. Sécurité et Multi-Location
Le projet implémente une architecture **Multi-Tenant** stricte :
- **Isolation des Organisations** : Les administrateurs ne peuvent voir et gérer que les propriétés de leur propre organisation.
- **Row Level Security (RLS)** : Appliqué au niveau de la base de données via `organization_id`.
- **Authentification JWT** : Les sessions clients sont éphémères et spécifiques à l'unité, tandis que les sessions Admin utilisent l'Auth Supabase standard avec des métadonnées `role` personnalisées.

---

## 6. Déploiement
Le projet est optimisé pour **Vercel**.
1. Poussez le code sur GitHub.
2. Connectez le dépôt à Vercel.
3. Configurez toutes les variables d'environnement.
4. Exécutez `pnpm run build` pour vérifier l'intégrité TypeScript avant le déploiement.

---

*StayAssist AI - Redéfinir l'hospitalité de luxe.*
