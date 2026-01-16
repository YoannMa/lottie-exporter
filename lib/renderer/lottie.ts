import { DotLottie, type Config, type Data } from '@lottiefiles/dotlottie-web';

import { Renderer, type Frame, type RendererOptions } from '../struct/renderer.js';

export type LottieData = Data;

export interface LottieRendererOptions extends RendererOptions {
    background? : Config['backgroundColor'];
    animationId? : Config['animationId'];
    themeId? : Config['themeId'];
    data : LottieData;
}

export class LottieRenderer extends Renderer<LottieRendererOptions> {

    lottie : DotLottie;

    private constructor(options : LottieRendererOptions) {

        super(options);

        this.lottie = new DotLottie({
            useFrameInterpolation : false,
            backgroundColor       : options.background,
            animationId           : options.animationId,
            themeId               : options.themeId,
            data                  : options.data,
            canvas                : this.canvas,
            autoplay              : false
        });
    }

    static async import(data : LottieData, options : Omit<LottieRendererOptions, 'data'> = {}) : Promise<LottieRenderer> {

        const renderer = new LottieRenderer({ data, ...options });

        await new Promise((resolve) => renderer.lottie.addEventListener('load', resolve));

        if (!options?.width && !options?.height) {

            const { height, width } = renderer.lottie.animationSize();

            renderer.setSize(width, height);
        }

        return renderer;
    }

    get animationDuration() : number {

        return this.lottie.duration * 1_000;
    }

    get animationTotalFrames() : number {

        return this.lottie.totalFrames;
    }

    override setSize(width? : number, height? : number) {
        super.setSize(width, height);
        this.lottie.resize();
    }

    setCurrentFrame(frame : Frame) : void {

        this.lottie.setFrame(frame.animationFrame);
    }
}
