import json
from pathlib import Path


ROOM_1 = {
    "roomId": 1,
    "name": "Jungle Microservice Quest",
    "theme": "jungle",
    "difficulty": "EASY",
    "failureArea": "Microservices / API",
    "timeLimitSeconds": 300,
    "story": "Users cannot place orders. The frontend is working, but the Order Service fails when checking stock with the Inventory Service.",
    "evidence": [
        {
            "type": "SERVICE_MAP",
            "title": "Service Dependency Map",
            "content": "Frontend -> Order Service -> Inventory Service",
        },
        {
            "type": "API_RESPONSE",
            "title": "Order API Response",
            "content": "POST /api/orders returns HTTP 500: Unable to complete order",
        },
        {
            "type": "LOG",
            "title": "Order Service Logs",
            "content": "INFO Received order request for productId=45\nINFO Calling Inventory Service: http://inventory-service/inventory/check\nERROR Inventory check failed: 404 Not Found\nERROR Order could not be completed",
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
        {"id": "C", "text": "Update Inventory Service API path to /api/inventory/check"},
        {"id": "D", "text": "Scale Inventory Service to 3 replicas"},
        {"id": "E", "text": "Delete and recreate the database"},
    ],
    "correctActionId": "C",
    "hints": [
        "Both services are running. Look at API responses and logs.",
        "The Order Service receives a 404 from Inventory Service.",
        "Compare the endpoint in the logs with the Inventory API documentation.",
    ],
    "rootCause": "Order Service called /inventory/check, but Inventory Service exposes /api/inventory/check.",
    "learningPoint": "In microservice systems, a service can be healthy but still fail due to an API contract or configuration mismatch.",
}


def main() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    output_path = backend_root / "src" / "main" / "resources" / "scenarios" / "room1.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(ROOM_1, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {output_path}")


if __name__ == "__main__":
    main()
