#!/usr/bin/env node

import { subcommands, run } from 'cmd-ts';

import { command as apng } from './exporter/apng';
import { command as webp } from './exporter/webp';
import { command as gif }  from './exporter/gif';
import { command as seq }  from './exporter/seq';

run(subcommands({ name : 'lottie converter', cmds : { seq, apng, webp, gif } }), process.argv.slice(2));
