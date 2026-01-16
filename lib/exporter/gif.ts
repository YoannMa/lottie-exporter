import * as cmd from 'cmd-ts';

import type { Renderer }        from '../struct/renderer.js';
import type { ExporterOptions } from '../struct/exporter.js';

import { integer, range, repeat } from '../utils.js';

export interface GIFExporterOptions extends ExporterOptions {
    output : string;
    repeat? : number;
    quality? : number;
    optimize? : boolean;
    colors? : number;
    effort? : number;
    dither? : number;
}

export const GIFExporter = {

    async export(renderer : Renderer, opt : GIFExporterOptions) {

        // @ts-expect-error
        const { GIFEncoder, quantize, applyPalette } = await import('gifenc');

        const builder = new GIFEncoder();

        for (const { data } of renderer.frames('raw')) {

            const palette = quantize(data, opt?.colors ?? 256);
            const index   = applyPalette(data, palette);

            builder.writeFrame(index, renderer.width, renderer.height, {
                delay  : renderer.renderFrameDelay,
                repeat : opt?.repeat ?? 0,
                palette
            });
        }

        builder.finish();

        let buffer = Buffer.from(builder.buffer);

        if (opt?.optimize) {

            const original = buffer.length;

            opt.hooks?.beforeOptimize?.({ size : original });

            const { default : sharp } = await import('sharp');

            buffer = await sharp(buffer, { animated : true })
                .gif({
                    colors : opt?.colors ?? 256,
                    effort : opt?.effort,
                    dither : opt?.dither
                })
                .toBuffer();

            opt.hooks?.afterOptimize?.({ size : buffer.length, original });
        }

        await Bun.write(opt.output, buffer);
    }
};

export const gifExporterCliArgs = {
    repeat,
    optimize : cmd.flag({ long : 'optimize', description : 'Enabled GIF optimization (slow)' }),
    colors   : cmd.option({
        long        : 'colors',
        description : 'Maximum number of palette entries, including transparency, integer (2-256) (default: 256)',
        type        : cmd.optional(range(integer, { min : 2, max : 256 }))
    }),
    effort   : cmd.option({
        long        : 'effort',
        description : 'CPU effort, integer (0-10) (default: 7) (0 = fastest, 10 = slowest)',
        type        : cmd.optional(range(integer, { min : 0, max : 10 }))
    }),
    dither   : cmd.option({
        long        : 'dither',
        description : 'Level of Floyd-Steinberg error diffusion, float (0~1) (default: 1.0)',
        type        : cmd.optional(range(cmd.number, { min : 0, max : 1 }))
    })
} as const;
