#!/usr/bin/env node

import { version } from '../package.json';

import { subcommands, run } from 'cmd-ts';

import { command as apng } from './exporter/apng';
import { command as webp } from './exporter/webp';
import { command as gif }  from './exporter/gif';
import { command as seq }  from './exporter/seq';

run(subcommands({ name : process.argv0, cmds : { seq, apng, webp, gif }, version }), process.argv.slice(2));
