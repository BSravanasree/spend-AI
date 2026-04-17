# SpendAI

AI API governance and cost-control SaaS.
The proxy layer between your apps and OpenAI, Anthropic, and Google Gemini.

## What it does
- Real-time AI API cost tracking
- Budget enforcement (hard blocks before API is called)
- Secure proxy key management
- Multi-provider: OpenAI, Anthropic, Gemini
- Multi-tenant organization management

## Tech Stack
- Frontend: React + Vite → Vercel
- Backend: Node.js + Express → Render
- Database: Supabase (PostgreSQL)
- Queue: BullMQ + Redis
- Email: Resend
- Payments: Manual billing (Stripe coming soon)

## Local Development

### Backend
cd backend
cp .env.example .env
# Fill in your .env values
npm install
npm run dev

### Frontend
cd frontend
npm install
npm run dev

## Deployment
- Backend: Render (render.yaml config included)
- Frontend: Vercel (vercel.json config included)
- Database: Supabase
- Redis: Render Redis (free tier)

## Environment Variables
See backend/.env.example for all required environment variables.
