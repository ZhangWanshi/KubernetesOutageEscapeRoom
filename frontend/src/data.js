/* data.js — game content & per-biome room themes (window.QuestData).
   Plain data extracted from the original single-file build, verbatim. */
(function () {
  const ROOM_THEME = {
    forest: { accent: '#4FB23A', base: '#0B2417', scene: 'forest',
      bg: `linear-gradient(180deg, rgba(7,21,13,.02) 0%, rgba(7,21,13,.06) 26%, rgba(7,21,13,.30) 62%, rgba(7,21,13,.50) 100%)` },
    snow: { accent: '#5C87A6', base: '#16273A', scene: 'snow',
      bg: `linear-gradient(180deg, rgba(12,24,38,.02) 0%, rgba(12,24,38,.06) 26%, rgba(12,24,38,.30) 62%, rgba(12,24,38,.52) 100%)` },
    desert: { accent: '#C68A33', base: '#241407', scene: 'desert',
      bg: `linear-gradient(180deg, rgba(28,16,6,.02) 0%, rgba(28,16,6,.06) 26%, rgba(28,16,6,.30) 62%, rgba(28,16,6,.52) 100%)` },
    beach: { accent: '#2E9CA8', base: '#0B2A30', scene: 'beach',
      bg: `linear-gradient(180deg, rgba(7,30,34,.02) 0%, rgba(7,30,34,.06) 26%, rgba(7,30,34,.30) 62%, rgba(7,30,34,.52) 100%)` },
    ice: { accent: '#4C8FB0', base: '#10222F', scene: 'ice',
      bg: `linear-gradient(180deg, rgba(10,22,32,.02) 0%, rgba(10,22,32,.06) 26%, rgba(10,22,32,.30) 62%, rgba(10,22,32,.52) 100%)` },
    volcanic: { accent: '#D45A36', base: '#1A0604', scene: 'volcanic',
      bg: `linear-gradient(180deg, rgba(20,5,3,.04) 0%, rgba(20,5,3,.10) 26%, rgba(20,5,3,.34) 62%, rgba(20,5,3,.56) 100%)` },
  };

  const CONTENT = {
    r1: {
      mission: 'A freshly deployed pod keeps flapping between Running and CrashLoopBackOff. Work through the evidence before you touch the cluster.',
      evidence: [
        { tab: 'Pod status', kind: 'term', lines: ['$ kubectl get pods', 'NAME              READY   STATUS             RESTARTS', 'web-7c9f-2xk4     0/1     CrashLoopBackOff   6 (12s ago)'] },
        { tab: 'Container logs', kind: 'term', lines: ['$ kubectl logs web-7c9f-2xk4 --previous', 'Error: env DATABASE_URL is required but was empty', 'process exited with code 1'] },
        { tab: 'Events', kind: 'term', lines: ['$ kubectl describe pod web-7c9f-2xk4 | tail -3', 'Warning  BackOff   restarting failed container web', 'Normal   Pulled    Container image "web:1.4" already present'] },
      ],
      cause: { opts: [
        { t: 'The container image tag does not exist in the registry', c: false },
        { t: 'A required environment variable is missing from the spec', c: true },
        { t: 'The node is out of memory and evicting the pod', c: false },
        { t: 'The readiness probe path returns 404', c: false },
      ] },
      fix: { opts: [
        { t: 'Add the missing DATABASE_URL env var to the container spec', c: true },
        { t: 'Increase the CPU limit and redeploy', c: false },
        { t: 'Disable the liveness probe', c: false },
        { t: 'Rebuild and re-push the Docker image', c: false },
      ] },
      hint: 'The container exits on startup — before any probe runs. Read the --previous logs.',
    },
    r2: {
      mission: 'The API microservice is Running and healthy, yet calls to it get no response. Something between the Service and its pods is broken.',
      evidence: [
        { tab: 'Endpoints', kind: 'term', lines: ['$ kubectl get endpoints api-svc', 'NAME      ENDPOINTS   AGE', 'api-svc   <none>      9m'] },
        { tab: 'Pod labels', kind: 'term', lines: ['$ kubectl get pods --show-labels', 'api-5d8c   1/1   Running   app=game-api', 'api-5d8c   1/1   Running   app=game-api'] },
        { tab: 'Service spec', kind: 'yaml', lines: ['# svc api-svc', 'spec:', '  selector:', '    app: api', '  ports:', '    - port: 8080'] },
      ],
      cause: { opts: [
        { t: 'The Service selector does not match the pod labels', c: true },
        { t: 'The pods are stuck in CrashLoopBackOff', c: false },
        { t: 'The targetPort is greater than 65535', c: false },
        { t: 'The Service type must be LoadBalancer', c: false },
      ] },
      fix: { opts: [
        { t: 'Update the Service selector to app=game-api', c: true },
        { t: 'Restart all of the api pods', c: false },
        { t: 'Change the Service type to LoadBalancer', c: false },
        { t: 'Disable the readiness probe', c: false },
      ] },
      hint: 'Empty endpoints means no pod matched. Compare the selector to the labels the pods actually carry.',
    },
    r3: {
      mission: 'The service starts but cannot authenticate to its database. The Secret exists, but the value the app reads is empty. Trace the wiring.',
      evidence: [
        { tab: 'Secret', kind: 'term', lines: ['$ kubectl get secret db-creds', 'NAME       TYPE     DATA   AGE', 'db-creds   Opaque   2      4m'] },
        { tab: 'Pod env', kind: 'term', lines: ['$ kubectl exec app-0 -- printenv DB_PASSWORD', '(empty output)'] },
        { tab: 'Deployment ref', kind: 'yaml', lines: ['env:', '  - name: DB_PASSWORD', '    valueFrom:', '      secretKeyRef:', '        name: db-credentials', '        key: password'] },
      ],
      cause: { opts: [
        { t: 'The secretKeyRef name (db-credentials) does not match the real Secret (db-creds)', c: true },
        { t: 'Secrets cannot be exposed as environment variables', c: false },
        { t: 'The Secret must be base64-decoded by the app', c: false },
        { t: 'Opaque secrets are write-only', c: false },
      ] },
      fix: { opts: [
        { t: 'Correct the secretKeyRef name to db-creds', c: true },
        { t: 'Manually base64-decode the secret value', c: false },
        { t: 'Mount the secret as a volume instead', c: false },
        { t: 'Delete and recreate the pod', c: false },
      ] },
      hint: 'The Secret is named db-creds. Look closely at the name the Deployment asks for.',
    },
    r4: {
      mission: 'A new version was rolled out and traffic started erroring. The rollout is stalled and new pods never become Ready. Inspect the deployment history.',
      evidence: [
        { tab: 'Rollout', kind: 'term', lines: ['$ kubectl rollout status deploy/web', 'Waiting for rollout: 1 of 3 updated replicas are available...', '$ kubectl get pods', 'web-2-9fd   0/1   Running   readiness: failing'] },
        { tab: 'Readiness', kind: 'term', lines: ['$ kubectl describe pod web-2-9fd | grep -A1 Readiness', 'Readiness probe failed: HTTP 500 on /healthz', 'Image:  web:2.1.0'] },
        { tab: 'History', kind: 'term', lines: ['$ kubectl rollout history deploy/web', 'REVISION  CHANGE-CAUSE', '3         web:2.0.5  (healthy, 6d)', '4         web:2.1.0  (current, failing)'] },
      ],
      cause: { opts: [
        { t: 'The new revision web:2.1.0 fails readiness — a bad rollout', c: true },
        { t: 'The cluster ran out of nodes', c: false },
        { t: 'The Service selector changed', c: false },
        { t: 'The namespace quota was exceeded', c: false },
      ] },
      fix: { opts: [
        { t: 'Roll back to the last healthy revision (rollout undo)', c: true },
        { t: 'Scale the deployment to 10 replicas', c: false },
        { t: 'Delete the Service in front of it', c: false },
        { t: 'Remove the readiness probe so pods report Ready', c: false },
      ] },
      hint: 'The history shows a healthy previous revision. The new image never passes /healthz.',
    },
    r5: {
      mission: 'A worker pod restarts again and again. CPU looks fine, but the container keeps dying. This is a resource-limits fight — read the metrics.',
      evidence: [
        { tab: 'Pod status', kind: 'term', lines: ['$ kubectl get pod worker-0', 'NAME       READY   STATUS             RESTARTS', 'worker-0   0/1     CrashLoopBackOff   7', '$ kubectl describe pod worker-0 | grep -A1 "Last State"', 'Last State: Terminated  Reason: OOMKilled  Exit Code: 137'] },
        { tab: 'Metrics', kind: 'metrics', rows: [['Memory usage', '512Mi', 'err'], ['Memory limit', '256Mi', 'warn'], ['CPU usage', '120m / 500m', 'ok'], ['Restarts (1h)', '7', 'err']] },
        { tab: 'Limits', kind: 'yaml', lines: ['resources:', '  requests:', '    memory: 128Mi', '  limits:', '    memory: 256Mi'] },
      ],
      cause: { opts: [
        { t: 'The container exceeds its memory limit and is OOMKilled', c: true },
        { t: 'The CPU limit is throttling the process to death', c: false },
        { t: 'The image is missing a shared library', c: false },
        { t: 'The node disk is full', c: false },
      ] },
      fix: { opts: [
        { t: 'Raise the memory limit to fit the workload (e.g. 768Mi)', c: true },
        { t: 'Add more CPU and keep memory at 256Mi', c: false },
        { t: 'Set restartPolicy to Never', c: false },
        { t: 'Scale the deployment down to zero', c: false },
      ] },
      hint: 'Exit code 137 + OOMKilled means it was killed for using more memory than its limit allows.',
    },
    r6: {
      mission: 'Traffic spiked, latency exploded, and the autoscaler never reacted. No alert fired. Restore observability so the HPA can do its job.',
      evidence: [
        { tab: 'HPA', kind: 'term', lines: ['$ kubectl get hpa', 'NAME      REFERENCE        TARGETS         REPLICAS', 'web-hpa   Deployment/web   <unknown>/70%   1'] },
        { tab: 'HPA events', kind: 'term', lines: ['$ kubectl describe hpa web-hpa | grep -i cpu', 'failed to get cpu utilization:', 'missing request for cpu on container web'] },
        { tab: 'Metrics API', kind: 'term', lines: ['$ kubectl top pods', 'error: Metrics API not available', '(no cpu/memory baseline to scale against)'] },
      ],
      cause: { opts: [
        { t: 'The Deployment has no CPU requests, so the HPA cannot compute utilization', c: true },
        { t: 'HPA only works with StatefulSets', c: false },
        { t: 'There are too many nodes in the cluster', c: false },
        { t: 'Autoscaling needs a LoadBalancer Service', c: false },
      ] },
      fix: { opts: [
        { t: 'Add CPU resource requests to the Deployment', c: true },
        { t: 'Switch the Service to NodePort', c: false },
        { t: 'Manually scale and delete the HPA', c: false },
        { t: 'Lower the HPA target to 10%', c: false },
      ] },
      hint: 'The HPA shows <unknown> — it needs a request baseline to turn raw usage into a percentage.',
    },
  };

  const ROLES = ['Debugger', 'Networker', 'SRE', 'Architect'];

  window.QuestData = { ROOM_THEME, CONTENT, ROLES };
})();
