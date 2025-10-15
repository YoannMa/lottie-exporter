import * as FsP  from 'node:fs/promises';
import * as Path from 'node:path';

import * as cmd from 'cmd-ts';
import db       from 'mime-db';

import { defaultArgs, LottieFile } from '../lottie';

export type ImageType = 'png' | 'jpeg' | 'webp' | 'avif';

export const seq = async (lottie : LottieFile, outputPath : string, type : ImageType) => {

    const ext = db[`image/${ type }`]?.extensions?.[0] ?? type;

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
        output : cmd.option({ type : cmd.string, long : 'output', short : 'o', description : 'Folder to output the sequence of images to.' }),
        type   : cmd.option({ type : cmd.oneOf(['png', 'jpeg', 'webp', 'avif']), long : 'type', short : 't', defaultValue : () => 'png', description : 'Image type' })
    },
    handler : async (args) => {

        const lottie = await LottieFile.fromArgs(args);

        await seq(lottie, args.output, args.type as ImageType);
    }
});
