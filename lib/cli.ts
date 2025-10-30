#!/usr/bin/env bun

import pkg from '../package.json' with { type: 'json' };

import { subcommands, run } from 'cmd-ts';

import { command as apng } from './exporter/apng.js';
import { command as webp } from './exporter/webp.js';
import { command as gif }  from './exporter/gif.js';
import { command as seq }  from './exporter/seq.js';

run(subcommands({ name : pkg.name, cmds : { seq, apng, webp, gif }, version : pkg.version }), process.argv.slice(2));
