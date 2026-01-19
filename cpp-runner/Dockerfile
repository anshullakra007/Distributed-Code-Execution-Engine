# Use a lightweight Java image
FROM openjdk:17-jdk-slim

# 🟢 CRITICAL: Install C++ (g++) and Python inside the backend container
RUN apt-get update && apt-get install -y \
    g++ \
    python3 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy the built jar
COPY target/*.jar app.jar

# Expose port
EXPOSE 8080

# Run the app
ENTRYPOINT ["java", "-jar", "app.jar"]