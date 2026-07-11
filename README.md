# CodeEngine 🚀

A high-performance, distributed code execution engine that securely compiles and runs untrusted C++, Java, and Python code in isolated Docker environments.

> **[Watch the 2-Minute Architecture & Performance Demo](https://loom.com/)**  
> *(Achieving 130+ req/sec throughput with 0% CPU starvation using a Bounded Async Queue and Pre-warmed Container Pool).*

![CodeEngine Demo](./demo.gif)

## 🏗 System Architecture

```mermaid
graph TD
    Client[React Frontend] -->|HTTP POST JSON| API[Spring Boot REST API]
    API --> Controller[CodeController]
    Controller -->|CompletableFuture Async| ThreadPool[Bounded ThreadPoolExecutor]
    
    subgraph "Docker Sandbox Core"
        ThreadPool --> Service[DockerSandboxService]
        Service --> Pool[Pre-warmed Container Pool]
        
        Pool --> Cpp[C++ GCC Container]
        Pool --> Java[Java OpenJDK Container]
        Pool --> Python[Python 3 Container]
        
        Cpp -.->|docker exec via stdin| CompileRun[Compile & Run]
        Java -.->|docker exec via stdin| CompileRun
        Python -.->|docker exec via stdin| CompileRun
    end
    
    CompileRun -->|Time/Memory Tracking| Result[ExecutionResult]
    Result --> API
    API -->|HTTP 200/408| Client
```

## 🛠 Tech Stack
- **Frontend:** React, Vite, Monaco Editor, TailwindCSS
- **Backend:** Java 21, Spring Boot, docker-java API
- **Infrastructure:** Docker, Docker Compose
- **Performance Tooling:** GNU `time` for memory profiling, Async Task Queues

## 🛡 Security & Sandboxing Architecture

Executing untrusted user code natively is a severe Remote Code Execution (RCE) vulnerability. This engine mitigates RCE and ensures 0% resource leakage through a highly restrictive, enterprise-grade Docker sandboxing model.

- **Pre-warmed Container Pool:** The API orchestrates a fleet of static, "zombie" Docker containers (`openjdk`, `g++`, `python`). Code is injected and executed on-the-fly via `docker exec`. This avoids native execution on the host machine while bypassing slow Docker cold-starts.
- **Strict Resource Limits:** Every container is strictly bounded using `HostConfig.withMemory(256MB)` to prevent memory exhaustion or malicious array allocations from triggering the host OOM killer.
- **Network Blackholing:** Outbound container network access is entirely disabled (`NetworkMode: "none"`). This completely neutralizes Server-Side Request Forgery (SSRF) and prevents the sandbox from being used in DDoS attacks.
- **Natural Backpressure & Thread Isolation:** If massive concurrent traffic hits the API, the unbounded creation of threads is blocked by our custom `ThreadPoolTaskExecutor` (bounded queue + `CallerRunsPolicy`). This acts as an organic shield against CPU thrashing and container leaks.

## ⚡ Quick Start

### 1. Requirements
- Docker and Docker Compose installed
- Maven & Java 21

### 2. Start the Stack
Bring up the frontend and backend simultaneously using Docker Compose:
```bash
docker-compose up -d --build
```

*(Note: The `app` container mounts `/var/run/docker.sock` to seamlessly manage the pre-warmed sandbox containers on your host machine).*

### 3. Usage
Navigate to `http://localhost:8080` (or your mapped frontend port) to access the Code Editor, select your language, and run code instantly!

### 4. Running Benchmarks
To stress-test the async queue and warm pool performance:
```bash
python3 benchmark.py -c 20 -n 100 --all
```