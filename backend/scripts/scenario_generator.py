import json
from pathlib import Path


ROOMS = [
    {
        "roomId": 1,
        "name": "Jungle Microservice Maze",
        "theme": "Jungle",
        "difficulty": "EASY",
        "failureArea": "APIs / microservices",
        "timeLimitSeconds": 300,
        "story": "The team is lost in a dense service maze. Orders reach the API gateway, but the Order Service fails when it checks stock.",
        "evidence": [
            {
                "type": "SERVICE_MAP",
                "title": "Service Dependency Map",
                "content": "Browser -> API Gateway -> Order Service -> Inventory Service",
            },
            {
                "type": "API_RESPONSE",
                "title": "Order API Response",
                "content": "POST /api/orders returns HTTP 500: Unable to complete order",
            },
            {
                "type": "LOG",
                "title": "Order Service Logs",
                "content": "INFO Received order request for productId=45\nINFO Calling Inventory Service: http://inventory-service/inventory/check\nERROR Inventory check failed: 404 Not Found",
            },
            {
                "type": "API_DOC",
                "title": "Inventory API Documentation",
                "content": "Available endpoint: GET /api/inventory/check?productId={id}",
            },
            {
                "type": "CONFIG",
                "title": "Order Service Config",
                "content": "inventory.service.base-url=http://inventory-service\ninventory.service.check-path=/inventory/check",
            },
        ],
        "actions": [
            {"id": "A", "text": "Restart the Order Service pod"},
            {"id": "B", "text": "Increase memory limit for Order Service"},
            {"id": "C", "text": "Update the Inventory Service path to /api/inventory/check"},
            {"id": "D", "text": "Scale Inventory Service to 3 replicas"},
            {"id": "E", "text": "Delete and recreate the database"},
        ],
        "correctActionId": "C",
        "hints": [
            "Both services are running. Look at the API response from the dependency call.",
            "The Order Service receives a 404 from Inventory Service.",
            "Compare the path in the logs with the Inventory API documentation.",
        ],
        "rootCause": "Order Service called /inventory/check, but Inventory Service exposes /api/inventory/check.",
        "learningPoint": "Healthy microservices can still fail when API contracts or configured endpoint paths do not match.",
    },
    {
        "roomId": 2,
        "name": "Desert Resource Survival",
        "theme": "Desert",
        "difficulty": "MEDIUM",
        "failureArea": "Containers / resource limits",
        "timeLimitSeconds": 360,
        "story": "The metrics pipeline is stranded in a resource desert. The pod starts, then dies whenever telemetry volume rises.",
        "evidence": [
            {
                "type": "POD_STATUS",
                "title": "Pod Status",
                "content": "metrics-aggregator-7c9d8f: CrashLoopBackOff\nLast State: Terminated\nReason: OOMKilled\nExit Code: 137",
            },
            {
                "type": "METRIC",
                "title": "Memory Metrics",
                "content": "Container memory usage peaks at 246Mi during ingestion bursts.",
            },
            {
                "type": "CONFIG",
                "title": "Deployment Resource Limits",
                "content": "requests.memory=128Mi\nlimits.memory=192Mi",
            },
            {
                "type": "LOG",
                "title": "Aggregator Logs",
                "content": "INFO Loaded 50000 metric samples\nWARN Heap pressure above 90%\nERROR Process terminated before batch flush",
            },
            {
                "type": "K8S_EVENT",
                "title": "Kubernetes Events",
                "content": "Container metrics-aggregator was killed because it exceeded its memory limit.",
            },
        ],
        "actions": [
            {"id": "A", "text": "Increase the metrics-aggregator memory limit and request"},
            {"id": "B", "text": "Change the Service selector"},
            {"id": "C", "text": "Disable the readiness probe"},
            {"id": "D", "text": "Restart the database pod"},
            {"id": "E", "text": "Rename the container image tag"},
        ],
        "correctActionId": "A",
        "hints": [
            "The pod is not failing because traffic cannot reach it.",
            "Exit code 137 and OOMKilled point to memory pressure.",
            "Compare observed memory usage with the configured container limit.",
        ],
        "rootCause": "The metrics-aggregator container needed about 246Mi during bursts, but its memory limit was only 192Mi.",
        "learningPoint": "Container memory limits protect the cluster, but limits that are too low cause OOMKilled restarts and service instability.",
    },
    {
        "roomId": 3,
        "name": "Snow Mountain Service Pass",
        "theme": "Snow Mountain",
        "difficulty": "HARD",
        "failureArea": "Kubernetes service discovery",
        "timeLimitSeconds": 420,
        "story": "At the frozen summit, the API pods are healthy but no traffic reaches them. The escape route is blocked by an empty Service endpoint list.",
        "evidence": [
            {
                "type": "POD_STATUS",
                "title": "Pod Status",
                "content": "game-api-6f9dd: Running\nReadiness: passing\nLabels: app=game-api, tier=backend",
            },
            {
                "type": "SERVICE",
                "title": "Service Description",
                "content": "service/game-api\nSelector: app=api\nEndpoints: <none>",
            },
            {
                "type": "LOG",
                "title": "API Logs",
                "content": "INFO Started Game API on port 8081\nINFO Readiness check passed\nINFO No incoming requests in the last 5 minutes",
            },
            {
                "type": "HEALTH_CHECK",
                "title": "Health Check",
                "content": "GET http://pod-ip:8081/actuator/health -> 200 UP",
            },
            {
                "type": "YAML",
                "title": "Deployment Labels",
                "content": "metadata.labels.app=game-api\nspec.template.metadata.labels.app=game-api",
            },
        ],
        "actions": [
            {"id": "A", "text": "Fix the Service selector so it matches app=game-api"},
            {"id": "B", "text": "Increase the API CPU limit"},
            {"id": "C", "text": "Rebuild the Docker image"},
            {"id": "D", "text": "Delete the readiness probe"},
            {"id": "E", "text": "Scale the database StatefulSet"},
        ],
        "correctActionId": "A",
        "hints": [
            "The pod is healthy when called directly.",
            "A Service with no endpoints usually has a selector mismatch or no ready pods.",
            "Compare the Service selector with the Deployment pod labels.",
        ],
        "rootCause": "The Service selected app=api, but the Deployment pods were labelled app=game-api, so Kubernetes created no endpoints.",
        "learningPoint": "Kubernetes Services route to pods through label selectors. A small label mismatch can make healthy pods unreachable.",
    },
]


def main() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    output_dir = backend_root / "src" / "main" / "resources" / "scenarios"
    output_dir.mkdir(parents=True, exist_ok=True)

    for room in ROOMS:
        output_path = output_dir / f"room{room['roomId']}.json"
        output_path.write_text(json.dumps(room, indent=2) + "\n", encoding="utf-8")
        print(f"Generated {output_path}")


if __name__ == "__main__":
    main()
