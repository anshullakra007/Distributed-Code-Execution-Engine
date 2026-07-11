# CodeEngine Performance Benchmarking Report

## Objective
This report details the exhaustive performance benchmarking of the CodeEngine remote code execution API (`/api/run`). The test simulates real-world concurrent usage to measure execution latency, throughput, and system resource overhead for different programming languages supported by the engine.

## Methodology
- **Test Endpoint**: `POST /api/run`
- **Concurrency**: 10 concurrent requests
- **Total Requests**: 50 requests per language
- **Languages Tested**: Python 3, C++ (g++ 17), Java (JDK 21)
- **Environment**: Local Spring Boot server (`DockerSandboxService`)

## Results Overview

| Metric | Python | C++ | Java |
|--------|--------|-----|------|
| **Total Time** | 0.38s | 11.68s | 6.97s |
| **Throughput** | 130.64 req/sec | 4.28 req/sec | 7.17 req/sec |
| **Success Rate** | 100% | 100% | 100% |

### Latency Distribution

| Percentile/Stat | Python | C++ | Java |
|-----------------|--------|-----|------|
| **Min Latency** | 41.27ms | 1707.00ms | 1151.46ms |
| **Median** | 60.89ms | 2066.76ms | 1332.45ms |
| **Mean** | 70.48ms | 2188.49ms | 1354.23ms |
| **95th %ile** | 111.75ms | 3194.24ms | 1528.83ms |
| **99th %ile** | 112.61ms | 3555.33ms | 1834.01ms |

## Deep Dive Analysis & Bottlenecks

### 1. The Compilation Overhead (C++ & Java)
The discrepancy between Python and compiled languages (C++ and Java) is drastic. 
- Python achieves **130+ requests/sec** with an average latency of ~70ms because it is purely interpreted, meaning the code executes immediately in a fast `python3` process.
- C++ and Java suffer from massive latency spikes (median ~2 seconds for C++ and ~1.3 seconds for Java). This is because the `DockerSandboxService` uses the host compilers (`g++` and `javac`) on a per-request basis.

### 2. Lack of True Docker Isolation
Despite the name `DockerSandboxService`, the current implementation utilizes Java's `ProcessBuilder` to execute raw shell commands directly on the host (or within the singular Docker container) rather than spinning up ephemeral, isolated containers. 
- **Risk**: Since it executes directly via `sh -c`, concurrent compilations (`g++ -std=c++17 -O2`) spawn multiple heavy OS processes.
- **Symptom**: During the test of 10 concurrent requests, C++ max latency shot up to 3.49 seconds due to CPU contention from 10 parallel `g++` compilation streams.

### 3. Missing Request Queuing or Pooling
The API directly forwards incoming HTTP requests into blocking system process calls without an internal queue. At higher scales, this will lead to catastrophic CPU starvation, thread pool exhaustion, or memory out-of-bounds (OOM) errors as unconstrained processes battle for system resources.

## Recommendations
1. **True Containerization**: Transition `DockerSandboxService` to use the Docker Engine API (e.g., `docker run --rm ...`). This limits CPU/Memory per execution and prevents rogue code from crashing the host.
2. **Task Queuing**: Implement a task queue (like RabbitMQ or Redis) to limit the maximum number of concurrent executions to the server's CPU core count.
3. **Pre-warm JVM/Caching**: For Java, consider keeping a pre-warmed JVM or utilizing caching if the same code is being repeatedly requested.
