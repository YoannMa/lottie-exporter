# Lottie Exporter

Convert Lottie animations (.lottie or .json) to animated WebP, GIF, APNG, or a sequence of images

Only `Bun` is supported as the runtime because `Node.js` doesn't support fetching files from the file system directly (see [this issue](https://github.com/WinterTC55/fetch-workstream/issues/12) for more details) 
and some dependencies require this feature.

If the lottie animation has a number of frames per seconds higher than `--max-fps` (default 60 fps), the rendering will be dropping frames to match the specified FPS.
Reducing the output FPS will reduce the file size without making the animation slower, if you want to change the animation speed, you should use the `--speed` option.

## Stack
- Rendering: Using `@lottiefiles/dotlottie-web` to render on `@napi-rs/canvas` canvas
- Image tools: `sharp`, `node-webpmux`, `apng-optimizer`, `gifenc`

## Requirements
- Bun installed (https://bun.sh)
- Native dependencies: `sharp` and `@napi-rs/canvas` require native binaries. The prebuilt binaries are usually installed automatically, but you may need build tools on some platforms.

## Usage (with Bun)

General form:
- `bunx lottie-exporter <subcommand> [options]`

## Commands

### Export animated WebP

`bunx lottie-exporter webp --help`

```
OPTIONS:
  --input, -i <str>        - Input file (.lottie or .json)
  --width <number>         - Width of the output, if not specified, the width of the lottie file will be used [optional]
  --height <number>        - Height of the output, if not specified, the height of the lottie file will be used [optional]
  --background <str>       - Background in HEX(A) (ex: #FEFEFE0F) format (default: none) [optional]
  --max-fps <number>       - Max FPS of the output (default: 60) [optional]
  --speed <number>         - Speed of the animation (default: 1) [optional]
  --animation-id <str>     - Animation ID (for lottie files with multiple animations) [optional]
  --theme-id <str>         - Theme ID to apply [optional]
  --repeat <number>        - Number of times to repeat the animation, integer (0 = infinite) (default: 0) [optional]
  --output, -o <str>       - File to output the WebP to
  --quality <number>       - Quality, integer (1-100) (default: 80) [optional]
  --alpha-quality <number> - quality of alpha layer, integer (0-100) (default: 100) [optional]
  --preset <value>         - Named preset for preprocessing/filtering (default: default) (one of: default, photo, picture, drawing, text) [optional]
  --effort <number>        - CPU effort, integer (0-6) (default: 6) (0 = fastest, 6 = slowest) [optional]

FLAGS:
  --optimize        - Enabled WebP optimization (slow) [optional]
  --lossless        - Use lossless compression mode (default: false) [optional]
  --near-lossless   - Use near_lossless compression mode (default: false) [optional]
  --smart-subsample - Use high quality chroma subsampling (default: false) [optional]
  --smart-deblock   - Auto-adjust the deblocking filter, can improve low contrast edges (slow) (default: false) [optional]
  --help, -h        - show help [optional]
```

### Export animated GIF

`bunx lottie-exporter gif --help`

```
OPTIONS:
  --input, -i <str>    - Input file (.lottie or .json)
  --width <number>     - Width of the output, if not specified, the width of the lottie file will be used [optional]
  --height <number>    - Height of the output, if not specified, the height of the lottie file will be used [optional]
  --background <str>   - Background in HEX(A) (ex: #FEFEFE0F) format (default: none) [optional]
  --max-fps <number>   - Max FPS of the output (default: 60) [optional]
  --speed <number>     - Speed of the animation (default: 1) [optional]
  --animation-id <str> - Animation ID (for lottie files with multiple animations) [optional]
  --theme-id <str>     - Theme ID to apply [optional]
  --repeat <number>    - Number of times to repeat the animation, integer (0 = infinite) (default: 0) [optional]
  --output, -o <str>   - File to output the GIF to
  --colors <number>    - Maximum number of palette entries, including transparency, integer (2-256) (default: 256) [optional]
  --effort <number>    - CPU effort, integer (0-10) (default: 7) (0 = fastest, 10 = slowest) [optional]
  --dither <number>    - Level of Floyd-Steinberg error diffusion, float (0~1) (default: 1.0) [optional]

FLAGS:
  --optimize - Enabled GIF optimization (slow) [optional]
  --help, -h - show help [optional]
```

### Export animated APNG

`bunx lottie-exporter apng --help`

```
OPTIONS:
  --input, -i <str>        - Input file (.lottie or .json)
  --width <number>         - Width of the output, if not specified, the width of the lottie file will be used [optional]
  --height <number>        - Height of the output, if not specified, the height of the lottie file will be used [optional]
  --background <str>       - Background in HEX(A) (ex: #FEFEFE0F) format (default: none) [optional]
  --max-fps <number>       - Max FPS of the output (default: 60) [optional]
  --speed <number>         - Speed of the animation (default: 1) [optional]
  --animation-id <str>     - Animation ID (for lottie files with multiple animations) [optional]
  --theme-id <str>         - Theme ID to apply [optional]
  --repeat <number>        - Number of times to repeat the animation, integer (0 = infinite) (default: 0) [optional]
  --output, -o <str>       - File to output the APNG to
  --iter <number>          - Number of compression iterations, integer (default: 15) [optional]
  --min-quality <number>   - Minimum quality for optimization, integer (0-100) (default: 0) [optional]
  --max-quality <number>   - Maximum quality for optimization, integer (0-100) (default: 100) [optional]
  --deflate-method <value> - Deflate method to use (default: 7zip) (one of: zlib, 7zip, zopfli) [optional]

FLAGS:
  --optimize       - Optimize the output APNG (slow) (default: false) [optional]
  --disabled-quant - Disable quantization (default: false) [optional]
  --help, -h       - show help [optional]
```

### Export a sequence of images

`bunx lottie-exporter seq --help`

```
OPTIONS:
  --input, -i <str>    - Input file (.lottie or .json)
  --width <number>     - Width of the output, if not specified, the width of the lottie file will be used [optional]
  --height <number>    - Height of the output, if not specified, the height of the lottie file will be used [optional]
  --background <str>   - Background in HEX(A) (ex: #FEFEFE0F) format (default: none) [optional]
  --max-fps <number>   - Max FPS of the output (default: 60) [optional]
  --speed <number>     - Speed of the animation (default: 1) [optional]
  --animation-id <str> - Animation ID (for lottie files with multiple animations) [optional]
  --theme-id <str>     - Theme ID to apply [optional]
  --output, -o <str>   - Folder to output the sequence of images to
  --type <value>       - Image type (default: png) (one of: png, jpeg, webp, avif) [optional]

FLAGS:
  --help, -h - show help [optional]
```


## Setup locally
- Clone the repository
- Install dependencies with Bun:
  - `bun install`
- Run the CLI:
  - `bun run lib/cli.ts --help`

## Tests
- No runtime tests are present.
- Type checks can be run with: `bun run test`

## License
This project is licensed under the ISC License. See LICENSE for details.
