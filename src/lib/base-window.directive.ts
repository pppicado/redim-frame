import { Directive, EventEmitter, Input, Output, OnDestroy, ComponentRef } from '@angular/core';
import { Portal, CdkPortalOutletAttachedRef } from '@angular/cdk/portal';
import { reflectComponentType } from '@angular/core';
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

  @Output() change = new EventEmitter<{
    width?: number,
    height?: number,
    x?: number,
    y?: number,
    focus?: boolean,
    close?: boolean,
    zIndex?: number
  }>();

  ngOnDestroy() {
    // Override if needed in subclasses
  }

  onPortalAttached(ref: CdkPortalOutletAttachedRef) {
    if (ref instanceof ComponentRef && this.windowData) {
      const mirror = reflectComponentType(ref.componentType);
      if (mirror) {
        Object.keys(this.windowData).forEach(key => {
          if (mirror.inputs.some(input => input.propName === key)) {
            ref.setInput(key, this.windowData[key]);
          }
        });
      }
    }
  }

  onWindowClick() {
    this.change.emit({ focus: true });
  }

  closeWindow() {
    this.change.emit({ close: true });
  }
}
