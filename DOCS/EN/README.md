# StayAssist AI - Comprehensive Project Documentation

Welcome to the **StayAssist AI** (Malia Concierge) documentation. This platform is a next-generation hospitality solution designed for luxury hotel chains, leveraging Artificial Intelligence to enhance guest experience and optimize operational efficiency.

---

## 1. Project Overview
StayAssist AI is a multi-tenant platform that provides:
- **Guest PWA**: A no-download, QR-based web application for guest requests, AI concierge chat, and hotel information.
- **Admin Dashboard**: A centralized "Command Center" for hotel managers to handle requests, manage QR codes, and configure properties.
- **RAG-powered AI**: A specialized AI concierge that uses Retrieval-Augmented Generation (RAG) to answer guest questions based on uploaded PDFs or manual knowledge snippets.
- **WhatsApp Alerts**: Real-time notifications for staff when high-priority or maintenance requests are made.

---

## 2. Technology Stack
- **Frontend**: Next.js 16 (App Router), React, Tailwind CSS, Lucide React (Icons).
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions).
- **AI/ML**: OpenRouter (GPT-4o/text-embedding-3-small), pgvector for semantic search.
- **Integrations**: Twilio (WhatsApp API), Google Maps Geocoding API.
- **Deployment**: Vercel.

---

## 3. Installation & Setup

### Prerequisites
- Node.js 20+ and pnpm.
- Supabase project with `pgvector` enabled.
- OpenRouter API Key.
- Twilio Account (for WhatsApp).
- Google Maps API Key (for geocoding).

### Environment Variables
Create a `.env` file based on the following:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENROUTER_API_KEY=your_openrouter_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_MESSAGING_SERVICE_SID=your_service_sid
GOOGLE_PLACES_API_KEY=your_google_key
```

### Database Initialization
Run the provided SQL scripts in the Supabase SQL Editor in this order:
1. `schema.sql` (Initial tables).
2. `add_management_columns.sql` (Status standardization).
3. `final_production_hardening.sql` (RLS policies and performance indexes).

---

## 4. Feature Guides

### Administrative Dashboard
Access the dashboard at `/dashboard`.
- **Overview**: Real-time metrics and "Top Issues" aggregator.
- **Requests**: Kanban board for managing guest needs (`open`, `in_progress`, `resolved`).
- **QR Management**: Generate unique tokens for units and preview/download QR codes.
- **Properties**: Configure locations (auto-geocoding via ZIP code) and unit counts.

### Knowledge Base (RAG)
- **Manual Entry**: Add specific topics and answers.
- **File Upload**: Upload PDFs/TXTs. The system automatically chunks text, generates embeddings, and stores them for AI retrieval.

### WhatsApp Configuration
1. Go to the **Overview** tab in the Dashboard.
2. Enter the international phone number (e.g., `+351912345678`).
3. Send a **Test Alert** to verify the Twilio connection.
4. Once active, staff will receive alerts for all new guest requests.

---

## 5. Security & Multi-Tenancy
The project implements a strict **Multi-Tenant Architecture**:
- **Organization Isolation**: Admins can only see and manage properties within their assigned organization.
- **Row Level Security (RLS)**: Enforced at the database level using `organization_id`.
- **JWT Auth**: Guest sessions are ephemeral and unit-specific, while Admin sessions use standard Supabase Auth with custom `role` metadata.

---

## 6. Deployment
The project is optimized for **Vercel**.
1. Push the code to GitHub.
2. Connect the repository to Vercel.
3. Configure all Environment Variables.
4. Run `pnpm run build` to verify TypeScript integrity before deployment.

---

*StayAssist AI - Redefining Luxury Hospitality.*
