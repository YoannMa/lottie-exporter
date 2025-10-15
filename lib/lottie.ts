import FsP from 'node:fs/promises';

import { DotLottie }                                  from '@lottiefiles/dotlottie-web';
import { createCanvas, type Canvas, type AvifConfig } from '@napi-rs/canvas';
import * as cmd                                       from 'cmd-ts';
import ora                                            from 'ora';

export const defaultArgs = {
    input  : cmd.option({ type : cmd.string, long : 'input', short : 'i', description : 'Input file (.lottie or .json)' }),
    width  : cmd.option({ type : cmd.optional(cmd.number), long : 'width', description : 'Width of the output, if not specified, the width of the lottie file will be used' }),
    height : cmd.option({ type : cmd.optional(cmd.number), long : 'height', description : 'Height of the output, if not specified, the height of the lottie file will be used' }),
    fps    : cmd.option({ type : cmd.optional(cmd.number), long : 'max-fps', description : 'Max FPS of the output, integer (default: 60)' })
    // speed  : cmd.option({ type : cmd.optional(cmd.number), long : 'speed', description : 'Speed of the animation (default: 1)' })
} as const;

export type SupportedFrameType = 'png' | 'jpeg' | 'webp' | 'avif';

interface Opts {
    width? : number;
    height? : number;
    speed? : number;
    fps? : number;
}

interface Args extends Opts {
    input : string;
}

export class LottieFile {

    canvas : Canvas;
    lottie : DotLottie;
    fps : number;

    private constructor(lottie : DotLottie, canvas : Canvas, fps : number) {

        this.canvas = canvas;
        this.lottie = lottie;
        this.fps    = fps;
    }

    static async import(file : string | ArrayBuffer | Record<string, unknown>, opt? : Opts) {

        let data = file;

        if (typeof file === 'string') {

            data = await FsP.readFile(file, 'utf-8');
        }

        const canvas = createCanvas(opt?.width ?? 320, opt?.height ?? 320);

        const lottie = new DotLottie({
            useFrameInterpolation : false,
            autoplay              : false,
            canvas                : canvas,
            speed                 : opt?.speed ?? 1,
            data
        });

        await new Promise((resolve) => lottie.addEventListener('load', resolve));

        let fps = lottie.totalFrames / lottie.duration;

        if (fps > (opt?.fps ?? 60)) {

            ora()
                .warn(`Lottie file has higher framerate (${ fps }) than the maximum value allowed (${ opt?.fps ?? 60 }), some frames will be dropped, you can increase the maximum FPS with the --max-fps options`);
            fps = opt?.fps ?? 60;
        }

        const lottieFile = new LottieFile(lottie, canvas, fps);

        if (!opt?.width && !opt?.height) {

            const { height, width } = lottie.animationSize();

            lottieFile.setSize(width, height);
        }

        return lottieFile;
    }

    static async fromArgs(args : Args) {

        const { input, ...opt } = args;

        return LottieFile.import(args.input, opt);
    }

    get duration() {

        return this.lottie.duration;
    }

    get totalFrames() {

        return this.lottie.totalFrames;
    }

    get width() {

        return this.canvas.width;
    }

    get height() {

        return this.canvas.height;
    }

    setSize(width? : number, height? : number) {

        if (width !== undefined) {
            this.canvas.width = width;
        }

        if (height !== undefined) {
            this.canvas.height = height;
        }

        this.lottie.resize();
    }

    private buildDataAccessor(type : SupportedFrameType | 'raw', opt? : { quality? : number, cfg? : AvifConfig }) {

        switch (type) {

            case 'raw': {

                const ctx = this.canvas.getContext('2d');

                return () => ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
            }

            case 'png': {

                return () => this.canvas.toBuffer(`image/png`);
            }

            case 'jpeg': {

                return () => this.canvas.toBuffer(`image/jpeg`, opt?.quality);
            }

            case 'webp': {

                return () => this.canvas.toBuffer(`image/webp`, opt?.quality);
            }

            case 'avif': {

                return () => this.canvas.toBuffer(`image/avif`, opt?.cfg);
            }
        }
    }

    frames(type : 'raw') : Generator<Uint8ClampedArray<ArrayBufferLike>, void, unknown>;
    frames(type : 'png') : Generator<Buffer, void, unknown>;
    frames(type : 'jpeg', opt? : { quality? : number }) : Generator<Buffer, void, unknown>;
    frames(type : 'webp', opt? : { quality? : number }) : Generator<Buffer, void, unknown>;
    frames(type : 'avif', opt? : { cfg? : AvifConfig }) : Generator<Buffer, void, unknown>;
    * frames(type : SupportedFrameType | 'raw', opt? : { quality? : number, cfg? : AvifConfig }) {

        let increment = 1;

        const fileFPS = this.totalFrames / this.duration;

        if (fileFPS > this.fps) {

            increment = fileFPS / this.fps;
        }

        const spinner = ora('Processing frames...').start();

        const dataAccessor = this.buildDataAccessor(type, opt);

        let relFrameIdx : number;
        let nbrFrames : number;

        for (relFrameIdx = 0, nbrFrames = 0; relFrameIdx < this.totalFrames; relFrameIdx += increment, ++nbrFrames) {

            const frame = Math.min(Math.round(relFrameIdx), this.totalFrames);

            this.lottie.setFrame(frame);

            spinner.text = `Processing frames: ${ frame }/${ this.totalFrames }`;
            spinner.render();

            yield dataAccessor();
        }

        spinner.succeed(`${ nbrFrames } Frames generated`);
    }
}
