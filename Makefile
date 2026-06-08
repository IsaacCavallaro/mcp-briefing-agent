TF_BIN := $(shell command -v tofu 2>/dev/null || command -v terraform 2>/dev/null || true)
K8S_RENDERED := /tmp/mcp-briefing-agent-k8s.yaml

.PHONY: ci check build test eval eval-report serve docker-up docker-down smoke platform-validate k8s-render k8s-validate k8s-dry-run-local k8s-build-image k8s-apply-local k8s-delete-local k8s-port-forward k8s-smoke k8s-logs k8s-rollback tf-fmt tf-check tf-validate

ci:
	npm run ci

check:
	npm run check

build:
	npm run build

test:
	npm run test

eval:
	npm run eval

eval-report:
	npm run eval:report

serve:
	npm run serve

docker-up:
	docker compose up --build

docker-down:
	docker compose down

smoke:
	curl --fail --silent http://127.0.0.1:8787/health
	curl --fail --silent http://127.0.0.1:8787/ready

platform-validate: k8s-validate tf-check tf-validate

k8s-render:
	kubectl kustomize platform/k8s/local

k8s-validate:
	kubectl kustomize platform/k8s/local > $(K8S_RENDERED)
	test -s $(K8S_RENDERED)
	grep -q "kind: Deployment" $(K8S_RENDERED)
	grep -q "kind: Service" $(K8S_RENDERED)
	grep -q "kind: ConfigMap" $(K8S_RENDERED)

k8s-dry-run-local:
	kubectl apply --dry-run=server -k platform/k8s/local

k8s-build-image:
	docker build -t mcp-briefing-agent:local .

k8s-apply-local: k8s-build-image
	kubectl apply -k platform/k8s/local
	kubectl -n mcp-briefing-agent rollout status deployment/mcp-briefing-agent --timeout=90s

k8s-delete-local:
	kubectl delete -k platform/k8s/local --ignore-not-found

k8s-port-forward:
	kubectl -n mcp-briefing-agent port-forward service/mcp-briefing-agent 8787:8787

k8s-smoke:
	curl --fail --silent http://127.0.0.1:8787/health
	curl --fail --silent http://127.0.0.1:8787/ready
	curl --fail --silent http://127.0.0.1:8787/metrics

k8s-logs:
	kubectl -n mcp-briefing-agent logs deployment/mcp-briefing-agent

k8s-rollback:
	kubectl -n mcp-briefing-agent rollout undo deployment/mcp-briefing-agent
	kubectl -n mcp-briefing-agent rollout status deployment/mcp-briefing-agent --timeout=90s

tf-fmt:
	@if [ -z "$(TF_BIN)" ]; then \
		echo "Skipping Terraform/OpenTofu format: install tofu or terraform."; \
	else \
		$(TF_BIN) fmt -recursive platform/terraform; \
	fi

tf-check:
	@if [ -z "$(TF_BIN)" ]; then \
		echo "Skipping Terraform/OpenTofu format check: install tofu or terraform."; \
	else \
		$(TF_BIN) fmt -check -recursive platform/terraform; \
	fi

tf-validate:
	@if [ -z "$(TF_BIN)" ]; then \
		echo "Skipping Terraform/OpenTofu validation: install tofu or terraform."; \
	else \
		for dir in platform/terraform/local platform/terraform/aws-reference; do \
			echo "Validating $$dir with $(TF_BIN)"; \
			$(TF_BIN) -chdir=$$dir init -backend=false; \
			$(TF_BIN) -chdir=$$dir validate; \
		done; \
	fi
