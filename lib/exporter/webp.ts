import * as FsP from 'node:fs/promises';

import * as cmd from 'cmd-ts';
import ora      from 'ora';

// @ts-expect-error
import WebP  from 'node-webpmux';
import sharp from 'sharp';

import { LottieFile, defaultArgs } from '../lottie';

interface ConvertOpt {
    repeat? : number;
    optimize? : boolean;
    quality? : number;
    alphaQuality? : number;
    lossless? : boolean;
    nearLossless? : boolean;
    smartSubsample? : boolean;
    smartDeblock? : boolean;
    preset? : 'default' | 'photo' | 'picture' | 'drawing' | 'text';
    effort? : number;
}

export const webp = async (lottie : LottieFile, output : string, opt? : ConvertOpt) => {

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
                effort         : opt.effort
            })
            .toBuffer();

        spinner.succeed('Optimized WebP');
    }

    await FsP.writeFile(output, buffer);
};

export const command = cmd.command({
    name    : 'webp',
    args    : {
        ...defaultArgs,
        output         : cmd.option({ type : cmd.string, long : 'output', short : 'o', description : 'File to output the WebP to.' }),
        repeat         : cmd.option({ type : cmd.optional(cmd.number), long : 'repeat', description : 'Number of times to repeat the animation, integer (0 = infinite) (default: 0)' }),
        optimize       : cmd.flag({ long : 'optimize', description : 'Enabled WebP optimization (slow)' }),
        quality        : cmd.option({ type : cmd.optional(cmd.number), long : 'quality', description : 'Quality, integer (1-100) (default: 80)' }),
        alphaQuality   : cmd.option({ type : cmd.optional(cmd.number), long : 'alpha-quality', description : 'quality of alpha layer, integer (0-100) (default: 100)' }),
        lossless       : cmd.flag({ long : 'lossless', description : 'Use lossless compression mode (default: false)' }),
        nearLossless   : cmd.flag({ long : 'near-lossless', description : 'Use near_lossless compression mode (default: false)' }),
        smartSubsample : cmd.flag({ long : 'smart-subsample', description : 'Use high quality chroma subsampling (default: false)' }),
        smartDeblock   : cmd.flag({ long : 'smart-deblock', description : 'Auto-adjust the deblocking filter, can improve low contrast edges (slow) (default: false)' }),
        preset         : cmd.option({ type : cmd.optional(cmd.oneOf(['default', 'photo', 'picture', 'drawing', 'text'])), long : 'preset', description : 'Named preset for preprocessing/filtering' }),
        effort         : cmd.option({ type : cmd.optional(cmd.number), long : 'effort', description : 'CPU effort, integer (0-6) (default: 6) (0 = fastest, 6 = slowest)' })
    },
    handler : async (args) => {

        const lottie = await LottieFile.fromArgs(args);

        // @ts-expect-error
        await webp(lottie, args.output, args);
    }
});
