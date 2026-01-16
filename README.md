# 🚀 Distributed Code Execution Engine

A high-performance, secure remote code execution platform capable of compiling and running C++ code in isolated environments. Designed to simulate the core backend of competitive programming platforms like **LeetCode** or **Codeforces**.

![Java](https://img.shields.io/badge/Backend-Java%20Spring%20Boot-orange)
![Docker](https://img.shields.io/badge/Infrastructure-Docker%20Containers-blue)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Monaco-cyan)

## 🔥 Key Features
- **Secure Sandboxing:** Executes user-submitted C++ code inside ephemeral **Docker containers** to prevent host system access.
- **Resource Management:** Implements strict **Time Limit Exceeded (TLE)** monitoring using Java's `ProcessBuilder` API to kill infinite loops.
- **Real-time Feedback:** Provides instant compilation logs and execution output to the frontend via REST APIs.
- **Modern UI:** Features a VS Code-like experience using **Monaco Editor**.

## 🏗️ Architecture
- **Frontend:** React.js (Vite) + Monaco Editor
- **Backend:** Java Spring Boot (REST API)
- **Execution:** Docker (Alpine Linux + G++ Compiler)

## 🛠️ How to Run Locally

### Prerequisites
- Docker Desktop
- Java JDK 21
- Node.js

### 1. Start the Docker Environment
```bash
cd cpp-runner
docker build -t c-runner .