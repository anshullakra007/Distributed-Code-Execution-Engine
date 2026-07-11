# CodeEngine Performance Benchmark Report

This document outlines the performance characteristics of the CodeEngine sandbox execution service, simulating high concurrency scenarios.

## Methodology

- **Tooling**: A custom multithreaded Python script (`benchmark.py`) making concurrent HTTP requests to the `/api/run` endpoint.
- **Concurrency**: 20 parallel threads.
- **Total Requests**: 100 requests per language.
- **Environment**: Localhost environment executing inside a managed Docker Sandbox.

## Results Overview

| Language | Total Requests | Successful | Failed | Requests/Sec | Mean Latency | Max Latency | P95 Latency | P99 Latency |
|----------|----------------|------------|--------|--------------|--------------|-------------|-------------|-------------|
| Python   | 100            | 100        | 0      | 130.29       | 148.66 ms    | 312.72 ms   | 244.56 ms   | 312.55 ms   |
| C++      | 100            | 100        | 0      | 5.35         | 3499.59 ms   | 7278.87 ms  | 6820.48 ms  | 7277.69 ms  |
| Java     | 100            | 100        | 0      | 8.02         | 2431.69 ms   | 3015.51 ms  | 2803.45 ms  | 3013.78 ms  |

## Detailed Analysis

### Python 3
- **Throughput**: Extremely high (130.29 req/sec)
- **Latency**: Very low (mean ~148ms, min 62.52ms)
- **Observation**: Python performs exceptionally well since there is no compilation step required, and the startup overhead of the interpreter is relatively low.

### C++ (GCC)
- **Throughput**: Lowest among the tested languages (5.35 req/sec)
- **Latency**: Highest (mean ~3.5s, max ~7.2s)
- **Observation**: The overhead of invoking `g++` to compile the source code, linking, and then executing the generated binary inside an isolated Docker container adds significant latency, especially under concurrent load where CPU bound tasks bottleneck the host.

### Java (JDK 21)
- **Throughput**: Moderate (8.02 req/sec)
- **Latency**: Moderate (mean ~2.4s, min 1.6s)
- **Observation**: The compilation via `javac` followed by the JVM startup (`java`) introduces noticeable delay. However, it scales slightly better than C++ under load. 

## Conclusion

The Docker Sandbox Service successfully manages high concurrency without any failed requests (100% success rate across 300 total requests). Scripting languages like Python yield rapid response times, whereas compiled languages exhibit higher latencies primarily bounded by container instantiation and compilation phases. Future optimizations may include pre-warming compiler containers or employing persistent JVM processes.
