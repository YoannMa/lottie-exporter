import { type AvifConfig, type Canvas, createCanvas } from '@napi-rs/canvas';
import * as cmd                                       from 'cmd-ts';
import { range }                                      from '../utils.js';

const NO_OP = () => () => {};

export type SupportedFrameType = 'png' | 'jpeg' | 'webp' | 'avif';

export type RendererBeforeRenderHook = (metadata : { totalFrames : number }) => void;
export type RendererAfterRenderHook = (metadata : { totalFrames : number }) => void;
export type RendererOnFrameHook = (metadata : { totalFrames : number, frame : number }) => void;

export const rendererArgs = {
    width       : cmd.option({ type : cmd.optional(cmd.number), long : 'width', description : 'Width of the output, if not specified, the width of the lottie file will be used' }),
    height      : cmd.option({ type : cmd.optional(cmd.number), long : 'height', description : 'Height of the output, if not specified, the height of the lottie file will be used' }),
    background  : cmd.option({ type : cmd.optional(cmd.string), long : 'background', description : 'Background in HEX(A) (ex: #FEFEFE0F) format (default: none)' }),
    framerate   : cmd.option({ type : cmd.optional(range(cmd.number, { over : 0 })), long : 'max-fps', description : 'Max FPS of the output (default: 60)' }),
    speed       : cmd.option({ type : cmd.optional(range(cmd.number, { over : 0 })), long : 'speed', description : 'Speed of the animation (default: 1)' }),
    animationId : cmd.option({ type : cmd.optional(cmd.string), long : 'animation-id', description : 'Animation ID (for lottie files with multiple animations)' }),
    themeId     : cmd.option({ type : cmd.optional(cmd.string), long : 'theme-id', description : 'Theme ID to apply (for lottie files with multiple themes)' }),
} as const;

export interface RendererHooks {
    beforeRender : RendererBeforeRenderHook;
    afterRender : RendererAfterRenderHook;
    onFrame : RendererOnFrameHook;
}

export interface RendererOptions {
    width? : number;
    height? : number;
    framerate? : number;
    speed? : number;
    hooks? : Partial<RendererHooks>;
}

export interface Frame {
    time : number;
    frame : number;
    animationTime : number;
    animationFrame : number;
}

export abstract class Renderer<Options extends RendererOptions = RendererOptions> {

    canvas : Canvas;
    framerate : number;
    hooks : RendererHooks;
    speed : number;

    protected constructor({ width = 320, height = 320, speed = 1, framerate = 60, hooks = {} } : Options) {

        this.canvas    = createCanvas(width, height);
        this.speed     = speed;
        this.framerate = framerate;

        this.hooks = {
            beforeRender : hooks.beforeRender ?? NO_OP(),
            afterRender  : hooks.afterRender ?? NO_OP(),
            onFrame      : hooks.onFrame ?? NO_OP()
        };
    }

    get width() {

        return this.canvas.width;
    }

    get height() {

        return this.canvas.height;
    }

    get ctx() {

        return this.canvas.getContext('2d');
    }

    setSize(width? : number, height? : number) {

        if (width !== undefined) {
            this.canvas.width = width;
        }

        if (height !== undefined) {
            this.canvas.height = height;
        }
    }

    setFramerate(framerate : number) {

        this.framerate = framerate;
    }

    /**
     * Get the animation duration (in milliseconds)
     * @example 1500
     * @returns {number}
     */
    abstract get animationDuration() : number;

    /**
     * Get the animation total frames
     * @example 100
     * @returns {number}
     */
    abstract get animationTotalFrames() : number;

    /**
     * Get the animation FPS (frames per second)
     * @example 60
     * @returns {number}
     */
    get animationFramerate() : number {

        return this.animationTotalFrames / this.animationDuration;
    };

    /**
     * Get the animation frame delay (in milliseconds)
     * @example 16.666666666
     * @returns {number}
     */
    get animationFrameDelay() : number {

        return 1 / this.animationFramerate;
    }

    /**
     * Get the render duration (in milliseconds) based on the animation duration and the speed ratio
     * @example 1000
     * @returns {number}
     */
    get renderDuration() : number {

        return this.animationDuration / this.speed;
    }

    /**
     * Get the render frame delay (in milliseconds) based on the given framerate
     * @example 16.666666666
     * @returns {number}
     */
    get renderFrameDelay() : number {

        return ((1 / this.framerate) * 1_000);
    }

    /**
     * Get the total number of frames to render based on the animation duration and the relative frame delay
     * @example 100
     * @returns {number}
     */
    get renderTotalFrames() : number {

        return Math.ceil(this.renderDuration / this.renderFrameDelay);
    }

    private buildDataAccessor(type : SupportedFrameType | 'raw', opt? : { quality? : number, cfg? : AvifConfig }) {

        switch (type) {

            case 'raw': {

                return () => this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
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

    /**
     * Set the current frame of the animation
     * @param {Frame} frame
     */
    abstract setCurrentFrame(frame : Frame) : void;

    frames(type : 'raw') : Generator<{ frame : number, data : Uint8ClampedArray<ArrayBufferLike> }, void, unknown>;
    frames(type : 'png') : Generator<{ frame : number, data : Buffer }, void, unknown>;
    frames(type : 'jpeg', opt? : { quality? : number }) : Generator<{ frame : number, data : Buffer }, void, unknown>;
    frames(type : 'webp', opt? : { quality? : number }) : Generator<{ frame : number, data : Buffer }, void, unknown>;
    frames(type : 'avif', opt? : { cfg? : AvifConfig }) : Generator<{ frame : number, data : Buffer }, void, unknown>;
    * frames(type : SupportedFrameType | 'raw', opt? : { quality? : number, cfg? : AvifConfig }) {

        const dataAccessor = this.buildDataAccessor(type, opt);

        const delay       = this.renderFrameDelay;
        const totalFrames = this.renderTotalFrames;

        this.hooks.beforeRender({ totalFrames });

        let frame : number;
        let time : number;

        for (frame = 0, time = 0; frame < totalFrames; ++frame, time += delay) {

            this.setCurrentFrame({
                animationFrame : Math.round(time * this.speed / this.animationFrameDelay),
                animationTime : time * this.speed,
                frame,
                time
            });

            this.hooks.onFrame({ totalFrames, frame });

            yield { frame, data : dataAccessor() };
        }

        this.hooks.afterRender({ totalFrames });
    }
}

export type RendererOptionsType<TR> = TR extends Renderer<infer TO> ? TO : never;

export interface RendererImporter<R extends Renderer, Type> {
    import(data : Type, options? : RendererOptionsType<R>) : Promise<R>;
}
