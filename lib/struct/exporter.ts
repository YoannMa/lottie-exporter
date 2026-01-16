
export type ExporterBeforeOptimizeHook = (metadata : { size : number }) => void;
export type ExporterAfterOptimizeHook = (metadata : { size : number, original : number }) => void;
export type ExporterOnOptimizeProgressHook = (metadata : { size : number, progress : number }) => void;

export interface ExporterHooks {
    beforeOptimize : ExporterBeforeOptimizeHook;
    afterOptimize : ExporterAfterOptimizeHook;
    onOptimizeProgress : ExporterOnOptimizeProgressHook;
}

export interface ExporterOptions {
    hooks? : ExporterHooks;
}
