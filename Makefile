# Builds the package using esbuild
build: clean
	pnpm exec tsup

# Clean the dist directory
clean:
	pnpm exec shx rm -rf dist

# Release the package to npm
release: build
	pnpm typecheck
	pnpm xo
	pnpm test
	pnpm release-it