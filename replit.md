# WP Content Optimizer PRO

## Overview
WP Content Optimizer PRO is an AI-powered SEO optimization application built with React, TypeScript, and Vite. It helps transform content into ranking machines by adapting to Google's algorithm in real-time.

## Project Structure
- `/src` - Main source code
  - `/components` - React components
  - `/hooks` - Custom React hooks
  - `/lib` - Utility libraries
  - `/pages` - Page components
  - `/integrations` - External integrations
- `/public` - Static assets
- `/functions` - Cloudflare Functions (for serverless API endpoints)
- `/supabase` - Supabase configuration

## Tech Stack
- **Frontend**: React 18, TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand, TanStack Query
- **UI Components**: Radix UI
- **AI Integration**: OpenAI, Anthropic, Google GenAI
- **Backend**: Supabase

## Development
The application runs on port 5000 in development mode.

```bash
npm run dev
```

## Build
```bash
npm run build
```

The built files are output to the `dist` directory.

## Recent Changes
- February 2026: Configured for Replit environment with port 5000 and allowed hosts
- February 2026: Fixed sitemap persistence - crawled URLs now survive navigation via Zustand store integration
- February 2026: Enhanced QualityValidator scoring for more accurate 90%+ targets (readability, SEO, E-E-A-T, uniqueness, fact accuracy)
- February 2026: Verified NeuronWriter integration searches for existing queries before creating new ones
- February 2026: Content generation prompts target 90%+ in all quality metrics with Alex Hormozi/Tim Ferriss writing style

## Key Architecture Notes
- **State Persistence**: Uses Zustand with `persist` middleware - sitemapUrls are persisted and restored to local UI state via useEffect
- **Quality Scoring**: QualityValidator.ts calculates scores for readability (grade 5-10 optimal), SEO, E-E-A-T (checks for citations, expert quotes, first-person), uniqueness (AI phrase detection), and fact accuracy
- **NeuronWriter**: Service searches existing queries by keyword before creating new ones to prevent duplicates
- **Content Generation**: EnterpriseContentOrchestrator.ts uses comprehensive prompts for 90%+ scores with premium HTML design elements (glassmorphic boxes, neumorphic cards, gradient tables)
