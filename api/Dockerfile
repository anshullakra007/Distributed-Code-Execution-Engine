# 1. Use Java 21 (Matches your modern Spring Boot version)
FROM eclipse-temurin:21-jdk-jammy

# 2. Install C++ (g++) and Python3 compilers
RUN apt-get update && apt-get install -y \
    g++ \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# 3. Setup the App
WORKDIR /app
COPY . .

# 4. FIX: Grant permission to the Maven Wrapper
RUN chmod +x mvnw

# 5. Build the App (Skip tests to avoid environment errors)
RUN ./mvnw clean package -DskipTests

# 6. Run the App
ENTRYPOINT ["java", "-jar", "target/api-0.0.1-SNAPSHOT.jar"]