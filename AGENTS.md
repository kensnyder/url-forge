# Agent Guide for url-forge

`url-forge` is a lightweight, dependency-free TypeScript library providing a single simple function for constructing URLs by merging query parameters from objects, arrays of entries, or `URLSearchParams`.

## General

- **Git:** DO NOT BRANCH OR COMMIT without user review.
- **Support:** Consult docs/web for weak knowledge; ask if tasks are ambiguous or you're stuck (large files/output).
- **Environment:** Use `./temp` for temporary files.
- **Runtime:** Use `bun`, `bunx` and `bunx --bun`. DO NOT use `node`, `npm` or `npx` without user approval.

### Repository File Structure
- `index.ts`: Main entry point exporting the `buildUrl` function.
- `/tests`: Unit tests corresponding to the library.
- `/dist`: Generated build artifacts (CommonJS, ESM, and type definitions).
- `package.json`: Scripts, devDependencies (bun:test, esbuild, TypeScript), and metadata.
- `bun.lock`, `tsconfig.json` & `tsconfig.build.json`: Environment and compiler
  configuration. `tsconfig.build.json` is used only to emit `dist/index.d.ts`.

Declarations are emitted by `tsc` itself. Do not reintroduce
`dts-bundle-generator` or a similar bundler: TypeScript 7 is the native
compiler and no longer ships the legacy JavaScript compiler API those tools are
built on, so they cannot run against the project's `typescript` dependency.

### Commands and Tools
- `bun run build`: Generates ESM, CJS, and DTS files using `bun build`.
- `bun run lint`: Checks formatting, imports and lint rules using `biome`.
- `bun run typecheck`: Type-checks the project via `tsc --noEmit`. Biome does
  not check types, so run this alongside `bun run lint` before calling work
  done.
- `bun run format`: Formats all files in the project using `biome`.
- `bun test`: Executes the complete test suite using `bun:test`.
- `bun test --watch`: Runs tests in watch mode for active development.
- `bun run coverage`: Generates reports via `bun test --coverage`.
- `bun run build:clean`: Removes the `dist/` directory to ensure a fresh build.
- `bun run build:dts`: Emits `dist/index.d.ts` via `tsc --project
  tsconfig.build.json`.

### Coding Style Rules

- **Formatting:** Single statement per line. Explicit braces for `if`/`for`/`while` on new lines. No `return` on the same line as logic.
- **Logic:** Avoid nested ternaries. Max 80 chars for ternary lines; otherwise use `if` blocks.
- **Arguments:** Functions that need 3+ input values should accept 1 argument object with named properties.
- **Functional Approach**: Export standalone pure functions instead of modifying prototypes.
- **Immutability**: Never modify input parameters; always return derived values.
- **TypeScript:** Avoid `any`/`as any`; use `unknown` or proper interfaces.
- **CLI:** If building CLI tools, use `import { parseArgs } from "node:util"`.
- **Inline Documentation:** Write clear, concise comments. Use JSDoc for public APIs.
- **Markdown:** Organize with structured headings. Avoid using bold text for section titles or list titles.
