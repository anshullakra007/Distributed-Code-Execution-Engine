# Use a base image with Java 21 (running on Linux Ubuntu)
FROM eclipse-temurin:21-jdk-jammy

# 🟢 INSTALL COMPILERS (C++ and Python)
# This is the missing step!
RUN apt-get update && apt-get install -y \
    g++ \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy project files
COPY . .

# Build the application
# (using -DskipTests to make it faster)
RUN ./mvnw clean package -DskipTests

# Run the application
ENTRYPOINT ["java", "-jar", "target/api-0.0.1-SNAPSHOT.jar"]