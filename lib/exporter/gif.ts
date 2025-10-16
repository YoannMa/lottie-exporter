import * as FsP from 'node:fs/promises';

import * as cmd from 'cmd-ts';
import ora      from 'ora';

// @ts-expect-error
import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import sharp                                  from 'sharp';

import { defaultArgs, LottieFile }            from '../lottie';
import { outputFile, integer, range, repeat } from '../utils';

interface ConvertOpt {
    repeat? : number;
    quality? : number;
    optimize? : boolean;
    colors? : number;
    effort? : number;
    dither? : number;
}

export const gif = async (lottie : LottieFile, output : string, opt? : ConvertOpt) => {

    const builder = new GIFEncoder();

    for (const frame of lottie.frames('raw')) {

        const palette = quantize(frame, opt?.colors ?? 256);
        const index   = applyPalette(frame, palette);

        builder.writeFrame(index, lottie.width, lottie.height, {
            delay  : Math.round(1 / lottie.fps * 1_000),
            repeat : opt?.repeat ?? 0,
            palette
        });
    }

    builder.finish();

    let buffer = Buffer.from(builder.buffer);

    if (opt?.optimize) {

        const spinner = ora('Optimizing GIF...').start();

        buffer = await sharp(buffer, { animated : true })
            .gif({
                colors : opt?.colors ?? 256,
                effort : opt?.effort,
                dither : opt?.dither
            })
            .toBuffer();

        spinner.succeed('Optimized GIF');
    }

    await FsP.writeFile(output, buffer);
};

export const command = cmd.command({
    name    : 'gif',
    args    : {
        ...defaultArgs, repeat,
        output   : cmd.option({ type : outputFile, long : 'output', short : 'o', description : 'File to output the GIF to' }),
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
    },
    handler : async (args) => {

        const lottie = await LottieFile.fromArgs(args);

        await gif(lottie, args.output, args);
    }
});
