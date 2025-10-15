# Lottie Converter

Convert Lottie animations (.lottie or .json) to animated WebP, GIF, APNG, or a sequence of images

This repository exposes a CLI with multiple subcommands:
- webp: export an animated WebP (optionally optimized)
- gif: export an animated GIF (optionally optimized)
- apng: export an animated APNG (optionally optimized)
- seq: export a sequence of images (png/jpeg/webp/avif)

Only Bun is supported as the runtime because NodeJS doesn't support fetching files from the file system.

## Stack
- Language: TypeScript
- Runtime/Package manager: Bun
- Rendering: `@napi-rs/canvas`, `@lottiefiles/dotlottie-web`
- Image utils: `sharp`, `node-webpmux`, `apng-optimizer`, `gifenc`


## Requirements
- Bun installed (https://bun.sh)
- OS: Windows, macOS, or Linux
  - Native deps: sharp and @napi-rs/canvas require native binaries. The prebuilt binaries are usually installed automatically, but you may need build tools on some platforms.


## Setup
- Install dependencies with Bun:
  - `bun install`

No further build step is required to run the CLI during development; Bun runs TypeScript directly.


## Usage (with Bun)
All commands accept common options: --input/-i (path to .lottie or .json), --max-fps, and optional --width/--height to resize the output canvas.

General form:
- `bun run lib/cli.ts <subcommand> [options]`

## Features

### Export animated WebP
- `bun run lib/cli.ts webp --help`

### Export animated GIF
- `bun run lib/cli.ts gif --help`

### Export animated APNG
- `bun run lib/cli.ts apng --help`

### Export a sequence of images
- `bun run lib/cli.ts seq --help`

## Tests
- No runtime tests are present.
- Type checks can be run with: `bun run test`

## License
This project is licensed under the ISC License. See LICENSE for details.
