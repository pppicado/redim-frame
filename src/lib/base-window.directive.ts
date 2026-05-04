import { Directive, EventEmitter, Input, Output, OnDestroy, ComponentRef } from '@angular/core';
import { Portal, CdkPortalOutletAttachedRef } from '@angular/cdk/portal';
import { WindowChangeEvent } from './redim-frame.interface';
@Directive({
  selector: '[libBaseWindow]'
})
export class BaseWindowDirective implements OnDestroy {
  @Input() width: number = 30; // Default 30vw
  @Input() height: number = 30; // Default 30vh
  @Input() x: number = 10; // Default 10vw
  @Input() y: number = 10; // Default 10vh
  @Input() zIndex: number = 1000;
  @Input() contentPortal: Portal<any> | null = null;
  @Input() windowData: any = null;

  @Input() resizeBorder: number = 0.5; // Default 0.5vw
  @Input() minWidth: number = 10; // Default 10vw
  @Input() minHeight: number = 10; // Default 10vh

  @Input() scrollIcon: string = '';
  @Input() scrollThumbSize: number = 2; // Default 2vw
  @Input() originElement: HTMLElement | null = null;

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
        try {
          ref.setInput(key, this.windowData[key]);
        } catch {
          // Input doesn't exist on component — skip silently
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
