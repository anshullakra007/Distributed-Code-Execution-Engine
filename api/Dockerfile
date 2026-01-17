# 1. Use Java 21 (Required for your Spring Boot 4.0.1 version)
FROM eclipse-temurin:21-jdk-jammy

# 2. Install C++ (g++) and Python3 compilers
RUN apt-get update && apt-get install -y \
    g++ \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# 3. Setup the App
WORKDIR /app
COPY . .

# 4. CRITICAL FIX: Make the build script executable
RUN chmod +x mvnw

# 5. Build the App (Skip tests to avoid crashes)
RUN ./mvnw clean package -DskipTests

# 6. Run the App
ENTRYPOINT ["java", "-jar", "target/api-0.0.1-SNAPSHOT.jar"]