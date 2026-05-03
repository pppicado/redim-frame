import { Component, EventEmitter, HostBinding, Input, Output, Renderer2, OnDestroy, AfterViewInit, OnInit, ComponentRef, ChangeDetectorRef } from '@angular/core';
import { CdkDragEnd, CdkDragStart, CdkDrag } from '@angular/cdk/drag-drop';
import { Portal, CdkPortalOutletAttachedRef } from '@angular/cdk/portal';
import { BaseWindowDirective } from '../base-window.directive';

@Component({
  selector: 'lib-floating-window',
  templateUrl: './floating-window.component.html',
  styleUrls: ['./floating-window.component.css']
})
export class FloatingWindowComponent extends BaseWindowDirective implements OnInit, AfterViewInit, OnDestroy {

  @HostBinding('style.--resizeBorder') resizeBorderStyle: string = this.resizeBorder + 'vw';

  @HostBinding('style.--width') get widthStyle() { return this.width + 'vw'; }
  @HostBinding('style.--height') get heightStyle() { return this.height + 'vh'; }
  @HostBinding('style.--left') get leftStyle() { return this.x + 'vw'; }
  @HostBinding('style.--top') get topStyle() { return this.y + 'vh'; }
  @HostBinding('style.--z-index') get zIndexStyle() { return this.zIndex; }


  xyDragPositionPixels = { x: 0, y: 0 };
  
  /** Returns the reference width/height for percentage calculations */
  private getReferenceSize(): { width: number; height: number } {
    if (this.originElement) {
      return { width: this.originElement.clientWidth, height: this.originElement.clientHeight };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }

  updateDragPosition() {
    const ref = this.getReferenceSize();
    this.xyDragPositionPixels = {
      x: (this.x * ref.width) / 100,
      y: (this.y * ref.height) / 100
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
  private windowResizeListener: Function | null = null;

  constructor(private renderer: Renderer2, private cdr: ChangeDetectorRef) {
    super();
  }

  ngOnInit() {
    this.updateDragPosition();
    this.windowResizeListener = this.renderer.listen('window', 'resize', () => this.onWindowResize());
  }

  ngAfterViewInit() {
  }

  override ngOnDestroy() {
    this.removeResizeListeners();
    if (this.windowResizeListener) {
      this.windowResizeListener();
    }
    super.ngOnDestroy();
  }

  onWindowResize() {
    this.updateDragPosition();
    this.cdr.detectChanges();
  }

  // onPortalAttached handled by BaseWindowDirective

  onDragStart(event: CdkDragStart) {
    this.change.emit({ focus: true });
  }

  onDragEnd(event: CdkDragEnd) {
    const element = event.source.getRootElement();
    const rect = element.getBoundingClientRect();
    const ref = this.getReferenceSize();

    if (this.originElement) {
      const originRect = this.originElement.getBoundingClientRect();
      this.x = ((rect.left - originRect.left) / ref.width) * 100;
      this.y = ((rect.top - originRect.top) / ref.height) * 100;
    } else {
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      this.x = ((rect.left + scrollX) / ref.width) * 100;
      this.y = ((rect.top + scrollY) / ref.height) * 100;
    }
    this.updateDragPosition();
  }

  // onWindowClick and closeWindow handled by BaseWindowDirective

  // Resizing logic
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

    this.change.emit({ focus: true });

    this.mouseMoveListener = this.renderer.listen('document', 'mousemove', (e) => this.onResize(e));
    this.mouseUpListener = this.renderer.listen('document', 'mouseup', () => this.stopResize());
  }

  onResize(event: MouseEvent) {
    if (!this.isResizing) return;
    const dxPx = event.clientX - this.startX;
    const dyPx = event.clientY - this.startY;
    const ref = this.getReferenceSize();
    const dxPercent = (dxPx / ref.width) * 100;
    const dyPercent = (dyPx / ref.height) * 100;

    for (const direction of this.resizeDirection) {
      switch (direction) {
        case 'e':
          this.width = Math.max(10, this.startWidth + dxPercent);
          break;
        case 'w':
          this.width = Math.max(10, this.startWidth - dxPercent);
          this.x = this.startXWindow + (this.startWidth - this.width);
          break;
        case 's':
          this.height = Math.max(this.minHeight, this.startHeight + dyPercent);
          break;
        case 'n':
          this.height = Math.max(this.minHeight, this.startHeight - dyPercent);
          this.y = this.startYWindow + (this.startHeight - this.height);
          break;
      }
    }
    this.updateDragPosition();
    this.change.emit({ width: this.width, height: this.height });
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
