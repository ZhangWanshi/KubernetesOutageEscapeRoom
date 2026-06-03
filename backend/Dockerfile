FROM eclipse-temurin:17-jdk AS build
WORKDIR /workspace
COPY .mvn .mvn
COPY mvnw mvnw
COPY mvnw.cmd mvnw.cmd
COPY pom.xml pom.xml
COPY src src
RUN chmod +x mvnw && ./mvnw -DskipTests package

FROM eclipse-temurin:17-jre
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends wget && rm -rf /var/lib/apt/lists/*
RUN addgroup --system app && adduser --system --ingroup app app
COPY --from=build /workspace/target/*.jar app.jar
USER app
EXPOSE 8081
ENV SERVER_PORT=8081
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD wget -qO- http://localhost:8081/api/health || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
