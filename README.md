# Fusion Starter

A production-ready full-stack React application template with integrated Express server, featuring React Router 6 SPA mode, TypeScript, Vitest, Zod and modern tooling.

While the starter comes with an Express server, only create endpoints when strictly necessary, for example, to encapsulate logic that must live in the server, such as private keys handling, or certain DB operations.

## Tech Stack

- **PNPM**: Prefer pnpm
- **Frontend**: React 18 + React Router 6 (SPA) + TypeScript + Vite + TailwindCSS 3
- **Backend**: Express server integrated with Vite dev server
- **Testing**: Vitest
- **UI**: Radix UI + TailwindCSS 3 + Lucide React icons

## Project Structure

```
client/                   # React SPA frontend
├── pages/                # Route components
├── components/ui/        # Pre-built UI component library
├── App.tsx                # App entry point with SPA routing setup
└── global.css            # TailwindCSS 3 theming and global styles

server/                   # Express API backend
├── index.ts              # Main server setup (Express config + routes)
└── routes/               # API handlers

shared/                   # Types used by both client & server
└── api.ts                # Shared API interfaces
```

## Key Features

### SPA Routing System

The routing system is powered by React Router 6:

- Routes are defined in `client/App.tsx`
- Route files are located in the `client/pages/` directory

### Styling System

- **Primary**: TailwindCSS Utility classes
- **Theme and Design Tokens**: Configured in `client/global.css`
- **UI Components**: Pre-built library in `client/components/ui/`
- **Utility**: `cn()` function combines `clsx` + `tailwind-merge` for conditional classes

### Express Server Integration

- **Development**: Single port (8080) for both frontend and backend
- **Hot Reload**: Both client and server code
- **API Endpoints**: Prefixed with `/api/`

### Shared Types

Import consistent types in both client and server:
```typescript
import { DemoResponse } from '@shared/api';
```

Path aliases:
- `@shared/*` - Shared folder
- `@/*` - Client folder

## Development Commands

```bash
pnpm dev        # Start dev server (client + server)
pnpm build      # Production build
pnpm start      # Start production server
pnpm typecheck  # TypeScript validation
pnpm test       # Run Vitest tests
```

## Production Deployment

- **Standard**: `pnpm build`
- **Binary**: Self-contained executables
- **Cloud Deployment**: Compatible with Netlify and Vercel.

## Architecture Notes

- Single-port development with Vite + Express integration
- TypeScript throughout (client, server, shared)
- Full hot reload for rapid development
- Comprehensive UI component library included
- Type-safe API communication via shared interfaces
