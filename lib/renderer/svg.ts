// @ts-expect-error
import { Canvg, Parser } from 'canvg';
import { DOMParser }     from '@xmldom/xmldom';

import { Renderer, type Frame, type RendererOptions } from '../struct/renderer.js';

export interface SVGRendererOptions extends RendererOptions {
    svg : string;
}

function GCD(a : number, b : number) {

    while (b != 0) {

        const temp = b;

        b = a % b;
        a = temp;
    }

    return a;
}

function LCM(a : number, b : number) {

    return (a * b / GCD(a, b));
}

function LCMM(array : number[]) : number {

    if (array.length == 1) {

        return array[0]!;
    }

    if (array.length == 2) {

        return LCM(array[0]!, array[1]!);
    }
    else {

        return LCM(array.shift()!, LCMM(array));
    }
}

export class SVGRenderer extends Renderer<SVGRendererOptions> {

    svg : Canvg;

    #redraw : boolean = false;

    private constructor(options : SVGRendererOptions) {

        super(options);

        this.svg = Canvg.fromString(this.ctx, options.svg, {
            DOMParser,
            ignoreAnimation  : true,
            ignoreDimensions : true,
            forceRedraw : () => {

                if (this.#redraw) {

                    this.#redraw = false;

                    return true;
                }

                return false;
            }
        });

        this.setCurrentFrame({ frame : 0, time : 0, animationFrame : 0, animationTime : 0 }); // Update viewPort dimension

        this.svg.resize(this.width, this.height, 'none');

        const scaleX = this.width / this.svg.screen.viewPort.width;
        const scaleY = this.height / this.svg.screen.viewPort.height;

        this.svg.document.documentElement?.getStyle('transform-origin', true, true).setValue('0 0');
        this.svg.document.documentElement?.getStyle('transform', true, true).setValue(`scale(${scaleX}, ${scaleY})`);
    }

    static async import(data : string, options : Omit<SVGRendererOptions, 'svg'> = {}) : Promise<SVGRenderer> {

        return new SVGRenderer({ svg : data, ...options });
    }

    get animationDuration() : number {

        const unique : Set<number> = new Set();

        for (const animation of this.svg.screen.animations) {

            unique.add(animation.maxDuration);
        }

        if (unique.size == 0) {

            return 0;
        }

        return LCMM(Array.from(unique));
    }

    get animationTotalFrames() : number {

        return this.animationDuration / 1_000 * this.framerate;
    }

    setCurrentFrame(frame : Frame) : void {

        for (const animation of this.svg.screen.animations) {

            animation.duration = frame.animationTime % animation.maxDuration;
            animation.update(0);
        }

        this.#redraw = true;
        this.svg.start();
        this.svg.stop();
    }
}
