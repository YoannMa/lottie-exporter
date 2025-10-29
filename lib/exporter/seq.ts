import * as FsP  from 'node:fs/promises';
import * as Path from 'node:path';

import * as cmd from 'cmd-ts';

import { defaultArgs, LottieFile } from '../lottie';
import { outputFile }              from '../utils';

const ImageType = ['png', 'jpeg', 'webp', 'avif'] as const;

const Extensions = {
    png   : 'png',
    jpeg  : 'jpg',
    webp  : 'webp',
    avif  : 'avif',
};

export const seq = async (lottie : LottieFile, outputPath : string, type : typeof ImageType[number] = 'png') => {

    const ext = Extensions[type];

    await FsP.mkdir(outputPath, { recursive : true });

    let i = 0;

    const length = lottie.totalFrames.toString().length;

    // @ts-expect-error
    for (const frame of lottie.frames(type)) {

        await FsP.writeFile(Path.join(outputPath, `frame-${ String(i++).padStart(length, '0') }.${ ext }`), Buffer.from(frame));
    }
};

export const command = cmd.command({
    name    : 'seq',
    args    : {
        ...defaultArgs,
        output : cmd.option({ type : outputFile, long : 'output', short : 'o', description : 'Folder to output the sequence of images to' }),
        type   : cmd.option({
            long        : 'type',
            description : `Image type (default: png) (one of: ${ ImageType.join(', ') })`,
            type        : cmd.optional(cmd.oneOf(ImageType))
        })
    },
    handler : async (args) => {

        const lottie = await LottieFile.fromArgs(args);

        await seq(lottie, args.output, args.type);
    }
});
