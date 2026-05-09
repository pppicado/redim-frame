import { Directive, EventEmitter, Input, Output, OnDestroy, ComponentRef } from '@angular/core';
import { Portal, CdkPortalOutletAttachedRef } from '@angular/cdk/portal';
import { WindowChangeEvent } from './redim-frame.interface';

function clamp01(v: number): number {
  return Math.min(Math.max(v, 0), 1);
}

function clamp01Warn(value: number, name: string): number {
  const clamped = Math.min(Math.max(value, 0), 1);
  if (clamped !== value) {
    console.warn(`[BaseWindowDirective] '${name}' value ${value} is outside valid range [0,1]. Clamping to ${clamped}.`);
  }
  return clamped;
}

@Directive({
  selector: '[libBaseWindow]'
})
export class BaseWindowDirective implements OnDestroy {
  private _width: number = 0.3;
  /** EN: Initial width as decimal fraction of reference width (0.0–1.0). ES: Ancho inicial como fracción decimal del ancho de referencia (0.0–1.0). */
  @Input() get width(): number { return this._width; }
  set width(v: number) { this._width = clamp01Warn(v, 'width'); }

  private _height: number = 0.3;
  /** EN: Initial height as decimal fraction of reference height (0.0–1.0). ES: Alto inicial como fracción decimal del alto de referencia (0.0–1.0). */
  @Input() get height(): number { return this._height; }
  set height(v: number) { this._height = clamp01Warn(v, 'height'); }

  private _x: number = 0.1;
  /** EN: Initial X position as decimal fraction of reference width (0.0–1.0). ES: Posición X inicial como fracción decimal del ancho de referencia (0.0–1.0). */
  @Input() get x(): number { return this._x; }
  set x(v: number) { this._x = clamp01Warn(v, 'x'); }

  private _y: number = 0.1;
  /** EN: Initial Y position as decimal fraction of reference height (0.0–1.0). ES: Posición Y inicial como fracción decimal del alto de referencia (0.0–1.0). */
  @Input() get y(): number { return this._y; }
  set y(v: number) { this._y = clamp01Warn(v, 'y'); }

  @Input() zIndex: number = 1000;
  @Input() contentPortal: Portal<any> | null = null;
  @Input() windowData: any = null;

  private _resizeBorder: number = 0.005;
  /** EN: Thickness of the resize handles as decimal fraction (0.0–1.0). ES: Grosor de los manejadores de redimensión como fracción decimal (0.0–1.0). */
  @Input() get resizeBorder(): number { return this._resizeBorder; }
  set resizeBorder(v: number) { this._resizeBorder = clamp01Warn(v, 'resizeBorder'); }

  private _minWidth: number = 0.1;
  /** EN: Minimum width as decimal fraction (0.0–1.0). ES: Ancho mínimo como fracción decimal (0.0–1.0). */
  @Input() get minWidth(): number { return this._minWidth; }
  set minWidth(v: number) { this._minWidth = clamp01Warn(v, 'minWidth'); }

  private _minHeight: number = 0.1;
  /** EN: Minimum height as decimal fraction (0.0–1.0). ES: Alto mínimo como fracción decimal (0.0–1.0). */
  @Input() get minHeight(): number { return this._minHeight; }
  set minHeight(v: number) { this._minHeight = clamp01Warn(v, 'minHeight'); }

  /** EN: URL for the custom scrollbar thumb image. ES: URL para la imagen del thumb del scrollbar personalizado. */
  @Input() scrollIcon: string = '';

  private _scrollThumbSize: number = 0.02;
  /** EN: Size of the scrollbar thumb as decimal fraction (0.0–1.0). ES: Tamaño del thumb del scrollbar como fracción decimal (0.0–1.0). */
  @Input() get scrollThumbSize(): number { return this._scrollThumbSize; }
  set scrollThumbSize(v: number) { this._scrollThumbSize = clamp01Warn(v, 'scrollThumbSize'); }

  @Input() originElement: HTMLElement | null = null;

  // ---------------------------------------------------------------------------
  // Deprecated vw/vh aliases — convert from old vw/vh units (0–100 scale)
  // to new decimal fraction (0–1 scale) by dividing by 100.
  // Emits a console.warn once per alias.
  // ---------------------------------------------------------------------------
  private static warnedAliases = new Set<string>();

  private static warnOnce(alias: string, newProp: string) {
    if (!BaseWindowDirective.warnedAliases.has(alias)) {
      console.warn(
        `[BaseWindowDirective] '${alias}' is deprecated. Use '${newProp}' with decimal fraction (0.0–1.0) instead of vw/vh units. Value will be divided by 100 internally.`
      );
      BaseWindowDirective.warnedAliases.add(alias);
    }
  }

  /** @deprecated Use `width` as decimal fraction (0.0–1.0). This setter converts from vw units (0–100) by dividing by 100. */
  @Input() set widthVw(v: number) {
    BaseWindowDirective.warnOnce('widthVw', 'width');
    this.width = clamp01(v / 100);
  }
  /** @deprecated Use `height` as decimal fraction (0.0–1.0). This setter converts from vh units (0–100) by dividing by 100. */
  @Input() set heightVh(v: number) {
    BaseWindowDirective.warnOnce('heightVh', 'height');
    this.height = clamp01(v / 100);
  }
  /** @deprecated Use `x` as decimal fraction (0.0–1.0). This setter converts from vw units (0–100) by dividing by 100. */
  @Input() set xVw(v: number) {
    BaseWindowDirective.warnOnce('xVw', 'x');
    this.x = clamp01(v / 100);
  }
  /** @deprecated Use `y` as decimal fraction (0.0–1.0). This setter converts from vh units (0–100) by dividing by 100. */
  @Input() set yVh(v: number) {
    BaseWindowDirective.warnOnce('yVh', 'y');
    this.y = clamp01(v / 100);
  }
  /** @deprecated Use `minWidth` as decimal fraction (0.0–1.0). This setter converts from vw units (0–100) by dividing by 100. */
  @Input() set minWidthVw(v: number) {
    BaseWindowDirective.warnOnce('minWidthVw', 'minWidth');
    this.minWidth = clamp01(v / 100);
  }
  /** @deprecated Use `minHeight` as decimal fraction (0.0–1.0). This setter converts from vh units (0–100) by dividing by 100. */
  @Input() set minHeightVh(v: number) {
    BaseWindowDirective.warnOnce('minHeightVh', 'minHeight');
    this.minHeight = clamp01(v / 100);
  }

  @Output() change = new EventEmitter<WindowChangeEvent>();

  private _disposed: boolean = false;

  ngOnDestroy() {
    // Override if needed in subclasses
  }

  getDimensions(): { width: number; height: number; x: number; y: number } {
    return { width: this.width, height: this.height, x: this.x, y: this.y };
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.change.emit({ type: 'close' });
  }

  onPortalAttached(ref: CdkPortalOutletAttachedRef) {
    if (ref instanceof ComponentRef && this.windowData) {
      Object.keys(this.windowData).forEach(key => {
        if (key in ref.instance) {
          ref.setInput(key, this.windowData[key]);
        }
      });
    }
  }

  onWindowClick() {
    this.change.emit({ type: 'focus' });
  }

  closeWindow() {
    this.change.emit({ type: 'close' });
  }
}
