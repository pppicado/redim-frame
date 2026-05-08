import { Component, EventEmitter, Input, Renderer2, OnDestroy, AfterViewInit, OnInit, ElementRef, ChangeDetectorRef } from '@angular/core';
import { CdkDragEnd, CdkDragStart, CdkDrag } from '@angular/cdk/drag-drop';
import { Portal } from '@angular/cdk/portal';
import { BaseWindowDirective } from '../base-window.directive';

@Component({
  selector: 'lib-floating-window',
  templateUrl: './floating-window.component.html',
  styleUrls: ['./floating-window.component.css']
})
export class FloatingWindowComponent extends BaseWindowDirective implements OnInit, AfterViewInit, OnDestroy {

  @Input() override zIndex: number = 1000;

  xyDragPositionPixels = { x: 0, y: 0 };

  private setCssVar(name: string, value: string) {
    this.renderer.setStyle(this.elementRef.nativeElement, name, value);
  }

  /** Returns the reference width/height for fraction→pixel conversions */
  private getReferenceSize(): { width: number; height: number } {
    if (this.originElement) {
      return { width: this.originElement.clientWidth, height: this.originElement.clientHeight };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }

  /** Pushes current decimal-fraction state into CSS custom properties on :host */
  syncPositionToCssVars() {
    this.setCssVar('--rf_window_width', this.width.toString());
    this.setCssVar('--rf_window_height', this.height.toString());
    this.setCssVar('--rf_window_top', this.y.toString());
    this.setCssVar('--rf_window_left', this.x.toString());
    this.setCssVar('--rf_resize_handle', this.resizeBorder.toString());
  }

  updateDragPosition() {
    const ref = this.getReferenceSize();
    this.xyDragPositionPixels = {
      x: this.x * ref.width,
      y: this.y * ref.height
    };
  }

  private isResizing: boolean = false;
  private resizeDirection: string = '';
  private startX: number = 0;
  private startY: number = 0;
  private startWidth: number = 0;
  private startHeight: number = 0;
  private startXWindow: number = 0;
  private startYWindow: number = 0;

  private mouseMoveListener: Function | null = null;
  private mouseUpListener: Function | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    private renderer: Renderer2,
    private elementRef: ElementRef,
    private cdr: ChangeDetectorRef
  ) {
    super();
  }

  ngOnInit() {
    this.syncPositionToCssVars();
    this.updateDragPosition();

    // Only outermost windows (no originElement) observe viewport and set viewport-origin vars
    if (!this.originElement) {
      this.setCssVar('--rf_viewport_x_px', window.innerWidth + 'px');
      this.setCssVar('--rf_viewport_y_px', window.innerHeight + 'px');
      this.resizeObserver = new ResizeObserver((entries) => this.onViewportResize(entries));
      this.resizeObserver.observe(document.documentElement);
    }
  }

  ngAfterViewInit() {
  }

  private onViewportResize(entries?: ResizeObserverEntry[]) {
    const entry = entries?.[0];
    if (!this.originElement && entry) {
      this.setCssVar('--rf_viewport_x_px', entry.contentRect.width + 'px');
      this.setCssVar('--rf_viewport_y_px', entry.contentRect.height + 'px');
    }
  }

  override ngOnDestroy() {
    this.removeResizeListeners();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    super.ngOnDestroy();
  }

  onDragStart(event: CdkDragStart) {
    this.change.emit({ type: 'focus' });
  }

  onDragEnd(event: CdkDragEnd) {
    const element = event.source.getRootElement();
    const rect = element.getBoundingClientRect();
    const ref = this.getReferenceSize();

    if (this.originElement) {
      const originRect = this.originElement.getBoundingClientRect();
      this.x = (rect.left - originRect.left) / ref.width;
      this.y = (rect.top - originRect.top) / ref.height;
    } else {
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      this.x = (rect.left + scrollX) / ref.width;
      this.y = (rect.top + scrollY) / ref.height;
    }

    // Clamp to [0, 1]
    this.x = Math.min(Math.max(this.x, 0), 1);
    this.y = Math.min(Math.max(this.y, 0), 1);

    this.syncPositionToCssVars();
    this.updateDragPosition();
    this.change.emit({ type: 'drag', x: this.x, y: this.y });
  }

  initResize(event: MouseEvent, direction: string) {
    event.preventDefault();
    event.stopPropagation();

    this.isResizing = true;
    this.resizeDirection = direction;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startWidth = this.width;
    this.startHeight = this.height;
    this.startXWindow = this.x;
    this.startYWindow = this.y;

    this.change.emit({ type: 'focus' });

    this.mouseMoveListener = this.renderer.listen('document', 'mousemove', (e) => this.onResize(e));
    this.mouseUpListener = this.renderer.listen('document', 'mouseup', () => this.stopResize());
  }

  onResize(event: MouseEvent) {
    if (!this.isResizing) return;
    const dxPx = event.clientX - this.startX;
    const dyPx = event.clientY - this.startY;
    const ref = this.getReferenceSize();
    const dxFraction = dxPx / ref.width;
    const dyFraction = dyPx / ref.height;

    for (const direction of this.resizeDirection) {
      switch (direction) {
        case 'e':
          this.width = Math.max(this.minWidth, this.startWidth + dxFraction);
          break;
        case 'w':
          this.width = Math.max(this.minWidth, this.startWidth - dxFraction);
          this.x = this.startXWindow + (this.startWidth - this.width);
          break;
        case 's':
          this.height = Math.max(this.minHeight, this.startHeight + dyFraction);
          break;
        case 'n':
          this.height = Math.max(this.minHeight, this.startHeight - dyFraction);
          this.y = this.startYWindow + (this.startHeight - this.height);
          break;
      }
    }

    // Clamp all to [0, 1]
    this.x = Math.min(Math.max(this.x, 0), 1);
    this.y = Math.min(Math.max(this.y, 0), 1);
    this.width = Math.min(Math.max(this.width, 0), 1);
    this.height = Math.min(Math.max(this.height, 0), 1);

    this.syncPositionToCssVars();
    this.updateDragPosition();
    this.change.emit({ type: 'resize', width: this.width, height: this.height, x: this.x, y: this.y });
  }

  stopResize() {
    this.isResizing = false;
    this.removeResizeListeners();
  }

  private removeResizeListeners() {
    if (this.mouseMoveListener) {
      this.mouseMoveListener();
      this.mouseMoveListener = null;
    }
    if (this.mouseUpListener) {
      this.mouseUpListener();
      this.mouseUpListener = null;
    }
  }
}