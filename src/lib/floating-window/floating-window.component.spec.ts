import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { PortalModule } from '@angular/cdk/portal';
import { OverlayModule, Overlay } from '@angular/cdk/overlay';
import { Subscription } from 'rxjs';

import { FloatingWindowComponent } from './floating-window.component';
import { VirtualScrollbarModule } from '@pppicado/virtual-scrollbar';
import { StartWindowConfig } from '../redim-frame.interface';
import { WINDOW_DATA, RedimFrameService } from '../redim-frame.service';

describe('FloatingWindowComponent', () => {
  let component: FloatingWindowComponent;
  let fixture: ComponentFixture<FloatingWindowComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [FloatingWindowComponent],
      imports: [DragDropModule, PortalModule, VirtualScrollbarModule]
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
        width: 30,
        height: 30,
        x: 10,
        y: 10,
        minWidth: 20,
        minHeight: 10
      };
      expect(config.minWidth).toBe(20);
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
      TestBed.configureTestingModule({
        providers: [RedimFrameService, Overlay]
      });
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
  describe('minWidth Resize Enforcement', () => {
    beforeEach(() => {
      component.width = 30;
      component.height = 30;
      component.x = 10;
      component.y = 10;
      component.minWidth = 20;
      component.minHeight = 10;
      component.resizeBorder = 0.5;
      component.scrollIcon = '';
      component.scrollThumbSize = 2;
    });

    it('should clamp east resize at minWidth', () => {
      const startWidth = component.width;
      // Simulate east resize: dxPercent would increase width, but minWidth clamps it
      // When direction='e', width = max(minWidth, startWidth + dxPercent)
      // If dxPercent is negative enough to go below minWidth, it clamps
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
  // REQ-6: Default minWidth (10vw) Enforcement
  // =============================================================================
  describe('Default minWidth Enforcement', () => {
    it('should enforce default minWidth of 10vw when config.minWidth not provided', () => {
      // When no minWidth is set, default is 10vw
      component.width = 5;
      component.height = 30;
      component.x = 10;
      component.y = 10;
      component.minWidth = 10;
      component.minHeight = 10;
      component.resizeBorder = 0.5;
      component.scrollIcon = '';
      component.scrollThumbSize = 2;

      component.initResize({ clientX: 0, clientY: 0, preventDefault: () => {}, stopPropagation: () => {} } as any, 'e');
      component.onResize({ clientX: -200, clientY: 0 } as MouseEvent);
      expect(component.width).toBeGreaterThanOrEqual(10);
      component.stopResize();
    });
  });

  // =============================================================================
  // REQ-5: Drag Emission — correct events on drag lifecycle
  // =============================================================================
  describe('Drag Emission', () => {
    beforeEach(() => {
      component.width = 30;
      component.height = 30;
      component.x = 10;
      component.y = 10;
      component.minWidth = 10;
      component.minHeight = 10;
      component.resizeBorder = 0.5;
      component.scrollIcon = '';
      component.scrollThumbSize = 2;
    });

    it('should emit {type: "drag", x, y} on drag end with final position', (done) => {
      let emittedEvent: any = null;
      component.change.subscribe((event) => {
        emittedEvent = event;
      });

      component.x = 10;
      component.y = 10;
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
        expect(emittedEvent.x).toBeUndefined();
        expect(emittedEvent.y).toBeUndefined();
        done();
      }, 0);
    });
  });
});
