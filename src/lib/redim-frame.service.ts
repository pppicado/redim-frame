import { Injectable, ComponentRef, Injector, TemplateRef, Type, InjectionToken } from '@angular/core';
import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal, TemplatePortal, Portal } from '@angular/cdk/portal';
import { FloatingWindowComponent } from './floating-window/floating-window.component';
import { ModalWindowComponent } from './modal-window/modal-window.component';
import { StartWindowConfig } from './redim-frame.interface';
import { BaseWindowDirective } from './base-window.directive';

export const WINDOW_DATA = new InjectionToken<any>('WINDOW_DATA');

@Injectable({
  providedIn: 'root'
})
export class RedimFrameService {
  private zIndexCounter = 1000;

  constructor(private overlay: Overlay, private injector: Injector) { }

  openWindows<T>(componentOrTemplate: Type<T> | TemplateRef<T>, config: StartWindowConfig = {}): ComponentRef<FloatingWindowComponent> {

    // Always use global positioning — we handle placement ourselves
    const positionStrategy = this.overlay.position()
      .global()
      .left('0px')
      .top('0px');

    const overlayConfig = new OverlayConfig({
      positionStrategy,
      hasBackdrop: false,
      scrollStrategy: this.overlay.scrollStrategies.noop()
    });

    const overlayRef = this.overlay.create(overlayConfig);
    const windowPortal = new ComponentPortal(FloatingWindowComponent);
    const windowRef = overlayRef.attach(windowPortal);
    const windowInstance = windowRef.instance;

    windowInstance.width = config.width || 30;
    windowInstance.height = config.height || 30;
    windowInstance.x = config.x || 10;
    windowInstance.y = config.y || 10;
    windowInstance.zIndex = this.zIndexCounter++;
    windowInstance.windowData = config.data;
    windowInstance.scrollIcon = config.scrollIcon || '';
    windowInstance.minHeight = config.minHeight || 10;
    windowInstance.minWidth = config.minWidth || 10;
    windowInstance.resizeBorder = config.resizeBorder || 0.5;
    windowInstance.scrollThumbSize = config.scrollThumbSize || 2;
    windowInstance.zIndex = config.zIndex || this.zIndexCounter++;

    // If origin is provided, reparent overlay into origin and pass originElement
    if (config.origin) {
      windowInstance.originElement = config.origin;
      this.reparentOverlayInto(overlayRef, config.origin);
    }

    // Create Injector for user component data
    const injector = Injector.create({
      parent: this.injector,
      providers: [
        { provide: WINDOW_DATA, useValue: config.data },
        { provide: FloatingWindowComponent, useValue: windowInstance }
      ]
    });

    let userPortal: Portal<any>;

    if (componentOrTemplate instanceof TemplateRef) {
      userPortal = new TemplatePortal(componentOrTemplate, null!, {
        $implicit: config.data
      } as any);
    } else {
      userPortal = new ComponentPortal(componentOrTemplate, null, injector);
    }

    windowInstance.contentPortal = userPortal;

    // Handle Close
    windowInstance.change.subscribe((event) => {
      if (event.close) {
        overlayRef.dispose();
      }
    });

    // Handle Focus (Z-Index)
    windowInstance.change.subscribe((event) => {
      if (event.focus) {
        this.zIndexCounter++;
        windowInstance.zIndex = this.zIndexCounter;
        if (overlayRef.hostElement) {
          overlayRef.hostElement.style.zIndex = `${this.zIndexCounter}`;
        }
      }
    });

    // Initial Z-Index
    if (overlayRef.hostElement) {
      overlayRef.hostElement.style.zIndex = `${windowInstance.zIndex}`;
      // Allow pointer events to pass through overlay container
      overlayRef.hostElement.style.pointerEvents = 'none';
    }

    // Enable pointer events on the overlay pane (the window itself)
    if (overlayRef.overlayElement) {
      overlayRef.overlayElement.style.pointerEvents = 'none'; // Set to none so clicks pass through pane
    }

    return windowRef;
  }

  openModal<T>(componentOrTemplate: Type<T> | TemplateRef<T>, config: StartWindowConfig = {}): ComponentRef<ModalWindowComponent> {
    // Always use global positioning — we handle placement ourselves
    const positionStrategy = this.overlay.position()
      .global()
      .width('100%')
      .height('100%')
      .centerHorizontally()
      .centerVertically();

    const overlayConfig = new OverlayConfig({
      positionStrategy,
      hasBackdrop: false,
      scrollStrategy: this.overlay.scrollStrategies.block()
    });

    const overlayRef = this.overlay.create(overlayConfig);
    const windowPortal = new ComponentPortal(ModalWindowComponent);
    config.origin.
    const windowRef = overlayRef.attach(windowPortal);
    const windowInstance = windowRef.instance;

    windowInstance.width = config.width || 30;
    windowInstance.height = config.height || 30;
    windowInstance.x = config.x || 10;
    windowInstance.y = config.y || 10;
    windowInstance.zIndex = config.zIndex || this.zIndexCounter++;
    windowInstance.windowData = config.data;
    windowInstance.scrollIcon = config.scrollIcon || '';
    windowInstance.minHeight = config.minHeight || 10;
    windowInstance.minWidth = config.minWidth || 10;
    windowInstance.resizeBorder = config.resizeBorder || 0;
    windowInstance.scrollThumbSize = config.scrollThumbSize || 2;

    // If origin is provided, reparent overlay into origin and pass originElement
    if (config.origin) {
      windowInstance.originElement = config.origin;
      this.reparentOverlayInto(overlayRef, config.origin);
    }

    // Create Injector for user component data
    const injector = Injector.create({
      parent: this.injector,
      providers: [
        { provide: WINDOW_DATA, useValue: config.data },
        { provide: ModalWindowComponent, useValue: windowInstance },
        { provide: BaseWindowDirective, useValue: windowInstance }
      ]
    });

    let userPortal: Portal<any>;

    if (componentOrTemplate instanceof TemplateRef) {
      userPortal = new TemplatePortal(componentOrTemplate, null!, {
        $implicit: config.data
      } as any);
    } else {
      userPortal = new ComponentPortal(componentOrTemplate, null, injector);
    }

    windowInstance.contentPortal = userPortal;

    // Handle Close
    windowInstance.change.subscribe((event) => {
      if (event.close) {
        overlayRef.dispose();
      }
    });

    // Handle Focus (Z-Index)
    windowInstance.change.subscribe((event) => {
      if (event.focus) {
        this.zIndexCounter++;
        windowInstance.zIndex = this.zIndexCounter;
        if (overlayRef.hostElement) {
          overlayRef.hostElement.style.zIndex = `${this.zIndexCounter}`;
        }
      }
    });

    // Initial Z-Index
    if (overlayRef.hostElement) {
      overlayRef.hostElement.style.zIndex = `${windowInstance.zIndex}`;
    }

    return windowRef;
  }

  /**
   * Reparents the overlay host element into the given origin container.
   * This makes the overlay render inside the origin instead of the global overlay container.
   */
  private reparentOverlayInto(overlayRef: OverlayRef, origin: HTMLElement): void {
    // Warn if origin is not a positioning context (required for absolute children)
    const computedStyle = getComputedStyle(origin);
    if (computedStyle.position === 'static') {
      console.warn('[RedimFrame] El elemento origin tiene position: static. Se recomienda establecer position: relative para que las ventanas se posicionen correctamente dentro de él.');
    }
    if (computedStyle.overflow === 'visible') {
      console.warn('[RedimFrame] El elemento origin tiene overflow: visible. Se recomienda establecer overflow: hidden para contener visualmente las ventanas.');
    }

    // Move the overlay host inside the origin
    const hostElement = overlayRef.hostElement;
    origin.appendChild(hostElement);

    // Make overlay host fill the origin
    hostElement.style.position = 'absolute';
    hostElement.style.top = '0';
    hostElement.style.left = '0';
    hostElement.style.width = '100%';
    hostElement.style.height = '100%';

    // Also make the overlay pane fill the host
    const overlayPane = overlayRef.overlayElement;
    overlayPane.style.position = 'absolute';
    overlayPane.style.top = '0';
    overlayPane.style.left = '0';
    overlayPane.style.width = '100%';
    overlayPane.style.height = '100%';
  }
}
