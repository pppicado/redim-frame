/**
 * Configuration interface for opening windows.
 * Interfaz de configuración para abrir ventanas.
 */
export interface StartWindowConfig {
    /** EN: Initial width as decimal fraction of reference width (0.0–1.0). ES: Ancho inicial como fracción decimal del ancho de referencia (0.0–1.0). */
    width?: number;
    /** EN: Initial height as decimal fraction of reference height (0.0–1.0). ES: Alto inicial como fracción decimal del alto de referencia (0.0–1.0). */
    height?: number;
    /** EN: Initial X position as decimal fraction of reference width (0.0–1.0). ES: Posición X inicial como fracción decimal del ancho de referencia (0.0–1.0). */
    x?: number;
    /** EN: Initial Y position as decimal fraction of reference height (0.0–1.0). ES: Posición Y inicial como fracción decimal del alto de referencia (0.0–1.0). */
    y?: number;
    /** EN: Data to pass to the component via WINDOW_DATA. ES: Datos para pasar al componente vía WINDOW_DATA. */
    data?: any;
    /** EN: URL for the custom scrollbar thumb image. ES: URL para la imagen del thumb del scrollbar personalizado. */
    scrollIcon?: string;
    /** EN: Minimum height as decimal fraction (0.0–1.0). ES: Alto mínimo como fracción decimal (0.0–1.0). */
    minHeight?: number;
    /** EN: Minimum width as decimal fraction (0.0–1.0). ES: Ancho mínimo como fracción decimal (0.0–1.0). */
    minWidth?: number;
    /** EN: Thickness of the resize handles as decimal fraction (0.0–1.0). ES: Grosor de los manejadores de redimensión como fracción decimal (0.0–1.0). */
    resizeBorder?: number;
    /** EN: Size of the scrollbar thumb as decimal fraction (0.0–1.0). ES: Tamaño del thumb del scrollbar como fracción decimal (0.0–1.0). */
    scrollThumbSize?: number;
    /** EN: Preferred z-index. ES: z-index preferido. */
    zIndex?: number;
    /** EN: HTMLElement to reparent the overlay into. ES: HTMLElement al cual reparentar el overlay. */
    origin?: HTMLElement;
    /** EN: Whether the modal has a backdrop. ES: Si el modal tiene fondo oscuro. */
    hasBackdrop?: boolean;
    /** EN: Debug flag. ES: Bandera de depuración. */
    debug?: boolean;
}

/**
 * Events emitted by window components.
 * Eventos emitidos por los componentes de ventana.
 */
export type WindowChangeEvent =
    | { type: 'close' }
    | { type: 'focus' }
    | { type: 'resize'; width: number; height: number; x: number; y: number }
    | { type: 'drag'; x: number; y: number };
