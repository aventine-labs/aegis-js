# Aegis.js Turnkey Starter Application

This is a complete, runnable example demonstrating `@aventine/aegis-js` in TypeScript.

It showcases:
- Defining a 64-byte cache line aligned telemetry struct schema.
- Attaching custom domain calculation methods (`isOverheating()`, `powerDissipation()`).
- Ingesting 100,000 records into a contiguous flat memory arena with zero heap growth.
- Querying records using the single flyweight cursor pattern.
- Running direct binary hardware math aggregations (`average()`, `min()`, `max()`).
- Ingesting streaming records into a lock-free circular FIFO `AegisRingBuffer`.

---

## Running the Starter App

Ensure the main library is built:

```bash
# In the repository root
npm run build --prefix packages/aegis-js
```

Then run the starter app:

```bash
cd packages/aegis-js/examples/starter-app
npm run start
```
