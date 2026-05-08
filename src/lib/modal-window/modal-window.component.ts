import { Component, ElementRef, Renderer2 } from '@angular/core';
import { BaseWindowDirective } from '../base-window.directive';

@Component({
  selector: 'redim-modal-window',
  templateUrl: './modal-window.component.html',
  styleUrls: ['./modal-window.component.css']
})
export class ModalWindowComponent extends BaseWindowDirective {

  private setCssVar(name: string, value: string) {
    this.renderer.setStyle(this.elementRef.nativeElement, name, value);
  }

  private resizeObserver: ResizeObserver | null = null;

  constructor(private renderer: Renderer2, private elementRef: ElementRef) {
    super();
  }

  ngOnInit() {
    // Set viewport-origin vars only for outermost windows (no originElement)
    if (!this.originElement) {
      this.setCssVar('--rf_viewport_x_px', window.innerWidth + 'px');
      this.setCssVar('--rf_viewport_y_px', window.innerHeight + 'px');
      this.resizeObserver = new ResizeObserver((entries) => this.onViewportResize(entries));
      this.resizeObserver.observe(document.documentElement);
    }
    this.setCssVar('--rf_window_width', this.width.toString());
    this.setCssVar('--rf_window_height', this.height.toString());
  }

  private onViewportResize(entries?: ResizeObserverEntry[]) {
    const entry = entries?.[0];
    if (!this.originElement && entry) {
      this.setCssVar('--rf_viewport_x_px', entry.contentRect.width + 'px');
      this.setCssVar('--rf_viewport_y_px', entry.contentRect.height + 'px');
    }
  }

  override ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    super.ngOnDestroy();
  }
}