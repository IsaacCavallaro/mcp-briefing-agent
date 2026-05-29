.PHONY: ci check build test eval eval-report serve docker-up docker-down smoke

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
