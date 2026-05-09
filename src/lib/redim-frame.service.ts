import { Injectable, ComponentRef, Injector, TemplateRef, Type, InjectionToken } from '@angular/core';
import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal, TemplatePortal, Portal } from '@angular/cdk/portal';
import { Subscription } from 'rxjs';
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
  private zIndexPool: number[] = [];
  private windowRegistry = new WeakMap<ComponentRef<any>, { overlayRef: OverlayRef, subs: Subscription[] }>();
  private childOverlays = new Map<Element, OverlayRef[]>();

  constructor(private overlay: Overlay, private injector: Injector) { }

  private acquireZIndex(preferred?: number): number {
    if (preferred != null) return preferred;
    return this.zIndexPool.pop() ?? this.zIndexCounter++;
  }

  private releaseZIndex(z: number): void {
    this.zIndexPool.push(z);
    this.zIndexPool.sort((a, b) => b - a);
  }

  private setupWindow(
    windowInstance: BaseWindowDirective,
    config: StartWindowConfig,
    overlayRef: OverlayRef
  ): Subscription[] {
    windowInstance.width = config.width ?? 0.3;
    windowInstance.height = config.height ?? 0.3;
    windowInstance.x = config.x ?? 0.1;
    windowInstance.y = config.y ?? 0.1;
    windowInstance.zIndex = this.acquireZIndex(config.zIndex);
    windowInstance.windowData = config.data;
    windowInstance.scrollIcon = config.scrollIcon ?? '';
    windowInstance.minHeight = config.minHeight ?? 0.1;
    windowInstance.minWidth = config.minWidth ?? 0.1;
    windowInstance.resizeBorder = config.resizeBorder ?? 0.005;
    windowInstance.scrollThumbSize = config.scrollThumbSize ?? 0.02;

    if (config.origin) {
      windowInstance.originElement = config.origin;
      this.reparentOverlayInto(overlayRef, config.origin);
    }

    const subs = this.setupSubscriptions(windowInstance, overlayRef);

    if (overlayRef.hostElement) {
      overlayRef.hostElement.style.zIndex = `${windowInstance.zIndex}`;
      overlayRef.hostElement.style.pointerEvents = 'none';
    }

    if (overlayRef.overlayElement) {
      overlayRef.overlayElement.style.pointerEvents = 'none';
    }

    return subs;
  }

  private setupSubscriptions(windowInstance: BaseWindowDirective, overlayRef: OverlayRef): Subscription[] {
    const subs: Subscription[] = [
      windowInstance.change.subscribe((event) => {
        if (event.type === 'close') {
          this.releaseZIndex(windowInstance.zIndex);
          subs.forEach(s => s.unsubscribe());
          const originEl = windowInstance.originElement;
          if (originEl && this.childOverlays.has(originEl)) {
            this.childOverlays.get(originEl)!.forEach(c => c.dispose());
            this.childOverlays.delete(originEl);
          }
          overlayRef.dispose();
        }
      }),
      windowInstance.change.subscribe((event) => {
        if (event.type === 'focus') {
          this.zIndexCounter++;
          windowInstance.zIndex = this.zIndexCounter;
          if (overlayRef.hostElement) {
            overlayRef.hostElement.style.zIndex = `${this.zIndexCounter}`;
          }
        }
      })
    ];
    return subs;
  }

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

    const subs = this.setupWindow(windowInstance, config, overlayRef);

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

    // Register window for programmatic close
    this.windowRegistry.set(windowRef, { overlayRef, subs });

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
      hasBackdrop: config.hasBackdrop ?? true,
      scrollStrategy: this.overlay.scrollStrategies.block()
    });

    const overlayRef = this.overlay.create(overlayConfig);
    const windowPortal = new ComponentPortal(ModalWindowComponent);
    const windowRef = overlayRef.attach(windowPortal);
    const windowInstance = windowRef.instance;

    // Override resizeBorder for modal (default 0 instead of 0.5)
    config.resizeBorder = config.resizeBorder ?? 0;

    const subs = this.setupWindow(windowInstance, config, overlayRef);

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

    // Register window for programmatic close
    this.windowRegistry.set(windowRef, { overlayRef, subs });

    return windowRef;
  }

  /**
   * Reparents the overlay host element into the given origin container.
   * This makes the overlay render inside the origin instead of the global overlay container.
   * 
   * ES: Reubica el elemento host del overlay dentro del contenedor de origen dado.
   * Esto hace que el overlay se renderice dentro del origen en lugar del contenedor global de overlay.
   */
  private reparentOverlayInto(overlayRef: OverlayRef, origin: HTMLElement): void {
    // Move the overlay host inside the origin
    const hostElement = overlayRef.hostElement;
    origin.appendChild(hostElement);

    // Track child overlay under the PARENT's hostElement.
    // The parent's hostElement contains a .window-container child — that's the
    // reparented overlay we just appended into.
    const parentHost = hostElement.closest('.window-container')?.closest('.cdk-overlay-container')
      ?? origin;

    // Track this child overlay under the origin (which IS the parent's overlay pane)
    const existing = this.childOverlays.get(origin) || [];
    existing.push(overlayRef);
    this.childOverlays.set(origin, existing);

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

  /**
   * Closes a window programmatically and cleans up all its resources.
   * 
   * ES: Cierra una ventana programáticamente y limpia todos sus recursos.
   */
  closeWindow(componentRef: ComponentRef<any>): void {
    const entry = this.windowRegistry.get(componentRef);
    if (entry) {
      // Close child overlays reparented into this window's host element.
      // Child overlays are stored under the origin element passed to reparentOverlayInto.
      const originEl = componentRef.instance.originElement as HTMLElement | null;
      if (originEl && this.childOverlays.has(originEl)) {
        const children = this.childOverlays.get(originEl)!;
        children.forEach(childRef => childRef.dispose());
        this.childOverlays.delete(originEl);
      }

      // Clean up subscriptions and dispose overlay
      entry.subs.forEach(s => s.unsubscribe());
      entry.overlayRef.dispose();
    }
  }
}
