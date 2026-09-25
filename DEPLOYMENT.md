# Aegis.js Deployment & Publishing Guide

This guide details how to publish `@aventine/aegis-js` to npm and deploy the documentation website to Cloudflare Pages via a dedicated, air-gapped GitHub repository.

---

## 1. Why a Standalone GitHub Repository?

The primary Aventine Labs monorepo (`MyPassesCredentialVault`) contains private legal documents (`PRIVATECONFIDENTIAL/`), corporate ledgers, patent drafts, and proprietary native C compilers (`aegisc`). 

To preserve corporate security and allow Cloudflare Pages and npm to build automatically on every push, `Aegis.js` is published from its own standalone, public repository:
- **Repository:** `https://github.com/aventine-labs/aegis-js`
- **npm Package:** `@aventine/aegis-js`
- **Docs Domain:** `https://aegis.aventinelabs.com` (or `aegis-js.pages.dev`)

---

## 2. Initializing the Standalone Git Repository

To isolate `packages/aegis-js` into its own Git repository:

```bash
# Navigate to the package directory
cd packages/aegis-js

# Initialize git
git init -b main

# Add all library files, docs, and starter app
git add .

# Create initial release commit
git commit -m "feat(aegis): initial release of Aegis.js v1.0.0 zero-GC flat memory library"

# Add remote origin
git remote add origin https://github.com/aventine-labs/aegis-js.git

# Push to GitHub main branch
git push -u origin main
```

---

## 3. Connecting Cloudflare Pages (Automated CI/CD)

Cloudflare Pages connects directly to GitHub and builds VitePress on every commit to `main`.

### Setup Steps:
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. Select the `aventine-labs/aegis-js` repository.
4. Configure the build settings:
   - **Project name:** `aegis-js` (yields `aegis-js.pages.dev`)
   - **Production branch:** `main`
   - **Framework preset:** `VitePress`
   - **Build command:** `npm run docs:build`
   - **Build output directory:** `docs/.vitepress/dist`
   - **Root directory:** `/`
5. Environment Variables:
   - Add variable: `NODE_VERSION` = `20.11.0`
6. Click **Save and Deploy**.

### Custom Domain Routing:
1. In Cloudflare Pages, go to **Custom Domains**.
2. Click **Set up a custom domain**.
3. Enter `aegis.aventinelabs.com`.
4. Cloudflare will automatically provision the SSL certificate and route global traffic via its edge network.

---

## 4. Publishing to npm (`@aventine/aegis-js`)

### Pre-Publish Verification:
Run the complete test suite and build pipeline before publishing:

```bash
cd packages/aegis-js

# Compile dual ESM and CommonJS bundles
npm run build

# Run unit tests with memory assertion
npm test

# Run benchmark verification
npm run benchmark
```

### Publish Command:
```bash
# Log in to npm under the aventine organization
npm login

# Publish public package
npm publish --access public
```

---

## 5. Directory Layout

```text
packages/aegis-js/
├── src/                      # TypeScript source files
│   ├── types/               # Primitives & struct schema compiler
│   ├── cursor/              # Flyweight cursor pointer slider
│   ├── collections/         # List, RingBuffer, Map, Pool
│   ├── io/                  # Binary serialization and slices
│   ├── threads/             # SharedArrayBuffer and atomics
│   ├── __tests__/           # Unit and zero-GC test suites
│   └── index.ts             # Main export surface
├── dist/                     # Compiled JS and type definitions
├── docs/                     # VitePress documentation website
│   ├── .vitepress/          # Site configuration and themes
│   ├── guide/               # Architectural guides
│   ├── api/                 # Complete API reference
│   ├── benchmarks/          # Empirical benchmark data
│   └── index.md             # Landing page
├── examples/
│   └── starter-app/         # Turnkey zero-install runnable starter script (index.js)
├── package.json              # Dual ESM/CJS exports
├── tsconfig.json             # TypeScript configuration
├── LICENSE                   # Apache 2.0 License
├── README.md                 # GitHub storefront
└── DEPLOYMENT.md             # This guide
```
