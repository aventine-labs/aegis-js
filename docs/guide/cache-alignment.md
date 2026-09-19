# 64-Byte Cache Alignment

Hardware CPUs do not read memory byte-by-byte. They read memory in discrete blocks called **cache lines**.

On virtually all modern architectures (Intel x86-64, AMD Zen, Apple M1/M2/M3/M4, and ARM Neoverse), a CPU cache line is exactly **64 bytes**.

---

## Why Alignment Matters

### 1. Eliminating Split Cache Line Reads
If a record spans across two cache lines (for example, starting at byte 60 and ending at byte 72), the CPU must issue two memory bus transactions and splice the result together in registers. This cuts memory bandwidth in half for those operations.

### 2. Eliminating False Sharing in Multi-Core Workloads
When two worker threads or CPU cores modify different variables that happen to share the same 64-byte cache line:
- Core 1 modifies variable A.
- The hardware cache coherence protocol (MESI / MOESI) immediately invalidates the entire 64-byte line in Core 2's L1 cache.
- Core 2 is forced to reload the entire cache line from L3 cache or DRAM, even though Core 2 was accessing variable B.
- This creates severe performance degradation known as **false sharing**.

---

## Automatic Aegis Cache Alignment

When you compile a struct in Aegis.js:

```typescript
const telemetry = Aegis.struct({
  deviceId: uint32,    // 4 bytes
  voltage: float32,    // 4 bytes
  current: float32,    // 4 bytes
  status: uint8,       // 1 byte
});
```

Aegis computes:
1. **Raw Size:** `4 + 4 + 4 + 1 = 13 bytes`.
2. **Silicon Alignment:** The struct compiler pads the record up to the nearest multiple of 64 bytes.
3. **Stride:** Exactly `64 bytes`.

```
Record Layout in Memory:
[ 0x00 .. 0x03 ] deviceId (uint32)
[ 0x04 .. 0x07 ] voltage (float32)
[ 0x08 .. 0x0B ] current (float32)
[ 0x0C ]         status (uint8)
[ 0x0D .. 0x3F ] Zero Padding (51 bytes reserved for future fields or SIMD alignment)
---------------------------------------------------------------------------------
Total Stride:    64 Bytes (Matches exactly one L1 CPU cache line)
```

If your struct exceeds 64 bytes (for example, 72 bytes), Aegis rounds the stride up to 128 bytes (two full cache lines), ensuring every record in an arena always begins at an address divisible by 64.

---

## Hardware Prefetching Advantage

Because records are stored contiguously and aligned to cache boundaries:
- The CPU hardware Stream Prefetcher recognizes sequential access patterns immediately.
- By the time your JavaScript loop finishes processing Record `N`, Record `N+1` and `N+2` have already been loaded into L1 cache from main memory.
- This enables Aegis to achieve over **100 Million record mutations per second** on commodity hardware.
