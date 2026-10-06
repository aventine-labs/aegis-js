# Contributing to Aegis.js

Thank you for your interest in contributing to Aegis.js.

Aventine Labs maintains Aegis.js as a high-performance, zero-garbage-collection standard library for flat memory arenas in JavaScript, TypeScript, and Node.js.

---

## 1. Development Principles

1. **Zero External Runtime Dependencies:** Aegis.js must remain strictly dependency-free at runtime.
2. **Deterministic Memory Allocations:** All allocations occur during arena initialization, never inside the hot execution loop.
3. **64-Byte Cache-Line Alignment:** Buffer offsets must adhere to CPU cache line geometry to prevent false sharing and pipeline stalls.
4. **Zero-Telemetry Standard:** No diagnostic beacons, telemetry pings, or analytics trackers are permitted.

---

## 2. Setting Up Local Development

```bash
# Clone the repository
git clone https://github.com/aventine-labs/aegis-js.git
cd aegis-js

# Install dev dependencies
npm install

# Compile TypeScript
npm run build

# Run unit tests with V8 GC exposure
npm test

# Run micro-benchmark validation
npm run benchmark
```

---

## 3. Pull Request Guidelines

1. Create a focused branch off `develop`: `git checkout -b feature/your-feature-name`.
2. Ensure all tests and TypeScript builds pass cleanly without warnings.
3. Open a Pull Request referencing the rationale and providing benchmark numbers.
4. All submissions are reviewed by `@markbgilbert`.
