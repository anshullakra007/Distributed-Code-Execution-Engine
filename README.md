# ⚡ Distributed Code Execution Engine

![Java](https://img.shields.io/badge/Java-21-orange)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.2-green)
![React](https://img.shields.io/badge/React-18-blue)
![Docker](https://img.shields.io/badge/Docker-Enabled-blue)
![Live](https://img.shields.io/badge/Status-Live_Deployed-success)

A high-performance, remote code execution platform capable of compiling and running C++, Java, Python, and JavaScript code in real-time. Built with a **React** frontend and a robust **Spring Boot** backend, containerized with **Docker** for consistent deployment.

🚀 **Live Demo:** [Click Here to Open App](https://distributed-code-execution-engine.vercel.app/)

---

## 🌟 Key Features

* **Multi-Language Support:** Compile and execute **C++ (GCC)**, **Java (JDK 21)**, **Python 3**, and **JavaScript (Node)**.
* **Professional IDE Interface:** Integrated **Monaco Editor** (VS Code's engine) for a premium coding experience.
* **Secure Execution:** Code is executed in a controlled environment using isolated process management.
* **Real-time Output:** Captures Standard Output (stdout) and Standard Error (stderr) instantly.
* **Responsive UI:** Full-screen, dark-mode interface optimized for Desktop, Tablet, and Mobile.

---

## 🏗️ Architecture & Tech Stack

This project follows a **Client-Server Architecture**:

### **Frontend (Client)**
* **Framework:** React.js (Vite)
* **Editor:** Monaco Editor (@monaco-editor/react)
* **Hosting:** Vercel (Edge Network)
* **Styling:** CSS3 (VS Code Dark Theme)

### **Backend (API)**
* **Framework:** Spring Boot (Java 21)
* **Execution Engine:** `ProcessBuilder` API for spawning isolated compiler processes.
* **Containerization:** Docker (Eclipse Temurin 21 Image)
* **Hosting:** Render Cloud

---

## 🛠️ How It Works (System Design)

1.  **User Submission:** The user writes code in the browser. The React frontend sends a JSON payload (`language`, `code`, `input`) to the backend.
2.  **Request Handling:** The Spring Boot controller receives the request and forwards it to the `SandboxService`.
3.  **Process Isolation:**
    * The service writes the code to a temporary file.
    * It identifies the correct compiler (`g++`, `javac`, `python3`) based on the language.
    * It spawns a **Process** to compile and run the code.
    * Input (stdin) is piped into the process, and Output (stdout/stderr) is captured.
4.  **Response:** The execution result is sent back to the client and displayed in the terminal.

---

## 🚀 Running Locally

### Prerequisites
* Java 21 SDK
* Node.js (v18+)
* Docker (Optional, for container run)
* G++ (MinGW or Linux GCC) and Python 3 installed.

### 1. Clone the Repository
```bash
git clone [https://github.com/anshullakra007/Distributed-Code-Execution-Engine.git](https://github.com/anshullakra007/Distributed-Code-Execution-Engine.git)
cd Distributed-Code-Execution-Engine