# ----------------------------
# STAGE 1: Build the JAR
# ----------------------------
FROM maven:3.8.5-openjdk-17 AS build
WORKDIR /app

# Copy only the pom.xml first (for faster caching)
COPY pom.xml .

# Copy the source code
COPY src ./src

# Build the application (Skip tests to speed it up)
RUN mvn clean package -DskipTests

# ----------------------------
# STAGE 2: Run the App
# ----------------------------
FROM openjdk:17-jdk-slim
WORKDIR /app

# 🟢 Install C++ and Python (Critical for Native Execution)
RUN apt-get update && apt-get install -y \
    g++ \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Copy the JAR from the build stage
COPY --from=build /app/target/*.jar app.jar

# Expose port and run
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]