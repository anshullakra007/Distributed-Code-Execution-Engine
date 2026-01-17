# 1. Use a base image with Java 17
FROM eclipse-temurin:17-jdk-jammy

# 2. Install C++ (g++) and Python3 compilers
RUN apt-get update && apt-get install -y \
    g++ \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# 3. Setup the App
WORKDIR /app
COPY . .
# Make sure the maven wrapper is executable
RUN chmod +x mvnw
RUN ./mvnw clean package -DskipTests

# 4. Run the App
ENTRYPOINT ["java", "-jar", "target/api-0.0.1-SNAPSHOT.jar"]