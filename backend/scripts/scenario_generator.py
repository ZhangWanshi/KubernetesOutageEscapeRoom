import json
from pathlib import Path


# ── Backend format rooms (rooms 1-3) — used for session management & action validation ──

ROOMS = [
    {
        "roomId": 1,
        "name": "Microservice Incident Response",
        "theme": "Forest",
        "difficulty": "EASY",
        "failureArea": "APIs / microservices",
        "timeLimitSeconds": 300,
        "story": "A production incident has affected the Customer Management Platform. Your task is to restore the system by checking service health, identifying service responsibilities, and fixing a missing configuration value.",
        "evidence": [
            {
                "type": "SERVICE_MAP",
                "title": "Service Dependency Map",
                "content": "Browser -> API Gateway -> Order Service -> Inventory Service",
            },
            {
                "type": "API_RESPONSE",
                "title": "Order API Response",
                "content": "POST /api/orders returns HTTP 500.\nError: Unable to complete order.\nFailure occurs when Order Service calls Inventory Service.",
            },
            {
                "type": "LOG",
                "title": "Order Service Logs",
                "content": "INFO Received order request for productId=45\nINFO Calling Inventory Service\nERROR Connection failed while calling inventory endpoint",
            },
            {
                "type": "API_DOC",
                "title": "Inventory API Documentation",
                "content": "Available endpoint:\nGET /api/inventory/check?productId={id}",
            },
            {
                "type": "CONFIG",
                "title": "Order Service Config",
                "content": "inventory.service.base-url=http://inventory-service\ninventory.service.check-path=/invent",
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
            "Compare the Order Service configuration with the Inventory API documentation. Look carefully at the endpoint path.",
        ],
        "rootCause": "Order Service called /invent, but Inventory Service exposes /api/inventory/check.",
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
            "Check whether the memory usage is higher than the configured memory limit.",
        ],
        "rootCause": "The metrics-aggregator container needed about 246Mi during bursts, but its memory limit was only 192Mi.",
        "learningPoint": "Container memory limits protect the cluster, but limits that are too low cause OOMKilled restarts and service instability.",
    },
    {
        "roomId": 3,
        "name": "Kubernetes Service Routing Fix",
        "theme": "Kubernetes Command Center",
        "difficulty": "HARD",
        "failureArea": "Kubernetes service discovery",
        "timeLimitSeconds": 420,
        "story": "A Kubernetes service is running, and the application pods are healthy, but user traffic is not reaching the application. Your task is to inspect the service, follow the correct debugging sequence, and apply the correct selector fix.",
        "evidence": [
            {
                "type": "POD_STATUS",
                "title": "Pod Status",
                "content": "game-api pod is Running.\nReadiness probe is passing.\nLabels: app=game-api, tier=backend",
            },
            {
                "type": "SERVICE",
                "title": "Service Description",
                "content": "service/game-api\nSelector: app=api\nEndpoints: <none>",
            },
            {
                "type": "LOG",
                "title": "API Logs",
                "content": "INFO Started Game API on port 8081\nINFO Readiness check passed\nINFO No incoming requests",
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
            "Compare the Service selector with the Deployment pod labels.",
        ],
        "rootCause": "The Service selected app=api, but the Deployment pods were labelled app=game-api, so Kubernetes created no endpoints.",
        "learningPoint": "Kubernetes Services route to pods through label selectors. A small label mismatch can make healthy pods unreachable.",
    },
]


# ── Frontend format rooms (r1-r6) — served to the browser for level display ──

FRONTEND_ROOMS = {

    "r1": {
        "type": "cause-fix",
        "levels": [
            {
                "mission": "A freshly deployed pod keeps flapping between Running and CrashLoopBackOff. Work through the evidence before you touch the cluster.",
                "evidence": [
                    {"tab": "Pod status", "kind": "term", "lines": ["$ kubectl get pods", "NAME              READY   STATUS             RESTARTS", "web-7c9f-2xk4     0/1     CrashLoopBackOff   6 (12s ago)"]},
                    {"tab": "Container logs", "kind": "term", "lines": ["$ kubectl logs web-7c9f-2xk4 --previous", "Error: env DATABASE_URL is required but was empty", "process exited with code 1"]},
                    {"tab": "Events", "kind": "term", "lines": ["$ kubectl describe pod web-7c9f-2xk4 | tail -3", "Warning  BackOff   restarting failed container web", "Normal   Pulled    Container image \"web:1.4\" already present"]},
                ],
                "cause": {"opts": [
                    {"t": "The container image tag does not exist in the registry", "c": False},
                    {"t": "A required environment variable is missing from the spec", "c": True},
                    {"t": "The node is out of memory and evicting the pod", "c": False},
                    {"t": "The readiness probe path returns 404", "c": False},
                ]},
                "fix": {"opts": [
                    {"t": "Add the missing DATABASE_URL env var to the container spec", "c": True},
                    {"t": "Increase the CPU limit and redeploy", "c": False},
                    {"t": "Disable the liveness probe", "c": False},
                    {"t": "Rebuild and re-push the Docker image", "c": False},
                ]},
                "hint": "The container exits on startup — before any probe runs. Read the --previous logs.",
            },
            {
                "mission": "After migrating to a private registry, the web pod can no longer start. Images that were accessible yesterday now fail to pull entirely.",
                "evidence": [
                    {"tab": "Pod status", "kind": "term", "lines": ["$ kubectl get pods", "NAME              READY   STATUS             RESTARTS", "web-7c9f-4m2p     0/1     ImagePullBackOff   0 (30s ago)"]},
                    {"tab": "Events", "kind": "term", "lines": ["$ kubectl describe pod web-7c9f-4m2p | tail -4", "Warning  Failed    Failed to pull image \"registry.internal/web:2.0\"", "         unexpected status code 401 Unauthorized"]},
                    {"tab": "Pod spec", "kind": "yaml", "lines": ["spec:", "  containers:", "  - image: registry.internal/web:2.0", "    name: web", "  # imagePullSecrets: []  <-- not set"]},
                ],
                "cause": {"opts": [
                    {"t": "The image tag 2.0 does not exist in the registry", "c": False},
                    {"t": "No imagePullSecrets configured — nodes cannot auth to the private registry", "c": True},
                    {"t": "The container port mapping is wrong", "c": False},
                    {"t": "The node is cordoned and cannot pull images", "c": False},
                ]},
                "fix": {"opts": [
                    {"t": "Create a docker-registry Secret and add it to the pod spec under imagePullSecrets", "c": True},
                    {"t": "Change the image tag to latest", "c": False},
                    {"t": "Delete the pod and let it reschedule", "c": False},
                    {"t": "Rebuild the image and push it again", "c": False},
                ]},
                "hint": "A 401 means authentication failed. Kubernetes needs a Secret of type docker-registry to pull from private registries.",
            },
            {
                "mission": "A new service has an init container that runs DB migrations before the main app starts. The pod is stuck in Init:CrashLoopBackOff — the main container never launches.",
                "evidence": [
                    {"tab": "Pod status", "kind": "term", "lines": ["$ kubectl get pods", "NAME     READY   STATUS                  RESTARTS", "app-0    0/1     Init:CrashLoopBackOff   5 (2m ago)"]},
                    {"tab": "Init logs", "kind": "term", "lines": ["$ kubectl logs app-0 -c migrate", "dial tcp: connect to postgres.default.svc:5432: connection refused", "FATAL: migration failed — exiting"]},
                    {"tab": "Init spec", "kind": "yaml", "lines": ["initContainers:", "- name: migrate", "  image: migrate-tool:1.0", "  env:", "  - name: DB_HOST", "    value: \"postgres.default.svc\"  # wrong namespace"]},
                ],
                "cause": {"opts": [
                    {"t": "The init container image is corrupted and cannot run", "c": False},
                    {"t": "DB_HOST points to the wrong namespace — the database lives in the data namespace", "c": True},
                    {"t": "Init containers cannot access environment variables", "c": False},
                    {"t": "The main container is blocking the init container from completing", "c": False},
                ]},
                "fix": {"opts": [
                    {"t": "Update DB_HOST to postgres.data.svc.cluster.local to reach the correct namespace", "c": True},
                    {"t": "Delete the init container definition entirely", "c": False},
                    {"t": "Add a longer sleep before the migration runs", "c": False},
                    {"t": "Switch to a newer version of the migration image", "c": False},
                ]},
                "hint": "Kubernetes DNS is <svc>.<namespace>.svc.cluster.local. The init container resolves the wrong namespace.",
            },
        ],
    },

    "r2": {
        "type": "fill-blank",
        "levels": [
            {
                "mission": "The app boots in ERROR log level despite the ConfigMap being set to debug. The Deployment references the wrong ConfigMap name and key.",
                "evidence": [
                    {"tab": "App logs", "kind": "term", "lines": ["$ kubectl logs app-7x2k | head -3", "INFO  starting with log level: ERROR (default fallback)", "WARN  env var LOG_LEVEL not found, using default"]},
                    {"tab": "ConfigMap", "kind": "term", "lines": ["$ kubectl get configmap app-config -o yaml", "data:", "  LOG_LEVEL: \"debug\""]},
                    {"tab": "Deployment", "kind": "yaml", "lines": ["env:", "- name: LOG_LEVEL", "  valueFrom:", "    configMapKeyRef:", "      name: app-settings   # wrong name", "      key: log_level       # wrong key case"]},
                ],
                "hint": "The ConfigMap is named app-config. ConfigMap keys are case-sensitive: check LOG_LEVEL vs log_level.",
                "intro": "Complete the correct ConfigMap reference in the Deployment spec:",
                "template": [
                    "env:",
                    "  - name: LOG_LEVEL",
                    "    valueFrom:",
                    "      configMapKeyRef:",
                    "        name: [blank 1]",
                    "        key:  [blank 2]",
                ],
                "blanks": [
                    {"answer": "app-config", "label": "[blank 1] — ConfigMap name", "placeholder": "e.g. my-config"},
                    {"answer": "LOG_LEVEL",  "label": "[blank 2] — Key name",       "placeholder": "e.g. MY_KEY"},
                ],
            },
            {
                "mission": "The app cannot connect to the database — the password env var is empty. The Secret exists, but the Deployment has the wrong Secret name and key.",
                "evidence": [
                    {"tab": "App logs", "kind": "term", "lines": ["$ kubectl logs api-pod | head -2", "FATAL DB connection refused: password is empty", "using connection string: postgres://app:@db:5432/prod"]},
                    {"tab": "Secret", "kind": "term", "lines": ["$ kubectl get secret db-creds -o yaml", "data:", "  password: c2VjcmV0UGFzcw==   # base64 of secretPass"]},
                    {"tab": "Deployment", "kind": "yaml", "lines": ["env:", "- name: DB_PASSWORD", "  valueFrom:", "    secretKeyRef:", "      name: database-secret   # wrong name", "      key: db_password         # wrong key"]},
                ],
                "hint": "The Secret is named db-creds and its key is password — not database-secret / db_password.",
                "intro": "Fix the Secret reference so the pod picks up DB_PASSWORD correctly:",
                "template": [
                    "env:",
                    "  - name: DB_PASSWORD",
                    "    valueFrom:",
                    "      secretKeyRef:",
                    "        name: [blank 1]",
                    "        key:  [blank 2]",
                ],
                "blanks": [
                    {"answer": "db-creds", "label": "[blank 1] — Secret name", "placeholder": "e.g. my-secret"},
                    {"answer": "password", "label": "[blank 2] — Key name",   "placeholder": "e.g. my-key"},
                ],
            },
            {
                "mission": "Three env vars all fail to load. Each references a different source. Fix all three names so the app starts correctly.",
                "evidence": [
                    {"tab": "App errors", "kind": "term", "lines": ["$ kubectl logs app-0 | grep \"not found\"", "WARN  LOG_LEVEL not found — using ERROR", "WARN  DB_PASSWORD not found — skipping auth", "WARN  API_KEY not found — disabling external calls"]},
                    {"tab": "Resources", "kind": "term", "lines": ["$ kubectl get cm,secret", "NAME              DATA", "configmap/app-config  2", "secret/db-creds       1", "secret/api-credentials 1"]},
                    {"tab": "Deployment", "kind": "yaml", "lines": ["# All three names below are wrong:", "configMapKeyRef:", "  name: app-settings       # [blank 1]", "secretKeyRef (DB):", "  name: database-creds     # [blank 2]", "secretKeyRef (API):", "  name: api-keys           # [blank 3]"]},
                ],
                "hint": "The three correct source names are: app-config (ConfigMap), db-creds (Secret), api-credentials (Secret).",
                "intro": "Fill in all three source names to wire up the environment variables:",
                "template": [
                    "# LOG_LEVEL from ConfigMap:",
                    "  configMapKeyRef:",
                    "    name: [blank 1]",
                    "",
                    "# DB_PASSWORD from Secret:",
                    "  secretKeyRef:",
                    "    name: [blank 2]",
                    "",
                    "# API_KEY from Secret:",
                    "  secretKeyRef:",
                    "    name: [blank 3]",
                ],
                "blanks": [
                    {"answer": "app-config",      "label": "[blank 1] — ConfigMap name",  "placeholder": "configmap name"},
                    {"answer": "db-creds",         "label": "[blank 2] — DB Secret name",  "placeholder": "secret name"},
                    {"answer": "api-credentials",  "label": "[blank 3] — API Secret name", "placeholder": "secret name"},
                ],
            },
        ],
    },

    "r3": {
        "type": "drag-match",
        "levels": [
            {
                "mission": "The team is onboarding. Before touching the cluster, prove you can map the four core Kubernetes building blocks to what they actually do.",
                "evidence": [
                    {"tab": "Cluster objects", "kind": "term", "lines": ["$ kubectl get all -n production", "NAME                    READY   STATUS", "pod/web-7c9f-2xk4       1/1     Running", "deployment.apps/web     3/3     available", "service/web-svc         ClusterIP  10.96.0.1"]},
                    {"tab": "Config objects", "kind": "term", "lines": ["$ kubectl get cm,secret -n production", "NAME                  DATA", "configmap/app-config  3", "secret/db-creds       2"]},
                    {"tab": "Reference", "kind": "yaml", "lines": ["# Core K8s object hierarchy:", "Deployment  → manages pods", "Service     → exposes pods", "ConfigMap   → non-sensitive config", "Secret      → sensitive credentials"]},
                ],
                "hint": "A Service provides network access, a Deployment manages lifecycle, ConfigMap stores config, Secret stores secrets.",
                "intro": "Match each Kubernetes object to its purpose:",
                "pairs": [
                    {"term": "Deployment",  "definition": "Manages rolling updates and maintains the desired number of pod replicas"},
                    {"term": "Service",     "definition": "Provides a stable network endpoint and load-balances traffic across matching pods"},
                    {"term": "ConfigMap",   "definition": "Stores non-sensitive configuration data consumed by pods as env vars or volume files"},
                    {"term": "Secret",      "definition": "Stores sensitive data like passwords and tokens in an obfuscated, base64-encoded form"},
                ],
            },
            {
                "mission": "A new engineer is debugging networking and storage issues. They need to identify which object controls which layer of the cluster.",
                "evidence": [
                    {"tab": "Networking", "kind": "term", "lines": ["$ kubectl get ingress,hpa -n production", "NAME               CLASS    HOSTS", "ingress/web-ingress nginx   app.example.com", "", "NAME          REFERENCE          TARGETS", "hpa/web-hpa   Deployment/web     45%/70%"]},
                    {"tab": "Storage", "kind": "term", "lines": ["$ kubectl get pvc -n production", "NAME           STATUS   VOLUME     CAPACITY", "data-pvc       Bound    pv-data    20Gi"]},
                    {"tab": "Namespaces", "kind": "term", "lines": ["$ kubectl get namespaces", "NAME         STATUS   AGE", "production   Active   30d", "staging      Active   30d", "monitoring   Active   15d"]},
                ],
                "hint": "Ingress handles HTTP routing, HPA auto-scales pods, PVC requests storage, Namespace isolates workloads.",
                "intro": "Match each networking and storage object to what it controls:",
                "pairs": [
                    {"term": "Namespace",               "definition": "Divides a cluster into isolated virtual sub-clusters for separate teams or environments"},
                    {"term": "PersistentVolumeClaim",   "definition": "A request for storage that binds to a PersistentVolume provisioned by the cluster"},
                    {"term": "Ingress",                 "definition": "Routes external HTTP/HTTPS traffic to Services based on hostname or URL path rules"},
                    {"term": "HorizontalPodAutoscaler", "definition": "Automatically adjusts pod replica count based on CPU, memory, or custom metrics"},
                ],
            },
            {
                "mission": "The SRE team is auditing advanced workload types. Match all five specialised controllers to their operational purpose.",
                "evidence": [
                    {"tab": "Workloads", "kind": "term", "lines": ["$ kubectl get statefulset,daemonset,job -n production", "NAME                    READY", "statefulset/postgres    3/3", "daemonset/log-agent     8/8", "job/db-migrate          1/1 (Completed)"]},
                    {"tab": "CronJobs", "kind": "term", "lines": ["$ kubectl get cronjob -n production", "NAME            SCHEDULE    LAST SCHEDULE", "cleanup-job     0 2 * * *   2h ago"]},
                    {"tab": "LimitRange", "kind": "term", "lines": ["$ kubectl describe limitrange default-limits", "Type       Resource  Default Request  Default Limit", "Container  cpu       100m             500m", "Container  memory    128Mi            512Mi"]},
                ],
                "hint": "StatefulSet = ordered stable pods, DaemonSet = every node, Job = one-shot task, CronJob = scheduled, LimitRange = default resource caps.",
                "intro": "Match each advanced Kubernetes controller to its purpose:",
                "pairs": [
                    {"term": "StatefulSet",  "definition": "Manages pods with stable network identity and ordered, persistent storage — ideal for databases"},
                    {"term": "DaemonSet",    "definition": "Ensures exactly one pod runs on every node in the cluster — used for log agents and monitors"},
                    {"term": "Job",          "definition": "Runs pods to successful completion for one-off batch tasks such as migrations or report generation"},
                    {"term": "CronJob",      "definition": "Creates Jobs automatically on a repeating cron schedule — for backups, reports, and cleanup tasks"},
                    {"term": "LimitRange",   "definition": "Enforces default resource request and limit policies for all containers in a namespace"},
                ],
            },
        ],
    },

    "r4": {
        "type": "sequence",
        "levels": [
            {
                "mission": "The API service is running but returns no traffic. Arrange the troubleshooting steps in the correct order to find and fix the broken Service selector.",
                "evidence": [
                    {"tab": "Endpoints", "kind": "term", "lines": ["$ kubectl get endpoints api-svc", "NAME      ENDPOINTS   AGE", "api-svc   <none>      9m"]},
                    {"tab": "Pod labels", "kind": "term", "lines": ["$ kubectl get pods --show-labels", "api-5d8c   1/1   Running   app=game-api", "api-4f7a   1/1   Running   app=game-api"]},
                    {"tab": "Service spec", "kind": "yaml", "lines": ["# svc api-svc", "spec:", "  selector:", "    app: api    # does not match pods (game-api)"]},
                ],
                "hint": "Empty endpoints = no pod matched. Always verify endpoints first, then trace back to labels vs selector.",
                "intro": "Arrange the four steps in the correct debugging order:",
                "steps": [
                    "Check endpoints: kubectl get endpoints api-svc — confirm none are listed",
                    "Inspect pod labels: kubectl get pods --show-labels — note the actual label values",
                    "Compare the Service selector field to the pod labels to find the mismatch",
                    "Patch the Service selector to match the pod labels: kubectl edit svc api-svc",
                ],
            },
            {
                "mission": "A bad deployment is serving 500 errors. You need to roll back to the last healthy revision. Arrange the correct rollback workflow.",
                "evidence": [
                    {"tab": "Rollout", "kind": "term", "lines": ["$ kubectl rollout status deploy/web", "Waiting for rollout: 1 of 3 updated replicas available...", "web-2-9fd   0/1   Running   readiness: failing"]},
                    {"tab": "Readiness", "kind": "term", "lines": ["$ kubectl describe pod web-2-9fd | grep -A1 Readiness", "Readiness probe failed: HTTP 500 on /healthz", "Image:  web:2.1.0"]},
                    {"tab": "History", "kind": "term", "lines": ["$ kubectl rollout history deploy/web", "REVISION  CHANGE-CAUSE", "3         web:2.0.5  (healthy, 6d)", "4         web:2.1.0  (current, failing)"]},
                ],
                "hint": "Always confirm the failure before rolling back. Check history to know which revision is stable, then undo.",
                "intro": "Arrange the five rollback steps in the correct sequence:",
                "steps": [
                    "Confirm the rollout is stuck: kubectl rollout status deploy/web",
                    "View history to identify the last healthy revision: kubectl rollout history deploy/web",
                    "Describe a failing pod to read the readiness probe error message",
                    "Execute the rollback to the previous revision: kubectl rollout undo deploy/web",
                    "Verify recovery: kubectl rollout status deploy/web confirms success",
                ],
            },
            {
                "mission": "A pod is in CrashLoopBackOff. No one knows why. Arrange the full debugging workflow from identification to verified fix.",
                "evidence": [
                    {"tab": "Pod status", "kind": "term", "lines": ["$ kubectl get pods", "NAME       READY   STATUS             RESTARTS", "app-0      0/1     CrashLoopBackOff   8 (3m ago)"]},
                    {"tab": "Last state", "kind": "term", "lines": ["$ kubectl describe pod app-0 | grep -A2 \"Last State\"", "Last State: Terminated", "  Reason: Error  Exit Code: 1"]},
                    {"tab": "Events", "kind": "term", "lines": ["$ kubectl get events --field-selector=involvedObject.name=app-0", "Warning  BackOff  Back-off restarting failed container", "Normal   Started  Started container app"]},
                ],
                "hint": "Always read --previous logs first — they contain the actual crash reason before the container is replaced.",
                "intro": "Arrange the six CrashLoopBackOff debugging steps in order:",
                "steps": [
                    "Identify the failing pod name: kubectl get pods",
                    "Read the last crash output: kubectl logs app-0 --previous",
                    "Inspect events and probe config: kubectl describe pod app-0",
                    "Determine the root cause from logs and events (env var, image, or resource issue)",
                    "Apply the targeted fix to the Deployment spec and trigger a rollout",
                    "Confirm recovery: kubectl rollout status deploy/app — wait for all replicas to reach Running",
                ],
            },
        ],
    },

    "r5": {
        "type": "command",
        "levels": [
            {
                "mission": "A bad deployment is live in production. Build the exact kubectl command that rolls it back to the previous revision.",
                "evidence": [
                    {"tab": "Failing deploy", "kind": "term", "lines": ["$ kubectl rollout status deploy/api-service -n production", "Waiting for rollout to finish: 0 of 3 replicas available", "(readiness probe failing for 4 minutes)"]},
                    {"tab": "History", "kind": "term", "lines": ["$ kubectl rollout history deploy/api-service -n production", "REVISION  CHANGE-CAUSE", "5         api:1.4.0  (healthy, 3d)", "6         api:1.5.0  (current, failing)"]},
                    {"tab": "Target command", "kind": "yaml", "lines": ["# Undo to previous revision:", "# kubectl rollout undo deployment/api-service -n production", "", "# Tokens: kubectl  rollout  undo", "#         deployment/api-service  -n  production"]},
                ],
                "hint": "The command is: kubectl rollout undo deployment/api-service -n production",
                "intro": "Drag the tokens into the correct order to build the rollback command:",
                "parts": ["kubectl", "rollout", "undo", "deployment/api-service", "-n", "production"],
            },
            {
                "mission": "The staging deployment needs to be reduced from 10 replicas to 3 to free up cluster resources. Build the correct scale command.",
                "evidence": [
                    {"tab": "Current state", "kind": "term", "lines": ["$ kubectl get deploy/web -n staging", "NAME   READY   UP-TO-DATE   AVAILABLE", "web    10/10   10           10"]},
                    {"tab": "Node pressure", "kind": "metrics", "rows": [["CPU used (staging)", "87%", "err"], ["Memory used", "79%", "warn"], ["Pods scheduled", "10 / 10 max", "warn"], ["Target replicas", "3", "ok"]]},
                    {"tab": "Target command", "kind": "yaml", "lines": ["# Scale to 3 replicas:", "# kubectl scale deployment/web --replicas=3 -n staging", "", "# Tokens: kubectl  scale  deployment/web", "#         --replicas=3  -n  staging"]},
                ],
                "hint": "The command is: kubectl scale deployment/web --replicas=3 -n staging",
                "intro": "Drag the tokens into the correct order to scale the deployment:",
                "parts": ["kubectl", "scale", "deployment/web", "--replicas=3", "-n", "staging"],
            },
            {
                "mission": "A hotfix image is ready. You need to update the running deployment to the new image without a full YAML edit. Build the set image command.",
                "evidence": [
                    {"tab": "Current image", "kind": "term", "lines": ["$ kubectl get deploy/api-service -n production -o jsonpath=\"{..image}\"", "registry.internal/api:v2.0", "(current — has the memory leak bug)"]},
                    {"tab": "New image", "kind": "term", "lines": ["$ docker images registry.internal/api", "REPOSITORY               TAG", "registry.internal/api    v2.1   (patched)"]},
                    {"tab": "Target command", "kind": "yaml", "lines": ["# Update container image inline:", "# kubectl set image deployment/api-service api=api:v2.1 -n production", "", "# Tokens: kubectl  set  image", "#         deployment/api-service  api=api:v2.1  -n  production"]},
                ],
                "hint": "The command is: kubectl set image deployment/api-service api=api:v2.1 -n production",
                "intro": "Drag the seven tokens into the correct order:",
                "parts": ["kubectl", "set", "image", "deployment/api-service", "api=api:v2.1", "-n", "production"],
            },
        ],
    },

    "r6": {
        "type": "sequence",
        "levels": [
            {
                "mission": "Traffic spiked but the HPA never scaled. Arrange the correct sequence to investigate the autoscaler and restore its ability to react.",
                "evidence": [
                    {"tab": "HPA", "kind": "term", "lines": ["$ kubectl get hpa", "NAME      REFERENCE        TARGETS         REPLICAS", "web-hpa   Deployment/web   <unknown>/70%   1"]},
                    {"tab": "HPA events", "kind": "term", "lines": ["$ kubectl describe hpa web-hpa | grep -i cpu", "failed to get cpu utilization:", "missing request for cpu on container web"]},
                    {"tab": "Metrics API", "kind": "term", "lines": ["$ kubectl top pods", "error: Metrics API not available", "(no cpu/memory baseline to scale against)"]},
                ],
                "hint": "Confirm the HPA target shows <unknown>, find why it cannot compute utilization, then fix the root cause.",
                "intro": "Arrange the five steps to restore HPA scaling:",
                "steps": [
                    "Confirm the HPA is stuck: kubectl get hpa — TARGETS shows <unknown>/70%",
                    "Describe the HPA to read the error: kubectl describe hpa web-hpa — missing cpu request",
                    "Inspect the Deployment resource spec — confirm CPU requests field is absent",
                    "Add CPU requests to the Deployment container spec and trigger a rollout",
                    "Watch the HPA recover: kubectl get hpa -w — TARGETS shows a real percentage",
                ],
            },
            {
                "mission": "The application fails to authenticate to its database after a secret rotation. Arrange the complete investigation and recovery steps.",
                "evidence": [
                    {"tab": "App logs", "kind": "term", "lines": ["$ kubectl logs app-0 | grep -i \"auth\\|password\"", "FATAL DB authentication failed: invalid password", "retrying... (attempt 3 of 3)"]},
                    {"tab": "Secret", "kind": "term", "lines": ["$ kubectl get secret db-creds -o yaml | grep creationTimestamp", "creationTimestamp: \"2024-01-15T09:41:00Z\"  # updated 10m ago"]},
                    {"tab": "Pod env", "kind": "term", "lines": ["$ kubectl exec app-0 -- printenv DB_PASSWORD", "old_password_hash_abc123   # stale — from before rotation"]},
                ],
                "hint": "Env vars from Secrets are snapshot at pod start. A rollout restart is required to pick up the new value.",
                "intro": "Arrange the six steps for Secret rotation recovery:",
                "steps": [
                    "Read pod logs to confirm the authentication failure message",
                    "Verify the Secret exists and was recently updated: kubectl get secret db-creds",
                    "Check the env var value in the running pod: kubectl exec app-0 -- printenv DB_PASSWORD",
                    "Confirm the running value is stale — it predates the Secret rotation",
                    "Fix the secretKeyRef name in the Deployment if it is wrong (or confirm it is correct)",
                    "Restart the deployment to pick up the new Secret: kubectl rollout restart deploy/app",
                ],
            },
            {
                "mission": "A full production incident is in progress. Multiple pods are failing across namespaces. Arrange the complete incident response sequence from triage to verified recovery.",
                "evidence": [
                    {"tab": "Cluster state", "kind": "term", "lines": ["$ kubectl get pods --all-namespaces | grep -v Running", "NAMESPACE     NAME            STATUS", "production    api-0           CrashLoopBackOff", "production    worker-3        OOMKilled", "data          db-proxy-2      Error"]},
                    {"tab": "Events", "kind": "term", "lines": ["$ kubectl get events -A --sort-by=.metadata.creationTimestamp | tail -5", "Warning  OOMKilled       worker-3: memory limit exceeded", "Warning  BackOff         api-0: restarting failed container", "Warning  FailedMount     db-proxy-2: secret not found"]},
                    {"tab": "Incident scope", "kind": "metrics", "rows": [["Failing pods", "3", "err"], ["Affected namespaces", "2", "warn"], ["Active alerts", "5", "err"], ["Estimated impact", "P1 — full outage", "err"]]},
                ],
                "hint": "Triage before touching anything. Read events cluster-wide, isolate root causes per component, fix, then verify end-to-end.",
                "intro": "Arrange the seven incident response steps in the correct order:",
                "steps": [
                    "Triage scope: kubectl get pods --all-namespaces — identify all failing workloads",
                    "Read cluster-wide events sorted by time: kubectl get events -A --sort-by=.metadata.creationTimestamp",
                    "Isolate each root component causing failures by reading its describe output",
                    "Read crash logs from each failing pod: kubectl logs <pod> --previous",
                    "Apply targeted fixes per issue (env var, selector, resource limit, or rollback)",
                    "Verify each fix propagates: kubectl rollout status deploy/<name> for each component",
                    "Confirm end-to-end service health with a test request against the production endpoint",
                ],
            },
        ],
    },

}


def main() -> None:
    backend_root = Path(__file__).resolve().parents[1]

    # Generate backend scenario JSONs (rooms 1-3, used for session management)
    scenario_dir = backend_root / "src" / "main" / "resources" / "scenarios"
    scenario_dir.mkdir(parents=True, exist_ok=True)
    for room in ROOMS:
        output_path = scenario_dir / f"room{room['roomId']}.json"
        output_path.write_text(json.dumps(room, indent=2) + "\n", encoding="utf-8")
        print(f"Generated {output_path}")

    # Generate frontend content JSONs (rooms r1-r6, served to the browser for level display)
    content_dir = backend_root / "src" / "main" / "resources" / "content"
    content_dir.mkdir(parents=True, exist_ok=True)
    for room_id, room_data in FRONTEND_ROOMS.items():
        output_path = content_dir / f"{room_id}.json"
        output_path.write_text(json.dumps(room_data, indent=2) + "\n", encoding="utf-8")
        print(f"Generated {output_path}")


if __name__ == "__main__":
    main()
