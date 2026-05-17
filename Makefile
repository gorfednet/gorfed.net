# gorfed.net — build and deploy to SMB
# Static site: build copies files to dist/; deploy syncs dist/ to SMB.

SHELL := /bin/bash
DIST := dist

# Optional: load deploy target from .deploy-env (SMB_MOUNT=... or SMB_URL=...)
-include .deploy-env
export WEB3FORMS_ACCESS_KEY

# Files/dirs to exclude from deploy (build output)
EXCLUDE := --exclude='.git' \
	--exclude='.gitignore' \
	--exclude='.cursor' \
	--exclude='.cursorignore' \
	--exclude='.usermin' \
	--exclude='*.md' \
	--exclude='Makefile' \
	--exclude='.deploy-env' \
	--exclude='.deploy-env.example' \
	--exclude='deploy-to-smb.sh' \
	--exclude='cookies.txt' \
	--exclude='ref' \
	--exclude='node_modules' \
	--exclude='package.json' \
	--exclude='package-lock.json' \
	--exclude='build' \
	--exclude='dist*' \
	--exclude='$(DIST)'

.PHONY: build deploy clean preview test smoke

test: build
	@echo "Testing: checking required structure..."
	@for f in $(DIST)/index.html $(DIST)/about.html $(DIST)/contact.html $(DIST)/design.html $(DIST)/apps.html $(DIST)/music.html $(DIST)/press.html; do \
	  test -f "$$f" || (echo "Missing: $$f" && exit 1); \
	  grep -q 'id="main-content"' "$$f" || (echo "Missing #main-content in $$f" && exit 1); \
	done
	@test -f $(DIST)/css/global.css || (echo "Missing global.css" && exit 1)
	@test -f $(DIST)/js/main.js || (echo "Missing main.js" && exit 1)
	@test -f $(DIST)/js/pretext.bundle.js || (echo "Missing pretext.bundle.js — run npm run build:pretext" && exit 1)
	@for f in $(DIST)/about/index.html $(DIST)/contact/index.html $(DIST)/design/index.html $(DIST)/apps/index.html $(DIST)/music/index.html $(DIST)/press/index.html; do \
	  test -f "$$f" || (echo "Missing extensionless alias: $$f" && exit 1); \
	done
	@python3 build/smoke-test-routes.py --dist $(DIST)
	@python3 build/verify-shared-nav.py
	@python3 build/verify-page-standards.py --dist $(DIST)
	@grep -q 'past-shows-filter-select' $(DIST)/music.html || (echo "music.html: missing past-shows filter select" && exit 1)
	@grep -q 'past-shows-card--filtered-out' $(DIST)/css/global.css || (echo "global.css: missing past-shows filtered-out rule" && exit 1)
	@grep -q 'applyFilter' $(DIST)/js/main.js || (echo "main.js: missing applyFilter" && exit 1)
	@echo "Test passed."

build: clean
	@echo "Building deployable site into $(DIST)/..."
	@npm run build:pretext
	@mkdir -p $(DIST)
	rsync -a --no-times $(EXCLUDE) ./ $(DIST)/
	@python3 build/sync-ref.py
	@python3 build/inject-web3forms-key.py
	@python3 build/cache-bust-assets.py
	@python3 build/create-extensionless-aliases.py
	@echo "Build done. Contents: $(DIST)/"

deploy: build
	@if [ -z "$(SMB_MOUNT)" ] && [ -z "$(SMB_URL)" ]; then \
		echo "Set SMB_MOUNT (e.g. /Volumes/gorfed) or SMB_URL in .deploy-env or environment."; \
		exit 1; \
	fi
	SMB_MOUNT="$(SMB_MOUNT)" SMB_URL="$(SMB_URL)" SMB_PASSWORD="$(SMB_PASSWORD)" ./deploy-to-smb.sh

clean:
	rm -rf $(DIST)

# Serve site locally (default port 8000; use PORT=3000 make preview to override)
preview:
	@echo "Serving at http://localhost:$${PORT:-8000}/ — press Ctrl+C to stop"
	python3 -m http.server $${PORT:-8000}

# Optional live smoke test after deploy (defaults to apex domain)
smoke:
	@python3 build/smoke-test-routes.py --dist $(DIST) --base-url $${BASE_URL:-https://gorfed.net}
