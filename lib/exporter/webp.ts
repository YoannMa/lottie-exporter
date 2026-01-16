import * as cmd from 'cmd-ts';

import type { Renderer }        from '../struct/renderer.js';
import type { ExporterOptions } from '../struct/exporter.js';

import { integer, repeat, range } from '../utils.js';

const Preset = ['default', 'photo', 'picture', 'drawing', 'text'] as const;

export interface WEBPExporterOptions extends ExporterOptions {
    output : string;
    repeat? : number;
    optimize? : boolean;
    quality? : number;
    alphaQuality? : number;
    lossless? : boolean;
    nearLossless? : boolean;
    smartSubsample? : boolean;
    smartDeblock? : boolean;
    preset? : typeof Preset[number];
    effort? : number;
}

export const WEBPExporter = {

    async export(renderer : Renderer, opt : WEBPExporterOptions) {

        // @ts-expect-error
        const WebP = await import('node-webpmux');

        await WebP.Image.initLib();

        const frames = [];

        for (const { data } of renderer.frames('webp', { quality : 100 })) {

            frames.push(await WebP.Image.generateFrame({ buffer : data, dispose : true }));
        }

        let buffer = await WebP.Image.save(null, {
            width  : renderer.width,
            height : renderer.height,
            delay  : renderer.renderFrameDelay,
            loops  : opt?.repeat ?? 0,
            frames
        });

        if (opt?.optimize) {

            const original = buffer.length;

            opt.hooks?.beforeOptimize?.({ size : original });

            const { default : sharp } = await import('sharp');

            buffer = await sharp(buffer, { animated : true })
                .webp({
                    quality        : opt.quality,
                    alphaQuality   : opt.alphaQuality,
                    lossless       : opt.lossless,
                    nearLossless   : opt.nearLossless,
                    smartSubsample : opt.smartSubsample,
                    smartDeblock   : opt.smartDeblock,
                    preset         : opt.preset,
                    effort         : opt.effort ?? 6
                })
                .toBuffer();

            opt.hooks?.afterOptimize?.({ size : buffer.length, original });
        }

        await Bun.write(opt.output, buffer);
    }
};

export const webpExporterCliArgs = {
    repeat,
    optimize       : cmd.flag({ long : 'optimize', description : 'Enabled WebP optimization (slow)' }),
    lossless       : cmd.flag({ long : 'lossless', description : 'Use lossless compression mode (default: false)' }),
    nearLossless   : cmd.flag({ long : 'near-lossless', description : 'Use near_lossless compression mode (default: false)' }),
    smartSubsample : cmd.flag({ long : 'smart-subsample', description : 'Use high quality chroma subsampling (default: false)' }),
    smartDeblock   : cmd.flag({ long : 'smart-deblock', description : 'Auto-adjust the deblocking filter, can improve low contrast edges (slow) (default: false)' }),
    quality        : cmd.option({
        long        : 'quality',
        description : 'Quality, integer (1-100) (default: 80)',
        type        : cmd.optional(range(integer, { min : 1, max : 100 }))
    }),
    alphaQuality   : cmd.option({
        long        : 'alpha-quality',
        description : 'quality of alpha layer, integer (0-100) (default: 100)',
        type        : cmd.optional(range(integer, { min : 0, max : 100 }))
    }),
    preset         : cmd.option({
        long        : 'preset',
        description : `Named preset for preprocessing/filtering (default: default) (one of: ${ Preset.join(', ') })`,
        type        : cmd.optional(cmd.oneOf(Preset))
    }),
    effort         : cmd.option({
        long        : 'effort',
        description : 'CPU effort, integer (0-6) (default: 6) (0 = fastest, 6 = slowest)',
        type        : cmd.optional(range(integer, { min : 0, max : 6 }))
    })
} as const;
