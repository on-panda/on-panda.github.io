NODE ?= node

.PHONY: all build check test

all: build

build:
	$(NODE) scripts/build.mjs

# Verify generated files without rewriting them; suitable for CI.
check: test
	$(NODE) scripts/build.mjs --check

test:
	$(NODE) --test scripts/*.test.mjs
