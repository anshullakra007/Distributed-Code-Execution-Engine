# Use a base image with Java 24 (Matches current Spring Boot)
FROM eclipse-temurin:21-jdk-jammy

# 🟢 CRITICAL: Install C++ (g++) and Python inside the backend container
RUN apt-get update && apt-get install -y \
    g++ \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Build the application (using -DskipTests to make it faster)
RUN chmod +x mvnw && ./mvnw clean package -DskipTests

# Run the application
ENTRYPOINT ["java", "-jar", "target/api-0.0.1-SNAPSHOT.jar"]