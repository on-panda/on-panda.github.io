NODE ?= node
NPM ?= npm

.PHONY: all build check test

all: build

node_modules/.installed: package.json package-lock.json
	$(NPM) ci --ignore-scripts --no-audit --no-fund --cache .cache/npm
	@touch $@

build: node_modules/.installed
	$(NODE) scripts/build.mjs

# Verify generated files without rewriting them; suitable for CI.
check: test
	$(NODE) scripts/build.mjs --check

test: node_modules/.installed
	$(NODE) --test scripts/*.test.mjs
