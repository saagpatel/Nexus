.PHONY: install build lint test dev clean

install:
	pnpm install

build:
	pnpm run build

lint:
	@echo "No lint script configured"

test:
	pnpm test

dev:
	pnpm run start

clean:
	rm -rf .vite dist coverage node_modules
