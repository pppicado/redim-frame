import { Directive, EventEmitter, Input, Output, OnDestroy, ComponentRef, HostBinding, ElementRef, Renderer2, ChangeDetectorRef } from '@angular/core';
import { Portal, CdkPortalOutletAttachedRef } from '@angular/cdk/portal';
import { WindowChangeEvent, UnitGroupFactory, WindowConfig, Layers, RfRect, CSS_VARS } from './redim-frame.interface';
import { Subscription } from 'rxjs';

@Directive({
  selector: '[libBaseWindow]'
})
export class BaseWindowDirective implements OnDestroy {


  public setCssVar(name: string, value: string, el: HTMLElement = this.elementRef.nativeElement) { this.renderer.setStyle(el, name, value); }

  private _config: WindowConfig = new WindowConfig();
  private _disposed: boolean = false;

  public observers: { obj: ResizeObserver | Subscription | Renderer2, dis: Function | null }[] = [];

  @Input() get config(): WindowConfig { return this._config; }
  set config(v: WindowConfig) {
    this._config = new WindowConfig(v);
    this.layers = new Layers({ rect: new RfRect(this.config.rect), container: new RfRect(), viewport: new RfRect() });
    this.unit = new UnitGroupFactory(this.layers);
    this.zIndex = this.config.zIndex;
    this.contentPortal = this.config.contentPortal;
    this.windowData = this.config.windowData;
    this.scrollIcon = this.config.scrollIcon;
    this.originElement = this.config.originElement;
    this.scrollThumbSize = this.config.scrollThumbSize;
  }

  // viewport => pixels , container => viewportUnits , rect => relative decimal
  private layers: Layers = new Layers({ rect: new RfRect(this.config.rect), container: new RfRect(), viewport: new RfRect() });


  // Interface to interact with the dimensions of the layers in all measurements units.
  public unit: UnitGroupFactory = new UnitGroupFactory(this.layers);

  @Input() zIndex: number = this.config.zIndex;
  @Input() contentPortal: Portal<any> | null = this.config.contentPortal;
  @Input() windowData: any = this.config.windowData;
  @Input() scrollIcon: string = this.config.scrollIcon;
  @Input() originElement: HTMLElement | null = this.config.originElement;
  @Input() scrollThumbSize: string = this.config.scrollThumbSize;

  @Input() get minWidth(): number { return this.unit.percentage.rect.minWidth; }
  set minWidth(v: number) { this.unit.percentage.rect.minWidth = v; }
  @Input() get minHeight(): number { return this.unit.percentage.rect.minHeight; }
  set minHeight(v: number) { this.unit.percentage.rect.minHeight = v; }
  @Input() get maxWidth(): number { return this.unit.percentage.rect.maxWidth; }
  set maxWidth(v: number) { this.unit.percentage.rect.maxWidth = v; }
  @Input() get maxHeight(): number { return this.unit.percentage.rect.maxHeight; }
  set maxHeight(v: number) { this.unit.percentage.rect.maxHeight = v; }
  @Input() get width(): number { return this.unit.percentage.rect.width; }
  set width(v: number) { this.unit.percentage.rect.width = v; }
  @Input() get height(): number { return this.unit.percentage.rect.height; }
  set height(v: number) { this.unit.percentage.rect.height = v; }
  @Input() get left(): number { return this.unit.percentage.rect.left; }
  set left(v: number) { this.unit.percentage.rect.x = v; }
  @Input() get top(): number { return this.unit.percentage.rect.top; }
  set top(v: number) { this.unit.percentage.rect.y = v; }
  @Input() get overflow(): boolean { return this.unit.percentage.rect.overflow; }
  set overflow(v: boolean) { this.unit.percentage.rect.overflow = v; }

  @Output() change = new EventEmitter<WindowChangeEvent>();

  @HostBinding('style.--z-index') get zIndexStyle() { return this.zIndex; }

  constructor(
    public renderer: Renderer2,
    public elementRef: ElementRef,
    public cdr: ChangeDetectorRef,
    config?: WindowConfig
  ) { if (config) this.config = config; }

  ngOnInit() {
    const styles = window.getComputedStyle(this.elementRef.nativeElement);
    if (!styles.getPropertyValue(CSS_VARS.VIEWPORT_WIDTH)) {
      this.unit.pixels.viewport.width = window.innerWidth;
      this.unit.pixels.viewport.height = window.innerHeight;
      const observer = new ResizeObserver((entries) => this.onResizeObs(entries, this.unit.pixels.viewport, () => this.setCssViewport()))
      observer.observe(document.documentElement);
      this.observers.push({ obj: observer, dis: () => observer.disconnect() });
      this.setCssViewport()
    }
    if (!styles.getPropertyValue(CSS_VARS.WINDOW_WIDTH_INHERITED)) {
      const rect = (this.originElement) ? this.originElement.getBoundingClientRect() : document.documentElement.getBoundingClientRect();
      this.unit.pixels.container.width = rect.width;
      this.unit.pixels.container.height = rect.height;
      this.unit.pixels.container.x = rect.x;
      this.unit.pixels.container.y = rect.y;
      const observer = new ResizeObserver((entries) => this.onResizeObs(entries, this.unit.pixels.container, () => this.setCssOrigin()));
      observer.observe((this.originElement) ? this.originElement : document.documentElement);
      this.observers.push({ obj: observer, dis: () => observer.disconnect() });
      this.setCssOrigin()
    }
    this.cdr.detectChanges();
  }

  private onResizeObs(entries: ResizeObserverEntry[], rect: DOMRect, action: () => void) {
    const entry = entries?.[0];
    if (entry) {
      rect.width = entry.contentRect.width;
      rect.height = entry.contentRect.height;
      rect.x = entry.contentRect.left;
      rect.y = entry.contentRect.top;
      action();
    }
  }

  public setCssRect() {
    this.setCssVar(CSS_VARS.WINDOW_WIDTH, this.unit.relative.rect.width.toString());
    this.setCssVar(CSS_VARS.WINDOW_HEIGHT, this.unit.relative.rect.height.toString());
    this.setCssVar(CSS_VARS.WINDOW_LEFT, this.unit.relative.rect.x.toString());
    this.setCssVar(CSS_VARS.WINDOW_TOP, this.unit.relative.rect.y.toString());
    this.cdr.markForCheck();
  }

  private setCssOrigin() {
    this.setCssVar(CSS_VARS.WINDOW_WIDTH_INHERITED, this.unit.viewportUnits.container.width + 'vw');
    this.setCssVar(CSS_VARS.WINDOW_HEIGHT_INHERITED, this.unit.viewportUnits.container.height + 'vh');
    this.setCssVar(CSS_VARS.WINDOW_LEFT_INHERITED, this.unit.viewportUnits.container.x + 'vw');
    this.setCssVar(CSS_VARS.WINDOW_TOP_INHERITED, this.unit.viewportUnits.container.y + 'vh');
    this.cdr.markForCheck();
  }

  private setCssViewport() {
    this.setCssVar(CSS_VARS.VIEWPORT_WIDTH, this.unit.pixels.viewport.width + 'px');
    this.setCssVar(CSS_VARS.VIEWPORT_HEIGHT, this.unit.pixels.viewport.height + 'px');
    this.setCssVar(CSS_VARS.VIEWPORT_LEFT, this.unit.pixels.viewport.x + 'px');
    this.setCssVar(CSS_VARS.VIEWPORT_TOP, this.unit.pixels.viewport.y + 'px');
    this.cdr.markForCheck();
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

  dispose(emit: boolean = true): void {
    if (!this._disposed) {
      this._disposed = true;
      if (emit) this.change.emit({ type: 'close' });
      this.ngOnDestroy();
    }
  }

  closeWindow() {
    this.change.emit({ type: 'close' });
    // Nota para PPPS : Evaluar si gestionar close desde fuera como evento o ejecutar aqui dispose()
  }
  onWindowClick() { this.change.emit({ type: 'focus' }); }
  ngOnDestroy() { while (this.observers.length) { this.observers.pop()?.dis?.(); } }
}




