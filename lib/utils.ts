import * as FsP  from 'node:fs/promises';
import * as Path from 'node:path';

import * as cmd from 'cmd-ts';

export const outputFile = cmd.extendType(cmd.string, {
    async from(branch) {

        const absolute = Path.relative((process.cwd()), branch);

        try {

            await FsP.access(absolute, FsP.constants.W_OK);

            return absolute;
        }
        catch {

            throw new Error(`File ${ absolute } does not exist or is not writable`);
        }
    }
});

export const integer = cmd.extendType(cmd.number, {
    async from(branch) {

        if (!Number.isSafeInteger(branch)) {

            throw new Error(`Value ${ branch } is not an integer`);
        }

        return branch;
    }
});

export const range = (type : typeof integer | typeof cmd.number, { min, max, over, under } : { min? : number, max? : number, over? : number, under? : number }) => {

    return cmd.extendType(type, {
        async from(branch) {

            if (over !== undefined && branch <= over) {

                throw new Error(`Value ${ branch } must be over ${ over }`);
            }

            if (min !== undefined && branch < min) {

                throw new Error(`Value ${ branch } must be greater or equal to ${ min }`);
            }

            if (max !== undefined && branch > max) {

                throw new Error(`Value ${ branch } must be less or equal to ${ max }`);
            }

            if (under !== undefined && branch >= under) {

                throw new Error(`Value ${ branch } must be under ${ under }`);
            }

            return branch;
        }
    });
};

export const repeat = cmd.option({
    long        : 'repeat',
    type        : cmd.optional(range(integer, { min : 0 })),
    description : 'Number of times to repeat the animation, integer (0 = infinite) (default: 0)'
});

export const roundToDecimal = (num : number, decimal : number) => Math.round(num * 10 ** decimal) / 10 ** decimal;

