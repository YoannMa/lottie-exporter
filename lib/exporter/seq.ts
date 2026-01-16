import { mkdir } from 'node:fs/promises';
import { join }  from 'node:path';

import * as cmd from 'cmd-ts';

import type { Renderer }        from '../struct/renderer.js';
import type { ExporterOptions } from '../struct/exporter.js';

const ImageType = ['png', 'jpeg', 'webp', 'avif'] as const;

const Extensions = {
    png  : 'png',
    jpeg : 'jpg',
    webp : 'webp',
    avif : 'avif'
};

export interface SequenceExporterOptions extends ExporterOptions {
    output : string;
    type : typeof ImageType[number];
}

export const SequenceExporter = {

    async export(renderer : Renderer, opt : SequenceExporterOptions) {

        const ext = Extensions[opt.type];

        await mkdir(opt.output, { recursive : true });

        const length = renderer.renderTotalFrames.toString().length;

        // @ts-expect-error
        for (const { frame, data } of renderer.frames(opt.type)) {

            await Bun.write(join(opt.output, `frame-${ String(frame).padStart(length, '0') }.${ ext }`), Buffer.from(data));
        }
    }
};

export const sequenceExporterCliArgs = {
    type : cmd.option({
        long        : 'type',
        description : `Image type (one of: ${ ImageType.join(', ') })`,
        type        : cmd.oneOf(ImageType)
    })
} as const;
