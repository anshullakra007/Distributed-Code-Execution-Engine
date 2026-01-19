# ----------------------------
# STAGE 1: Build the JAR
# ----------------------------
# Use a Maven image that comes with Java 17 pre-installed
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Copy pom.xml and source code
COPY pom.xml .
COPY src ./src

# Build the application
RUN mvn clean package -DskipTests

# ----------------------------
# STAGE 2: Run the App
# ----------------------------
# Use Eclipse Temurin (The new standard for OpenJDK)
FROM eclipse-temurin:17-jre-jammy
WORKDIR /app

# 🟢 Install C++ (g++) and Python (Critical for Native Execution)
RUN apt-get update && apt-get install -y \
    g++ \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy the built JAR from the previous stage
COPY --from=build /app/target/*.jar app.jar

# Expose port and run
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]