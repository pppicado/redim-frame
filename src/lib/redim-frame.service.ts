import { Injectable, ComponentRef, Injector, TemplateRef, Type, InjectionToken } from '@angular/core';
import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal, TemplatePortal, Portal } from '@angular/cdk/portal';
import { Subscription } from 'rxjs';
import { FloatingWindowComponent } from './floating-window/floating-window.component';
import { ModalWindowComponent } from './modal-window/modal-window.component';
import { StartWindowConfig, WindowConfig } from './redim-frame.interface';
import { BaseWindowDirective } from './base-window.directive';

export const WINDOW_DATA = new InjectionToken<any>('WINDOW_DATA');

@Injectable({
  providedIn: 'root'
})
export class RedimFrameService {

  private windowRegistry = new WeakMap<ComponentRef<any>, { overlayRef: OverlayRef, subs: Subscription[] }>();
  private childOverlays = new Map<Element, OverlayRef[]>();

  constructor(private overlay: Overlay, private injector: Injector) { }

  /* Z-INDEX MANAGEMENT */
  private zIndexCounter = 1000;
  private zIndexPool: number[] = [];
  private acquireZIndex(preferred?: number): number {
    if (preferred != null) return preferred;
    return this.zIndexPool.pop() ?? this.zIndexCounter++;
  }
  private releaseZIndex(z: number): void {
    this.zIndexPool.push(z);
    this.zIndexPool.sort((a, b) => b - a);
  }

  private setupWindow(windowInstance: BaseWindowDirective, overlayRef: OverlayRef, config?: StartWindowConfig): Subscription[] {
    if (config) windowInstance.config = new WindowConfig(config);
    if (windowInstance.originElement) this.reparentOverlayInto(overlayRef, windowInstance.originElement);
    if (overlayRef.hostElement) { overlayRef.hostElement.style.zIndex = `${windowInstance.zIndex}`; }
    if (overlayRef.overlayElement) { overlayRef.overlayElement.style.pointerEvents = 'none'; }
    if (overlayRef.hostElement) { overlayRef.hostElement.style.pointerEvents = 'none'; }

    return this.setupSubscriptions(windowInstance, overlayRef);
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
          if (overlayRef.hostElement) { overlayRef.hostElement.style.zIndex = `${this.zIndexCounter}` }
        }
      })
    ];
    return subs;
  }

  openWindows<T>(type: 'modal' | 'window', componentOrTemplate: Type<T> | TemplateRef<T>, config?: StartWindowConfig): ComponentRef<FloatingWindowComponent> {
    const positionStrategy = (type === 'window') ? this.overlay.position().global().left('0px').top('0px') : this.overlay.position().global().centerHorizontally().centerVertically();
    const overlayConfig = (type === 'window') ? new OverlayConfig({
      positionStrategy: positionStrategy,
      hasBackdrop: false,
      scrollStrategy: this.overlay.scrollStrategies.noop()
    }) : new OverlayConfig({
      width: '100%',
      height: '100%',
      positionStrategy,
      hasBackdrop: config?.hasBackdrop ?? true,
      scrollStrategy: this.overlay.scrollStrategies.block()
    });

    const overlayRef = this.overlay.create(overlayConfig);
    const windowPortal = new ComponentPortal(FloatingWindowComponent);
    const windowRef = overlayRef.attach(windowPortal);
    const windowInstance = windowRef.instance;

    const subs = this.setupWindow(windowInstance, overlayRef, config);


    let providers = [
      { provide: WINDOW_DATA, useValue: config?.windowData },
      { provide: BaseWindowDirective, useValue: windowInstance },

    ];

    if (type === 'window') {
      providers.push({ provide: FloatingWindowComponent, useValue: windowInstance });
    } else {
      providers.push({ provide: ModalWindowComponent, useValue: windowInstance });
    }

    // Create Injector for user component data
    const injector = Injector.create({
      parent: this.injector,
      providers: providers
    });

    let userPortal: Portal<any>;

    if (componentOrTemplate instanceof TemplateRef) {
      userPortal = new TemplatePortal(componentOrTemplate, null!, {
        $implicit: config?.windowData
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
   */
  private reparentOverlayInto(overlayRef: OverlayRef, origin: HTMLElement): void {

    origin.appendChild(overlayRef.hostElement);

    const existing = this.childOverlays.get(origin) || [];
    existing.push(overlayRef);
    this.childOverlays.set(origin, existing);

    const styleElement = (element: HTMLElement) => {
      element.style.position = 'absolute';
      element.style.top = '0';
      element.style.left = '0';
      element.style.width = '100%';
      element.style.height = '100%';
    };

    styleElement(overlayRef.hostElement);
    styleElement(overlayRef.overlayElement);
  }

  /**
   * Closes a window programmatically and cleans up all its resources.
   */
  closeWindow(componentRef: ComponentRef<any>): void {
    const entry = this.windowRegistry.get(componentRef);
    if (entry) {
      const originEl = componentRef.instance.originElement as HTMLElement | null;
      if (originEl && this.childOverlays.has(originEl)) {
        const children = this.childOverlays.get(originEl)!;
        children.forEach(childRef => childRef.dispose());
        this.childOverlays.delete(originEl);
      }
      entry.subs.forEach(s => s.unsubscribe());
      entry.overlayRef.dispose();

      this.windowRegistry.delete(componentRef);

    }
  }
}
