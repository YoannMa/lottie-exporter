import FsP     from 'node:fs/promises';
import { EOL } from 'node:os';

import { DotLottie }                                  from '@lottiefiles/dotlottie-web';
import { createCanvas, type Canvas, type AvifConfig } from '@napi-rs/canvas';
import * as cmd                                       from 'cmd-ts';
import ora                                            from 'ora';

import { range, roundToDecimal } from './utils';

export const defaultArgs = {
    input       : cmd.option({ type : cmd.string, long : 'input', short : 'i', description : 'Input file (.lottie or .json)' }),
    width       : cmd.option({ type : cmd.optional(cmd.number), long : 'width', description : 'Width of the output, if not specified, the width of the lottie file will be used' }),
    height      : cmd.option({ type : cmd.optional(cmd.number), long : 'height', description : 'Height of the output, if not specified, the height of the lottie file will be used' }),
    background  : cmd.option({ type : cmd.optional(cmd.string), long : 'background', description : 'Background in HEX(A) (ex: #FEFEFE0F) format (default: none)' }),
    fps         : cmd.option({ type : cmd.optional(range(cmd.number, { over : 0 })), long : 'max-fps', description : 'Max FPS of the output (default: 60)' }),
    speed       : cmd.option({ type : cmd.optional(range(cmd.number, { over : 0 })), long : 'speed', description : 'Speed of the animation (default: 1)' }),
    animationId : cmd.option({ type : cmd.optional(cmd.string), long : 'animation-id', description : 'Animation ID (for lottie files with multiple animations)' }),
    themeId     : cmd.option({ type : cmd.optional(cmd.string), long : 'theme-id', description : 'Theme ID to apply' })
} as const;

export type SupportedFrameType = 'png' | 'jpeg' | 'webp' | 'avif';

interface Opts {
    background? : string;
    animationId? : string;
    themeId? : string;
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

    private constructor(lottie : DotLottie, canvas : Canvas, maxFPS : number = 60) {

        this.canvas = canvas;
        this.lottie = lottie;

        this.fps = this.animationFps;

        if (this.fps > maxFPS) {

            ora().warn([
                `Lottie file has higher framerate (${ roundToDecimal(this.fps, 2) }) than the maximum value (${ maxFPS })`,
                `  ~${ roundToDecimal((1 - maxFPS / this.fps) * 100, 2) }% of original frames will be dropped to target ${ maxFPS } FPS`,
                `  You can increase the maximum FPS with the --max-fps options`
            ].join(EOL));

            this.fps = maxFPS;
        }
    }

    static async import(file : string | ArrayBuffer | Record<string, unknown>, opt? : Opts) {

        let data = file;

        if (typeof file === 'string') {

            data = await FsP.readFile(file, 'utf-8');
        }

        const canvas = createCanvas(opt?.width ?? 320, opt?.height ?? 320);

        const lottie = new DotLottie({
            useFrameInterpolation : false,
            backgroundColor       : opt?.background,
            animationId           : opt?.animationId,
            themeId               : opt?.themeId,
            autoplay              : false,
            canvas                : canvas,
            speed                 : opt?.speed ?? 1,
            data
        });

        await new Promise((resolve) => lottie.addEventListener('load', resolve));

        const lottieFile = new LottieFile(lottie, canvas, opt?.fps);

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

        return this.lottie.duration / this.lottie.speed;
    }

    get totalFrames() {

        return this.lottie.totalFrames;
    }

    get animationFps() {

        return this.totalFrames / this.duration;
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

        if (this.animationFps > this.fps) {

            increment = this.animationFps / this.fps;
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
