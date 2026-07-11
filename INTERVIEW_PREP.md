# 🏆 CodeEngine Interview Prep: The Architect's Cheat Sheet

## 📊 Final Benchmark Metrics (Memorize These!)
- **Concurrency Setup:** 20 parallel threads, 100 total requests.
- **Python Throughput:** ~130+ req/sec
- **C++/Java Throughput (Before Warm Pool):** ~5-8 req/sec (Severe CPU thrashing & 7.2s latency spikes).
- **C++/Java Throughput (After Warm Pool & Async Queue):** Massive improvement. Latency stabilized near Python levels, with 0 CPU starvation. Max latency capped efficiently by async boundaries.

---

## 🧠 The "Why" Behind Engineering Decisions

### 1. Why a Pre-warmed Container Pool instead of Cold-Starting?
**The Problem:** Docker cold-starts are brutally slow. Launching a brand new JVM (`openjdk`) or a C++ compiler (`g++`) container on every request took 500ms to 1.5s *just to boot*, completely tanking performance during heavy load.
**The Solution:** At startup, `CodeEngine` provisions a static fleet of "zombie" containers running `tail -f /dev/null`. When a request hits, we use `docker exec` to instantly route code into the existing container via stdin, compile, and execute. 
**Interview Talking Point:** *"By shifting the container initialization penalty to the application startup phase, we achieved near-instantaneous code execution routing, bypassing Docker engine overhead entirely."*

### 2. Why `ThreadPoolTaskExecutor` over Virtual Threads or Raw Threads?
**The Problem:** 1,000 concurrent users hitting the API would spawn 1,000 raw threads, immediately causing CPU starvation (context switching overhead) and bringing down the Tomcat server.
**The Solution:** We implemented a custom `ThreadPoolTaskExecutor` with its core pool size precisely bounded to `Runtime.getRuntime().availableProcessors()`. 
**Handling Extreme Load:** We configured a queue capacity of `100` and a `CallerRunsPolicy` rejection handler. 
**Interview Talking Point:** *"If 1,000 users hit us, the first few saturate the cores, the next 100 go into the bounded queue, and the remainder are rejected via `CallerRunsPolicy`. This provides **natural backpressure**—forcing the incoming Tomcat HTTP threads to block and execute the task themselves rather than overwhelming the CPU with context switches."*

### 3. How is Resource Leakage (OOM, Orphaned Containers) Prevented?
**The Problem:** Malicious users submitting `while(true) {}` in C++ or allocating massive arrays in Java can crash the host server (OOM killer).
**The Solution:** 
- **Memory Restrictions:** Containers are forcefully bounded using Docker's `HostConfig.withMemory(256MB)`.
- **Network Blackholing:** `NetworkMode` is set to `"none"`, preventing SSRF or outbound DDoS attacks from the sandbox.
- **Strict Timeouts & Stream Leaks:** Executions are wrapped in a strict `TimeUnit.SECONDS.awaitCompletion()`. If a timeout is triggered, the thread returns an HTTP `408 Request Timeout`. Furthermore, the `ByteArrayOutputStream` and `ExecStartResultCallback` network streams are wrapped in a `try-with-resources` block, guaranteeing that file descriptors and TCP sockets are severed immediately even if the thread hangs.
**Interview Talking Point:** *"Every untrusted payload is executed in an ephemeral, memory-capped sandbox with zero network access. Strict timeouts and try-with-resources blocks guarantee that neither host CPU nor host file descriptors can be leaked."*
