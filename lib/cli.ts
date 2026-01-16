#!/usr/bin/env bun

import Path from 'node:path';
import FsP  from 'node:fs/promises';

import ora         from 'ora';
import confirm     from '@inquirer/confirm';
import prettyBytes from 'pretty-bytes';
import * as cmd    from 'cmd-ts';

import pkg from '../package.json' with { type : 'json' };

import { rendererArgs, type RendererHooks, type RendererOptions } from './struct/renderer.js';
import { type ExporterHooks }                                     from './struct/exporter.js';
import { LottieRenderer }                                         from './renderer/lottie.js';
import { SVGRenderer }                                            from './renderer/svg.js';

import { apngExporterCliArgs }     from './exporter/apng.js';
import { gifExporterCliArgs }      from './exporter/gif.js';
import { sequenceExporterCliArgs } from './exporter/seq.js';
import { webpExporterCliArgs }     from './exporter/webp.js';
import { roundToDecimal }          from './utils.js';

const internals = {

    addCliHooks(args : { hooks? : RendererHooks & ExporterHooks, silent? : boolean }) {

        if (args.silent !== true) {

            let spinner;

            args.hooks = {
                beforeRender({ totalFrames }) {

                    spinner = ora(`Processing frames: 0/${ totalFrames }`).start();
                },
                onFrame({ frame, totalFrames }) {

                    spinner!.text = `Processing frames: ${ frame }/${ totalFrames }`;
                    spinner!.render();
                },
                afterRender({ totalFrames }) {

                    spinner!.succeed(`${ totalFrames } Frames generated`);
                },
                beforeOptimize() {

                    spinner = ora(`Optimizing file...`).start();
                },
                onOptimizeProgress({ progress }) {

                    spinner!.text = `Optimizing file: ${ roundToDecimal(progress * 100, 2) }%`;
                    spinner!.render();
                },
                afterOptimize({ size, original }) {

                    spinner!.succeed(`File optimized : ${ prettyBytes(original) } -> ${ prettyBytes(size) } (${ roundToDecimal((size - original) / original * 100, 2) }%)`);
                }
            };
        }
    },

    async getRenderer(args : RendererOptions & { input : string }) {

        const file = Bun.file(args.input);

        if (file.type.startsWith('application/json')) {

            return LottieRenderer.import(await file.json(), args);
        }

        if (file.type.startsWith('image/svg+xml')) {

            return SVGRenderer.import(await file.text(), args);
        }

        if (file.name?.endsWith('.lottie')) {

            return LottieRenderer.import(await file.arrayBuffer(), args);
        }

        throw new Error(`Unsupported file type: ${ file.name }`);
    },

    async normalizeIO(args : { input : string, output : string, overwrite : boolean }, options : { onlyFolder : boolean } | { defaultExtension : string }) {

        args.input  = Path.resolve(process.cwd(), args.input);
        args.output = Path.resolve(process.cwd(), args.output);

        try {

            await FsP.access(args.input, FsP.constants.F_OK);
        }
        catch (error) {

            throw new Error(`File ${ args.input } does not exist or is not readable`, { cause : error });
        }

        let isDirectory = false;

        try {

            const stats = await FsP.lstat(args.output);

            isDirectory = stats.isDirectory();
        }
        catch (error) {

            throw new Error(`Input file ${ args.output } does not exist`, { cause : error });
        }

        if ('onlyFolder' in options) {

            if (!isDirectory) {

                throw new Error(`Output path ${ args.output } is a file, not a folder`);
            }
        }
        else {

            if (isDirectory) {

                const parsed = Path.parse(args.input);

                args.output = Path.join(args.output, `${ parsed.name }.${ options.defaultExtension }`);
            }
        }

        const outputFolder = Path.dirname(args.output);

        try {

            await FsP.access(outputFolder, FsP.constants.W_OK);
        }
        catch (error) {

            throw new Error(`Folder ${ outputFolder } does not exist or is not writable`, { cause : error });
        }

        try {

            await FsP.access(args.output, FsP.constants.F_OK);

            if (!args.overwrite) {

                const answer = await confirm({ message : `File ${ args.output } already exists, overwrite` });

                if (!answer) {

                    console.log('Aborted');
                    process.exit(0);
                }
            }
        }
        catch {
        }
    },

    baseArgs(outputDescription : string) {

        return {
            input     : cmd.option({ type : cmd.string, long : 'input', short : 'i', description : 'Input file (.lottie, .json, .svg)' }),
            output    : cmd.option({ type : cmd.string, long : 'output', short : 'o', description : outputDescription }),
            overwrite : cmd.flag({ long : 'overwrite', description : 'Overwrite existing files' }),
            silent    : cmd.flag({ long : 'silent', description : 'Disable all info output' }),
            ...rendererArgs
        };
    }
};

const cli = cmd.subcommands({
    version : pkg.version,
    name    : pkg.name,
    cmds    : {
        apng : cmd.command({
            name    : 'apng',
            args    : {
                ...internals.baseArgs('Folder/File to output the APNG to'),
                ...apngExporterCliArgs
            },
            handler : async (args) => {

                const { APNGExporter } = await import('./exporter/apng.js');

                internals.addCliHooks(args);

                await internals.normalizeIO(args, { defaultExtension : 'apng' });

                const renderer = await internals.getRenderer(args);

                await APNGExporter.export(renderer, args);
            }
        }),
        gif  : cmd.command({
            name    : 'gif',
            args    : {
                ...internals.baseArgs('Folder/File to output the GIF to'),
                ...gifExporterCliArgs
            },
            handler : async (args) => {

                const { GIFExporter } = await import('./exporter/gif.js');

                internals.addCliHooks(args);

                await internals.normalizeIO(args, { defaultExtension : 'gif' });

                const renderer = await internals.getRenderer(args);

                await GIFExporter.export(renderer, args);
            }
        }),
        seq  : cmd.command({
            name    : 'seq',
            args    : {
                ...internals.baseArgs('Output directory'),
                ...sequenceExporterCliArgs
            },
            handler : async (args) => {

                const { SequenceExporter } = await import('./exporter/seq.js');

                internals.addCliHooks(args);

                await internals.normalizeIO(args, { onlyFolder : true });

                const renderer = await internals.getRenderer(args);

                await SequenceExporter.export(renderer, args);
            }
        }),
        webp : cmd.command({
            name    : 'webp',
            args    : {
                ...internals.baseArgs('Folder/File to output the WebP to'),
                ...webpExporterCliArgs
            },
            handler : async (args) => {

                const { WEBPExporter } = await import('./exporter/webp.js');

                internals.addCliHooks(args);

                await internals.normalizeIO(args, { defaultExtension : 'webp' });

                const renderer = await internals.getRenderer(args);

                await WEBPExporter.export(renderer, args);
            }
        })
    }
});

await cmd.run(cli, process.argv.slice(2));

process.exit(0);
