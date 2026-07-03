# ==========================================
# STAGE 1: Build React Frontend
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/client

# Copy package.json and install dependencies
COPY client/package*.json ./
RUN npm install

# Copy source and build
COPY client/ ./
RUN npm run build

# ==========================================
# STAGE 2: Build Spring Boot Backend
# ==========================================
FROM eclipse-temurin:21-jdk-jammy AS backend-builder
WORKDIR /app/api

# Copy Maven wrapper and POM
COPY api/mvnw .
COPY api/.mvn .mvn
COPY api/pom.xml .

# Make wrapper executable
RUN chmod +x mvnw

# Download dependencies (cache layer)
RUN ./mvnw dependency:go-offline

# Copy API source
COPY api/src src

# Copy the built React app into Spring Boot's static resources folder
COPY --from=frontend-builder /app/client/dist src/main/resources/static/

# Build the unified JAR
RUN ./mvnw clean package -DskipTests

# ==========================================
# STAGE 3: Final Production Image
# ==========================================
FROM eclipse-temurin:21-jdk-jammy
WORKDIR /app

# 🟢 CRITICAL: Install C++ (g++), Python, and GNU time for real memory metrics
RUN apt-get update && apt-get install -y \
    g++ \
    python3 \
    time \
    && rm -rf /var/lib/apt/lists/*

# Copy the unified JAR from the backend-builder
COPY --from=backend-builder /app/api/target/api-0.0.1-SNAPSHOT.jar app.jar

# Expose port
EXPOSE 8080

# Run the unified application
ENTRYPOINT ["java", "-jar", "app.jar"]
