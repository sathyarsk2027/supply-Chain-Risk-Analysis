# Build stage
FROM maven:3.9.7-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# No hardcoded EXPOSE so Render & Railway dynamically route to $PORT
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-XX:+UseSerialGC", "-Xss512k", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
