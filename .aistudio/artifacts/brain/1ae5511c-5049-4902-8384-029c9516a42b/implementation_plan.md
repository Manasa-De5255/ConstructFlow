# Vercel & GitHub Deployment Fix for ConstructFlow

Resolve the Vercel deployment error (`No package.json found`) and configure the full-stack ConstructFlow platform (Vite React + Express API) for continuous deployment via GitHub and Vercel.

## User Review & Critical Decisions

> [!IMPORTANT]
> The repository layout and Vercel serverless strategy are confirmed:
> - **Repository Root**: All project files (`package.json`, `vite.config.ts`, `vercel.json`, `index.html`, `src/`, `server/`) reside in the root directory.
> - **Vercel Full-Stack Architecture**: The frontend is built as a high-performance static Vite bundle in `dist/`, while the Express backend is adapted to run seamlessly on Vercel Serverless Functions (`/api/index.ts`) without requiring a long-running port daemon.

---

## 1. Overview & Core Concept

When deploying a full-stack Node + Vite project to Vercel via GitHub:
1. **"No package.json found"**: Often occurs when Vercel is looking in an unexpected subfolder or when `package.json` naming and root configuration lack explicit Vercel project settings.
2. **Build Tool & Framework**: The application uses **Vite 8** with **React 19**, **Tailwind CSS v4**, and **Express 4**.
3. **Build Target**: Vite outputs client bundles to `dist/`.
4. **API Strategy**: On local development and Cloud Run, Vite dev server and `server.ts` serve `/api/*`. On Vercel, serverless functions in the `/api` directory serve these routes dynamically, and static routes rewrite to `index.html`.

---

## 2. Technical Architecture & File Changes

```
┌──────────────────────────────────────────────────────────────┐
│                    GitHub Repository Root                    │
│                                                              │
│  ├── package.json         (Standardized build/start scripts) │
│  ├── vercel.json          (Build, rewrites & serverless map) │
│  ├── vite.config.ts       (Vite + Tailwind + React plugins)  │
│  ├── index.html           (Entry HTML)                       │
│  ├── tsconfig.json        (TypeScript compiler settings)     │
│  │                                                           │
│  ├── api/                                                    │
│  │   └── index.ts         (Vercel Serverless Function entry) │
│  │                                                           │
│  ├── server/                                                 │
│  │   ├── api.ts           (Express API endpoints & auth)     │
│  │   └── db.ts            (Persistent store with /tmp fallbk)│
│  │                                                           │
│  └── src/                 (React 19 Frontend Components)     │
└──────────────────────────────────────────────────────────────┘
```

### Key Changes Planned

1. **`package.json` Standardization**:
   - Set descriptive package name `"constructflow"`.
   - Ensure clean scripts: `"build": "vite build"`, `"start": "tsx server.ts"`, `"lint": "tsc --noEmit"`.
   - Ensure all runtime packages (`express`, `@tailwindcss/vite`, `lucide-react`, `motion`, `react`, `react-dom`, `vite`, `dotenv`) are in `dependencies`, and build tools in `devDependencies`.

2. **Vercel Configuration (`vercel.json`)**:
   - Define Vercel build configuration:
     - `framework`: `vite`
     - `buildCommand`: `npm run build`
     - `outputDirectory`: `dist`
   - Configure route rewrites:
     - `/api/(.*)` -> `/api` (routed to Vercel Serverless function)
     - `/(.*)` -> `/index.html` (SPA fallback for client routing)

3. **Vercel Serverless Function Entry Point (`api/index.ts`)**:
   - Create `api/index.ts` exporting the Express application with `express.json()` and `apiRouter` mounted at `/api`.
   - Vercel automatically deploys any TypeScript file in the `/api` folder as an AWS Lambda / Vercel Serverless Function.

4. **Serverless Filesystem Resilience (`server/db.ts`)**:
   - Vercel serverless environments provide a read-only filesystem except for `/tmp`.
   - Add graceful fallback in `server/db.ts` to store runtime database mutations in `/tmp/data/db.json` when `process.env.VERCEL` is active, while continuing to use `/data/db.json` locally and on standard servers.

5. **`.gitignore` Audit**:
   - Ensure `.gitignore` ignores `node_modules`, `dist`, `.vercel`, and secret `.env` files while ensuring `package.json`, `vercel.json`, `tsconfig.json`, `index.html`, `server/`, and `src/` are all committed to GitHub.

---

## 3. Verification & Build Confirmation

1. Execute `compile_applet` (`npm run build`) to confirm zero compilation errors.
2. Execute `lint_applet` (`tsc --noEmit`) to confirm complete TypeScript type safety across both frontend and backend entry points.
3. Verify that all existing user accounts, roles, shifts, payslips, anonymous reporting, and multilingual voice assistant features remain 100% intact.
