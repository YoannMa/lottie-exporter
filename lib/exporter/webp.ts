import * as FsP from 'node:fs/promises';

import * as cmd from 'cmd-ts';
import ora      from 'ora';

// @ts-expect-error
import WebP  from 'node-webpmux';
import sharp from 'sharp';

import { LottieFile, defaultArgs }            from '../lottie.js';
import { outputFile, integer, repeat, range } from '../utils.js';

const Preset = ['default', 'photo', 'picture', 'drawing', 'text'] as const;

interface ExportOpt {
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

export const webp = async (lottie : LottieFile, output : string, opt? : ExportOpt) => {

    await WebP.Image.initLib();

    const frames = [];

    for (const frame of lottie.frames('webp')) {

        frames.push(await WebP.Image.generateFrame({ buffer : frame, dispose : true }));
    }

    let buffer = await WebP.Image.save(null, {
        width  : lottie.width,
        height : lottie.height,
        loops  : opt?.repeat ?? 0,
        delay  : 1 / lottie.fps * 1_000,
        frames
    });

    if (opt?.optimize) {

        const spinner = ora('Optimizing WebP...').start();

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

        spinner.succeed('Optimized WebP');
    }

    await FsP.writeFile(output, buffer);
};

export const command = cmd.command({
    name    : 'webp',
    args    : {
        ...defaultArgs, repeat,
        output         : cmd.option({ type : outputFile, long : 'output', short : 'o', description : 'File to output the WebP to' }),
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
    },
    handler : async (args) => {

        const lottie = await LottieFile.fromArgs(args);

        await webp(lottie, args.output, args);
    }
});
