import { Component, HostBinding, Input, Renderer2, OnDestroy, OnInit, ChangeDetectorRef, ElementRef } from '@angular/core';
import { CdkDragEnd, CdkDragStart } from '@angular/cdk/drag-drop';
import { BaseWindowDirective } from '../base-window.directive';
import { DragContext } from '../redim-frame.interface';

@Component({
  selector: 'redim-floating-window',
  templateUrl: './floating-window.component.html',
  styleUrls: ['./floating-window.component.css']
})
export class FloatingWindowComponent extends BaseWindowDirective implements OnInit, OnDestroy {

  @Input() resizeBorder: string = this.config.resizeBorder;
  @HostBinding('style.--rf_window_resize_border') get resizeBorderCssVar() { return this.resizeBorder; }

  private isResizing: boolean = false;
  private resizeDirection: string = '';
  private unlistenMouseMove?: () => void;
  private unlistenMouseUp?: () => void;

  get windowDrag(): { x: number; y: number } {
    return { x: this.unit.pixels.rect.x, y: this.unit.pixels.rect.y };
  }

  private resizeDrag: DragContext = new DragContext();

  constructor(renderer: Renderer2, elementRef: ElementRef, cdr: ChangeDetectorRef) { super(renderer, elementRef, cdr) }

  onDragStart(event: CdkDragStart) { this.change.emit({ type: 'focus' }); }

  onDragEnd(event: CdkDragEnd) {
    this.unit.pixels.rect.x += event.distance.x;
    this.unit.pixels.rect.y += event.distance.y;
    this.setCssRect();
    event.source._dragRef.reset();
    this.change.emit({ type: 'drag' });
    this.cdr.detectChanges();
  }

  // Resizing logic
  initResize(event: MouseEvent, direction: string) {
    event.preventDefault();
    event.stopPropagation();

    this.isResizing = true;
    this.resizeDirection = direction;

    this.resizeDrag.startX = event.clientX;
    this.resizeDrag.startY = event.clientY;
    this.resizeDrag.x = this.unit.pixels.rect.x;
    this.resizeDrag.y = this.unit.pixels.rect.y;
    this.resizeDrag.width = this.unit.pixels.rect.width;
    this.resizeDrag.height = this.unit.pixels.rect.height;

    if (this.unlistenMouseMove) this.unlistenMouseMove();
    this.unlistenMouseMove = this.renderer.listen('document', 'mousemove', (e) => this.onResize(e));

    if (this.unlistenMouseUp) this.unlistenMouseUp();
    this.unlistenMouseUp = this.renderer.listen('document', 'mouseup', () => this.stopResize());

    this.change.emit({ type: 'focus' });
  }

  onResize(event: MouseEvent) {
    if (!this.isResizing) return;

    this.resizeDrag.dragX = event.clientX;
    this.resizeDrag.dragY = event.clientY;

    for (const direction of this.resizeDirection) {
      switch (direction) {
        case 'e':
          this.unit.pixels.rect.width = this.resizeDrag.width + this.resizeDrag.diffX;
          this.unit.pixels.rect.x = this.resizeDrag.x;
          break;
        case 'w':
          this.unit.pixels.rect.width = this.resizeDrag.width - this.resizeDrag.diffX;
          this.unit.pixels.rect.x = this.resizeDrag.x + this.resizeDrag.diffX;
          break;
        case 'n':
          this.unit.pixels.rect.height = this.resizeDrag.height - this.resizeDrag.diffY;
          this.unit.pixels.rect.y = this.resizeDrag.y + this.resizeDrag.diffY;
          break;
        case 's':
          this.unit.pixels.rect.height = this.resizeDrag.height + this.resizeDrag.diffY;
          this.unit.pixels.rect.y = this.resizeDrag.y;
          break;
      }
    }
    this.setCssRect();

    this.change.emit({ type: 'resize' });

  }

  stopResize() {
    this.isResizing = false;
    this.removeResizeListeners();
    this.cdr.detectChanges();
  }

  private removeResizeListeners() {
    if (this.unlistenMouseMove) {
      this.unlistenMouseMove();
      this.unlistenMouseMove = undefined;
    }
    if (this.unlistenMouseUp) {
      this.unlistenMouseUp();
      this.unlistenMouseUp = undefined;
    }
  }
}
