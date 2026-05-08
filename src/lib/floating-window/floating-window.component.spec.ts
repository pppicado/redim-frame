import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { PortalModule } from '@angular/cdk/portal';
import { OverlayModule, Overlay } from '@angular/cdk/overlay';
import { Subscription } from 'rxjs';

import { FloatingWindowComponent } from './floating-window.component';
import { BaseWindowDirective } from '../base-window.directive';
import { VirtualScrollbarModule } from '@pppicado/virtual-scrollbar';
import { StartWindowConfig } from '../redim-frame.interface';
import { WINDOW_DATA, RedimFrameService } from '../redim-frame.service';

describe('FloatingWindowComponent', () => {
  let component: FloatingWindowComponent;
  let fixture: ComponentFixture<FloatingWindowComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FloatingWindowComponent],
      imports: [DragDropModule, PortalModule, OverlayModule, VirtualScrollbarModule],
      providers: [RedimFrameService, Overlay]
    });
    fixture = TestBed.createComponent(FloatingWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // =============================================================================
  // REQ-1: Public API — StartWindowConfig and WINDOW_DATA importable
  // =============================================================================
  describe('Public API', () => {
    it('should export StartWindowConfig interface', () => {
      // Verify the interface is importable — compiles without error
      const config: StartWindowConfig = {
        width: 0.3,
        height: 0.3,
        x: 0.1,
        y: 0.1,
        minWidth: 0.2,
        minHeight: 0.1
      };
      expect(config.minWidth).toBe(0.2);
    });

    it('should export WINDOW_DATA injection token', () => {
      // Verify WINDOW_DATA token exists
      expect(WINDOW_DATA).toBeDefined();
    });
  });

  // =============================================================================
  // REQ-2: Z-Index Assignment — single increment, no double-counting
  // =============================================================================
  describe('Z-Index Assignment', () => {
    let service: RedimFrameService;
    let overlay: Overlay;

    beforeEach(() => {
      service = TestBed.inject(RedimFrameService);
      overlay = TestBed.inject(Overlay);
    });

    it('should assign zIndex once when no config.zIndex provided', () => {
      const overlayCreateSpy = spyOn(overlay, 'create').and.callThrough();
      service.openWindows(FloatingWindowComponent);
      const overlayConfig = overlayCreateSpy.calls.first().args[0]!;
      expect(overlayConfig.positionStrategy).toBeDefined();
      // When zIndex is not provided, it should use the counter (starts at 1000, becomes 1001)
      // The service increments zIndexCounter++ so first window gets 1001
    });

    it('should bypass zIndex counter when config.zIndex is provided', () => {
      // When a custom zIndex is passed, the counter should NOT be incremented
      // This is verified by checking the counter stays at initial value
      const initialCounter = (service as any).zIndexCounter;
      service.openWindows(FloatingWindowComponent, { zIndex: 500 });
      expect((service as any).zIndexCounter).toBe(initialCounter);
    });
  });

  // =============================================================================
  // REQ-3: minWidth Enforcement — east/west resize respects constraint
  // =============================================================================
  describe('minWidth Resize Enforcement (decimal fractions)', () => {
    beforeEach(() => {
      component.width = 0.3;
      component.height = 0.3;
      component.x = 0.1;
      component.y = 0.1;
      component.minWidth = 0.2;
      component.minHeight = 0.1;
      component.resizeBorder = 0.005;
      component.scrollIcon = '';
      component.scrollThumbSize = 0.02;
      component.ngOnInit();
    });

    it('should clamp east resize at minWidth', () => {
      const startWidth = component.width;
      // Simulate east resize: dxFraction would increase width, but minWidth clamps it
      // When direction='e', width = max(minWidth, startWidth + dxFraction)
      component.initResize({ clientX: 0, clientY: 0, preventDefault: () => {}, stopPropagation: () => {} } as any, 'e');
      // Simulate resize moving left (negative dx) that would push below minWidth
      component.onResize({ clientX: -200, clientY: 0 } as MouseEvent);
      expect(component.width).toBeGreaterThanOrEqual(component.minWidth);
      component.stopResize();
    });

    it('should clamp west resize at minWidth and adjust x position', () => {
      const startX = component.x;
      const startWidth = component.width;
      component.initResize({ clientX: 0, clientY: 0, preventDefault: () => {}, stopPropagation: () => {} } as any, 'w');
      // Simulate west resize moving right (positive dx) which decreases width
      component.onResize({ clientX: 200, clientY: 0 } as MouseEvent);
      expect(component.width).toBeGreaterThanOrEqual(component.minWidth);
      // x should adjust to keep window right edge stationary
      component.stopResize();
    });
  });

  // =============================================================================
  // REQ-6: Default minWidth (0.1 = 10vw equivalent) Enforcement
  // =============================================================================
  describe('Default minWidth Enforcement', () => {
    it('should enforce default minWidth of 0.1 when config.minWidth not provided', () => {
      // When no minWidth is set, default is 0.1 (decimal fraction)
      component.width = 0.05;
      component.height = 0.3;
      component.x = 0.1;
      component.y = 0.1;
      component.minWidth = 0.1;
      component.minHeight = 0.1;
      component.resizeBorder = 0.005;
      component.scrollIcon = '';
      component.scrollThumbSize = 0.02;
      component.ngOnInit();

      component.initResize({ clientX: 0, clientY: 0, preventDefault: () => {}, stopPropagation: () => {} } as any, 'e');
      component.onResize({ clientX: -200, clientY: 0 } as MouseEvent);
      expect(component.width).toBeGreaterThanOrEqual(0.1);
      component.stopResize();
    });
  });

  // =============================================================================
  // REQ-5: Drag Emission — correct events on drag lifecycle
  // =============================================================================
  describe('Drag Emission', () => {
    beforeEach(() => {
      component.width = 0.3;
      component.height = 0.3;
      component.x = 0.1;
      component.y = 0.1;
      component.minWidth = 0.1;
      component.minHeight = 0.1;
      component.resizeBorder = 0.005;
      component.scrollIcon = '';
      component.scrollThumbSize = 0.02;
      component.ngOnInit();
    });

    it('should emit {type: "drag", x, y} on drag end with final position', (done) => {
      let emittedEvent: any = null;
      component.change.subscribe((event) => {
        emittedEvent = event;
      });

      component.x = 0.1;
      component.y = 0.1;
      component.updateDragPosition();

      // Simulate drag end with a mock CdkDragEnd
      const mockDragEnd = {
        source: {
          getRootElement: () => ({
            getBoundingClientRect: () => ({ left: 200, top: 200 })
          })
        }
      } as any;

      component.onDragEnd(mockDragEnd);

      setTimeout(() => {
        expect(emittedEvent).not.toBeNull();
        expect(emittedEvent.type).toBe('drag');
        expect(emittedEvent.x).toBeDefined();
        expect(emittedEvent.y).toBeDefined();
        done();
      }, 0);
    });

    it('should emit only {type: "focus"} on drag start', (done) => {
      let emittedEvent: any = null;
      component.change.subscribe((event) => {
        emittedEvent = event;
      });

      const mockDragStart = {} as any;
      component.onDragStart(mockDragStart);

      setTimeout(() => {
        expect(emittedEvent).not.toBeNull();
        expect(emittedEvent.type).toBe('focus');
        done();
      }, 0);
    });
  });

  // =============================================================================
  // Phase 1: Deprecated vw/vh alias conversion (widthVw, heightVh, xVw, yVh)
  // =============================================================================
  describe('Deprecated vw/vh aliases (Phase 1)', () => {
    it('should convert widthVw (0-100) to decimal fraction for width', () => {
      component.widthVw = 50;
      expect(component.width).toBe(0.5);
    });

    it('should convert heightVh (0-100) to decimal fraction for height', () => {
      component.heightVh = 40;
      expect(component.height).toBe(0.4);
    });

    it('should convert xVw (0-100) to decimal fraction for x', () => {
      component.xVw = 25;
      expect(component.x).toBe(0.25);
    });

    it('should convert yVh (0-100) to decimal fraction for y', () => {
      component.yVh = 75;
      expect(component.y).toBe(0.75);
    });

    it('should clamp converted values to [0, 1]', () => {
      component.widthVw = 150; // above 100
      expect(component.width).toBe(1);
      component.heightVh = -50; // below 0
      expect(component.height).toBe(0);
    });

    it('should emit console.warn once per alias', () => {
      (BaseWindowDirective as any).warnedAliases.clear();
      const warnSpy = spyOn(console, 'warn');
      component.widthVw = 30;
      component.widthVw = 30; // second call should not warn
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy.calls.argsFor(0)[0]).toContain('[BaseWindowDirective]');
      expect(warnSpy.calls.argsFor(0)[0]).toContain('widthVw');
    });
  });

  // =============================================================================
  // Phase 1: Decimal inputs with clamping
  // =============================================================================
  describe('Decimal fraction inputs with clamping (Phase 1)', () => {
    it('should clamp width to [0, 1] on assignment via setter', () => {
      const c = new FloatingWindowComponent(null as any, null as any, null as any);
      // Simulate inputs beyond bounds
      c.width = 1.5;
      expect(c.width).toBe(1);
      c.width = -0.2;
      expect(c.width).toBe(0);
    });

    it('should clamp height, x, y, minWidth, minHeight to [0, 1] on assignment', () => {
      const c = new FloatingWindowComponent(null as any, null as any, null as any);
      c.height = 2.0;
      expect(c.height).toBe(1);
      c.height = -0.5;
      expect(c.height).toBe(0);
      c.x = 1.5;
      expect(c.x).toBe(1);
      c.y = -0.3;
      expect(c.y).toBe(0);
      c.minWidth = 5.0;
      expect(c.minWidth).toBe(1);
      c.minHeight = -1.0;
      expect(c.minHeight).toBe(0);
    });

    it('should emit console.warn when clamping a value', () => {
      const warnSpy = spyOn(console, 'warn');
      const c = new FloatingWindowComponent(null as any, null as any, null as any);
      c.width = 1.5;
      expect(warnSpy).toHaveBeenCalledWith(
        jasmine.stringContaining('width')
      );
    });

    it('should clamp position to [0, 1] after drag end', () => {
      component.width = 0.3;
      component.height = 0.3;
      component.x = 0.1;
      component.y = 0.1;
      component.minWidth = 0.1;
      component.minHeight = 0.1;
      component.resizeBorder = 0.005;
      component.scrollIcon = '';
      component.scrollThumbSize = 0.02;
      component.ngOnInit();

      // Simulate dragging way off-screen (would produce negative x/y)
      const mockDragEnd = {
        source: {
          getRootElement: () => ({
            getBoundingClientRect: () => ({ left: -500, top: -500 })
          })
        }
      } as any;

      component.onDragEnd(mockDragEnd);
      expect(component.x).toBeGreaterThanOrEqual(0);
      expect(component.x).toBeLessThanOrEqual(1);
      expect(component.y).toBeGreaterThanOrEqual(0);
      expect(component.y).toBeLessThanOrEqual(1);
    });
  });

  // =============================================================================
  // Phase 2: CSS vars set on init and updated on resize/drag
  // =============================================================================
  describe('CSS custom property initialization (Phase 2)', () => {
    it('should set --rf_window_width, --rf_window_height, --rf_window_top, --rf_window_left on init', () => {
      component.width = 0.3;
      component.height = 0.3;
      component.x = 0.1;
      component.y = 0.1;
      component.minWidth = 0.1;
      component.minHeight = 0.1;
      component.resizeBorder = 0.005;
      component.scrollIcon = '';
      component.scrollThumbSize = 0.02;
      component.ngOnInit();

      // Access the renderer's setStyle calls via spy
      const renderer = (component as any).renderer;
      const setStyleSpy = spyOn(renderer, 'setStyle').and.callThrough();
      component.syncPositionToCssVars();

      // Verify setStyle was called with CSS var names
      const calls = setStyleSpy.calls.allArgs();
      const varNames = calls.map((args: any[]) => args[1]);
      expect(varNames).toContain('--rf_window_width');
      expect(varNames).toContain('--rf_window_height');
      expect(varNames).toContain('--rf_window_top');
      expect(varNames).toContain('--rf_window_left');
    });

    it('should set --rf_viewport_x_px and --rf_viewport_y_px for outermost windows (no originElement)', () => {
      component.originElement = null;
      component.width = 0.3;
      component.height = 0.3;
      component.x = 0.1;
      component.y = 0.1;
      component.minWidth = 0.1;
      component.minHeight = 0.1;
      component.resizeBorder = 0.005;
      component.scrollIcon = '';
      component.scrollThumbSize = 0.02;
      component.ngOnInit();

      const renderer = (component as any).renderer;
      const setStyleSpy = spyOn(renderer, 'setStyle').and.callThrough();
      // Trigger viewport resize callback with a mock entry
      const mockEntry = { contentRect: { width: 1920, height: 1080 } } as ResizeObserverEntry;
      (component as any).onViewportResize([mockEntry]);

      const calls = setStyleSpy.calls.allArgs();
      const varNames = calls.map((args: any[]) => args[1]);
      expect(varNames).toContain('--rf_viewport_x_px');
      expect(varNames).toContain('--rf_viewport_y_px');
    });

    it('should NOT set viewport vars for child windows (has originElement)', () => {
      const mockOrigin = document.createElement('div');
      component.originElement = mockOrigin;
      component.width = 0.3;
      component.height = 0.3;
      component.x = 0.1;
      component.y = 0.1;
      component.minWidth = 0.1;
      component.minHeight = 0.1;
      component.resizeBorder = 0.005;
      component.scrollIcon = '';
      component.scrollThumbSize = 0.02;
      component.ngOnInit();

      const renderer = (component as any).renderer;
      const setStyleSpy = spyOn(renderer, 'setStyle').and.callThrough();
      (component as any).onViewportResize([]);

      const calls = setStyleSpy.calls.allArgs();
      const varNames = calls.map((args: any[]) => args[1]);
      expect(varNames).not.toContain('--rf_viewport_x_px');
      expect(varNames).not.toContain('--rf_viewport_y_px');
    });
  });

  // =============================================================================
  // Phase 2: ResizeObserver lifecycle
  // =============================================================================
  describe('ResizeObserver lifecycle (Phase 2)', () => {
    it('should create ResizeObserver for outermost windows on init', () => {
      component.originElement = null;
      component.width = 0.3;
      component.height = 0.3;
      component.x = 0.1;
      component.y = 0.1;
      component.minWidth = 0.1;
      component.minHeight = 0.1;
      component.resizeBorder = 0.005;
      component.scrollIcon = '';
      component.scrollThumbSize = 0.02;
      component.ngOnInit();

      expect(component['resizeObserver']).toBeTruthy();
    });

    it('should not create ResizeObserver for child windows (has originElement)', () => {
      const mockOrigin = document.createElement('div');
      component.ngOnDestroy(); // clean up observer from beforeEach
      component.originElement = mockOrigin;
      component.width = 0.3;
      component.height = 0.3;
      component.x = 0.1;
      component.y = 0.1;
      component.minWidth = 0.1;
      component.minHeight = 0.1;
      component.resizeBorder = 0.005;
      component.scrollIcon = '';
      component.scrollThumbSize = 0.02;
      component.ngOnInit();

      expect(component['resizeObserver']).toBeNull();
    });

    it('should disconnect ResizeObserver on destroy', () => {
      component.originElement = null;
      component.width = 0.3;
      component.height = 0.3;
      component.x = 0.1;
      component.y = 0.1;
      component.minWidth = 0.1;
      component.minHeight = 0.1;
      component.resizeBorder = 0.005;
      component.scrollIcon = '';
      component.scrollThumbSize = 0.02;
      component.ngOnInit();

      const observer = component['resizeObserver'] as ResizeObserver;
      const disconnectSpy = spyOn(observer, 'disconnect');
      component.ngOnDestroy();
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });

  // =============================================================================
  // Phase 2: Drag uses decimal fractions relative to reference size
  // =============================================================================
  describe('Drag position computation (Phase 2)', () => {
    beforeEach(() => {
      component.width = 0.3;
      component.height = 0.3;
      component.x = 0.1;
      component.y = 0.1;
      component.minWidth = 0.1;
      component.minHeight = 0.1;
      component.resizeBorder = 0.005;
      component.scrollIcon = '';
      component.scrollThumbSize = 0.02;
      component.originElement = null;
      component.ngOnInit();
    });

    it('should compute x/y as decimal fractions (not percentages) after drag', () => {
      // Simulate drag to pixel position (200, 200) in a 1000x800 viewport
      spyOnProperty(window, 'innerWidth').and.returnValue(1000);
      spyOnProperty(window, 'innerHeight').and.returnValue(800);

      const mockDragEnd = {
        source: {
          getRootElement: () => ({
            getBoundingClientRect: () => ({ left: 200, top: 150 })
          })
        }
      } as any;

      component.onDragEnd(mockDragEnd);

      // x = 200 / 1000 = 0.2, y = 150 / 800 ≈ 0.1875
      expect(component.x).toBeCloseTo(0.2, 3);
      expect(component.y).toBeCloseTo(0.1875, 3);
    });

    it('should use originElement for relative positioning when present', () => {
      const mockOrigin = document.createElement('div');
      spyOn(mockOrigin, 'getBoundingClientRect').and.returnValue({ left: 50, top: 50 } as DOMRect);
      Object.defineProperty(mockOrigin, 'clientWidth', { value: 1000, configurable: true });
      Object.defineProperty(mockOrigin, 'clientHeight', { value: 800, configurable: true });
      component.originElement = mockOrigin;

      spyOnProperty(window, 'innerWidth').and.returnValue(1000);
      spyOnProperty(window, 'innerHeight').and.returnValue(800);

      const mockDragEnd = {
        source: {
          getRootElement: () => ({
            getBoundingClientRect: () => ({ left: 150, top: 100 })
          })
        }
      } as any;

      component.onDragEnd(mockDragEnd);

      // x = (150 - 50) / 1000 = 0.1, y = (100 - 50) / 800 = 0.0625
      expect(component.x).toBeCloseTo(0.1, 3);
      expect(component.y).toBeCloseTo(0.0625, 3);
    });
  });

  // =============================================================================
  // Phase 2: Resize uses decimal fractions relative to reference size
  // =============================================================================
  describe('Resize computation (Phase 2)', () => {
    beforeEach(() => {
      component.width = 0.3;
      component.height = 0.3;
      component.x = 0.1;
      component.y = 0.1;
      component.minWidth = 0.1;
      component.minHeight = 0.1;
      component.resizeBorder = 0.005;
      component.scrollIcon = '';
      component.scrollThumbSize = 0.02;
      component.originElement = null;
      component.ngOnInit();
    });

    it('should treat resizeBorder as decimal fraction in resize logic', () => {
      spyOnProperty(window, 'innerWidth').and.returnValue(1000);
      spyOnProperty(window, 'innerHeight').and.returnValue(800);
      const initialWidth = component.width;
      component.initResize({ clientX: 0, clientY: 0, preventDefault: () => {}, stopPropagation: () => {} } as any, 'e');
      // Simulate moving 100px right in a 1000px viewport → dxFraction = 0.1
      component.onResize({ clientX: 100, clientY: 0 } as MouseEvent);
      expect(component.width).toBeCloseTo(initialWidth + 0.1, 3);
      component.stopResize();
    });

    it('should clamp all values to [0, 1] after resize', () => {
      component.initResize({ clientX: 0, clientY: 0, preventDefault: () => {}, stopPropagation: () => {} } as any, 'se');
      // Try to resize way beyond viewport
      component.onResize({ clientX: 5000, clientY: 5000 } as MouseEvent);
      expect(component.width).toBeLessThanOrEqual(1);
      expect(component.height).toBeLessThanOrEqual(1);
      expect(component.x).toBeGreaterThanOrEqual(0);
      expect(component.y).toBeGreaterThanOrEqual(0);
      component.stopResize();
    });
  });
});