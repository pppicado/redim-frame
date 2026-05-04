export interface StartWindowConfig {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    data?: any;
    scrollIcon?: string;
    minHeight?: number;
    minWidth?: number;
    resizeBorder?: number;
    scrollThumbSize?: number;
    zIndex?: number;
    origin?: HTMLElement;
    hasBackdrop?: boolean;
    debug?: boolean;
}

export type WindowChangeEvent =
    | { type: 'close' }
    | { type: 'focus' }
    | { type: 'resize'; width: number; height: number; x: number; y: number }
    | { type: 'drag'; x: number; y: number };