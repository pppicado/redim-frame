import { Portal } from "@angular/cdk/portal";

export const CSS_VARS = {
  VIEWPORT_WIDTH: '--rf_viewport_px_width',
  VIEWPORT_HEIGHT: '--rf_viewport_px_height',
  VIEWPORT_LEFT: '--rf_viewport_px_x',
  VIEWPORT_TOP: '--rf_viewport_px_y',
  WINDOW_WIDTH_INHERITED: '--rf_window_width_inherited',
  WINDOW_HEIGHT_INHERITED: '--rf_window_height_inherited',
  WINDOW_LEFT_INHERITED: '--rf_window_left_inherited',
  WINDOW_TOP_INHERITED: '--rf_window_top_inherited',
  WINDOW_WIDTH: '--rf_window_width',
  WINDOW_HEIGHT: '--rf_window_height',
  WINDOW_LEFT: '--rf_window_left',
  WINDOW_TOP: '--rf_window_top',
} as const;

/**
 * Its config and default configuration class for window.
 */
export class WindowConfig {
  rect: RfRect = new RfRect(
    {
      x: 0.25,
      y: 0.25,
      width: 0.5,
      height: 0.5,
      minWidth: 0.1,
      minHeight: 0.1,
      maxWidth: 1,
      maxHeight: 1
    });
  contentPortal: Portal<any> | null = null;
  windowData: any = null;
  scrollIcon: string = '';
  resizeBorder: string = '1vw';
  scrollThumbSize: string = '2vw';
  zIndex: number = 1000;
  originElement: HTMLElement | null = null;
  hasBackdrop: boolean = false;
  constructor(config?: Partial<WindowConfig>) { if (config) Object.assign(this, config); }
}

export interface StartWindowConfig extends Partial<WindowConfig> { }

/**
 * Class to help drag and resize of a window.
 */
export class DragContext {
  startX: number = 0;
  startY: number = 0;
  dragX: number = 0;
  dragY: number = 0;
  width: number = 0;
  height: number = 0;
  x: number = 0;
  y: number = 0;
  get diffX(): number { return this.dragX - this.startX; }
  get diffY(): number { return this.dragY - this.startY; }
  constructor(drgCtx?: Partial<DragContext>) { Object.assign(this, drgCtx); }
}

/**
 * Class to manage the position and size of a window.
 */
export class RfRect extends DOMRect {
  // From DOMRect interface
  // x
  // y
  // width
  // height
  // left
  // top
  // right
  // bottom
  minWidth: number = 0;
  minHeight: number = 0;
  maxWidth: number = 1;
  maxHeight: number = 1;
  overflow: boolean = false;
  get ratioWH(): number { return this.width / this.height; }
  set ratioWH(v: number) { this.height = this.width / v; }
  constructor(rfRect: Partial<RfRect> = {}) { super(0, 0, 1, 1); Object.assign(this, rfRect); }
}

export interface RectView extends Partial<RfRect> { }

export type NullablePartial<T> = { [K in keyof T]?: T[K] | null; };


/**
 * Groups viewport, container, and rect views together.
 */

export class Layers {

  rect!: RfRect;
  container!: RfRect;
  viewport!: RfRect;

  constructor(layers?: Partial<Layers> | null) {
    if (layers == null) return;
    this.rect = new RfRect(layers.rect);
    this.container = new RfRect(layers.container);
    this.viewport = new RfRect(layers.viewport);
  }
}

export interface LayersView extends Partial<Layers> { }

export class UnitGroup {

  pixels!: Layers;
  viewportUnits!: Layers;
  relative!: Layers;
  percentage!: Layers;

  // Constructor parameter is a PARTIAL UnitGroup or UnitGroup which properties in null or null 
  constructor(unitGroup?: NullablePartial<UnitGroup> | null) {
    if (unitGroup == null) return;
    this.pixels = new Layers(unitGroup.pixels);
    this.viewportUnits = new Layers(unitGroup.viewportUnits);
    this.relative = new Layers(unitGroup.relative);
    this.percentage = new Layers(unitGroup.percentage);
  }

}

export interface UnitGroupView extends Partial<UnitGroup> { }

/**
 * Factory class to create different UnitGroup of dimensions.
 */
export class UnitGroupFactory extends UnitGroup {

  constructor(layers: Layers) {
    super({ pixels: null, viewportUnits: null, relative: null, percentage: null });

    const ctWpx: () => number = () => layers.container.width * layers.viewport.width / 100;
    const ctHpx: () => number = () => layers.container.height * layers.viewport.height / 100;

    const makeView = (src: RfRect, H: () => number, V: () => number): RfRect => {
      const rect = new RfRect(src);
      Object.assign(rect, {
        get width() { return src.width * H(); }, set width(v) { src.width = v / H(); },
        get height() { return src.height * V(); }, set height(v) { src.height = v / V(); },
        get x() { return src.x * H(); }, set x(v) { src.x = v / H(); },
        get y() { return src.y * V(); }, set y(v) { src.y = v / V(); },
        get left() { return src.left * H(); }, set left(v) { src.x = (v / H()) - ((src.width >= 0) ? 0 : src.width); },
        get top() { return src.top * V(); }, set top(v) { src.y = (v / V()) - ((src.height >= 0) ? 0 : src.height); },
        get bottom() { return src.bottom * V(); }, set bottom(v) { src.y = (v / V()) + ((src.height <= 0) ? 0 : src.height); },
        get right() { return src.right * H(); }, set right(v) { src.x = (v / H()) + ((src.width <= 0) ? 0 : src.width); },
        get maxWidth() { return src.maxWidth * H(); }, set maxWidth(v) { src.maxWidth = v / H(); },
        get maxHeight() { return src.maxHeight * V(); }, set maxHeight(v) { src.maxHeight = v / V(); },
        get minWidth() { return src.minWidth * H(); }, set minWidth(v) { src.minWidth = v / H(); },
        get minHeight() { return src.minHeight * V(); }, set minHeight(v) { src.minHeight = v / V(); },
        get ratioWH() { return (src.width * H()) / (src.height * V()); }, set ratioWH(v: number) { src.height = src.width / v; },
        toJSON: function () { return { x: src.x, y: src.y, width: src.width, height: src.height, minWidth: src.minWidth, minHeight: src.minHeight, maxWidth: src.maxWidth, maxHeight: src.maxHeight, ratioWH: src.ratioWH }; }
      })
      return rect;
    };

    const makeClRV = (src: RfRect, H: () => number, V: () => number): RfRect => { // Make a clamped rect view
      const view = makeView(src, H, V);
      const rect = new RfRect(src);
      Object.assign(rect, {
        get width() { return view.width; },
        set width(v: number) { view.width = clampDim(src, v, view.minWidth, view.maxWidth, H()); },
        get height() { return view.height; },
        set height(v: number) { view.height = clampDim(src, v, view.minHeight, view.maxHeight, V()); },
        get x() { return view.x; },
        set x(v: number) { view.x = clampPos(src, v, view.minWidth, view.width, H()); },
        get y() { return view.y; },
        set y(v: number) { view.y = clampPos(src, v, view.minHeight, view.height, V()); },
        get ratioWH() { return view.ratioWH; }, set ratioWH(v: number) { view.height = view.width / v; },
      })
      return rect;
    };

    const clampDim = (src: RfRect, v: number, min: number, max: number, maxBound: number): number => {
      v = Math.min(Math.max(v, min), max);
      if (!src.overflow) {
        v = Math.min(v, maxBound);
      }
      return v;
    }

    const clampPos = (src: RfRect, v: number, minDim: number, dim: number, maxBound: number): number => {
      if (!src.overflow) {
        v = Math.min(Math.max(v, 0), maxBound - dim);
      }
      return v;
    }

    //                                                            source              H (horizontal)                     V (vertical)
    this.pixels.viewport = makeView(layers.viewport, () => 1, () => 1);
    this.pixels.container = makeView(layers.container, () => layers.viewport.width / 100, () => layers.viewport.height / 100);
    this.pixels.rect = makeClRV(layers.rect, ctWpx, ctHpx);
    this.viewportUnits.viewport = makeView(layers.viewport, () => 100 / layers.viewport.width, () => 100 / layers.viewport.height);
    this.viewportUnits.container = makeView(layers.container, () => 1, () => 1);
    this.viewportUnits.rect = makeClRV(layers.rect, () => layers.container.width, () => layers.container.height);
    this.relative.viewport = makeView(layers.viewport, () => 1 / ctWpx(), () => 1 / ctHpx());
    this.relative.container = makeView(layers.container, () => 1 / layers.container.width, () => 1 / layers.container.height);
    this.relative.rect = makeClRV(layers.rect, () => 1, () => 1);
    this.percentage.viewport = makeView(layers.viewport, () => (1 / ctWpx()) * 100, () => (1 / ctHpx()) * 100);
    this.percentage.container = makeView(layers.container, () => (1 / layers.container.width) * 100, () => (1 / layers.container.height) * 100);
    this.percentage.rect = makeClRV(layers.rect, () => 100, () => 100);

  }
}

/**
 * Events emitted by window components.
 * Eventos emitidos por los componentes de ventana.
 */
export type WindowChangeEvent =
  | { type: 'close' }
  | { type: 'focus' }
  | { type: 'resize' }
  | { type: 'drag' };
