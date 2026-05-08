import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { PortalModule } from '@angular/cdk/portal';
import { OverlayModule } from '@angular/cdk/overlay';
import { VirtualScrollbarModule } from '@pppicado/virtual-scrollbar';

import { ModalWindowComponent } from './modal-window.component';

describe('ModalWindowComponent', () => {
  let component: ModalWindowComponent;
  let fixture: ComponentFixture<ModalWindowComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [ModalWindowComponent],
      imports: [DragDropModule, PortalModule, OverlayModule, VirtualScrollbarModule]
    });
    fixture = TestBed.createComponent(ModalWindowComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // =============================================================================
  // Phase 3: Modal window sets --rf_window_width/--rf_window_height on init
  // =============================================================================
  describe('CSS custom properties (Phase 3)', () => {
    it('should have setCssVar method available', () => {
      expect((component as any).setCssVar).toBeDefined();
      expect(typeof (component as any).setCssVar).toBe('function');
    });

    it('should set --rf_window_width and --rf_window_height on init', () => {
      component.width = 0.3;
      component.height = 0.4;
      component.ngOnInit();

      const renderer = (component as any).renderer;
      const setStyleSpy = spyOn(renderer, 'setStyle').and.callThrough();
      component.ngOnInit();

      const calls = setStyleSpy.calls.allArgs();
      const varNames = calls.map((args: any[]) => args[1]);
      expect(varNames).toContain('--rf_window_width');
      expect(varNames).toContain('--rf_window_height');
    });

    it('should set --rf_viewport_x_px and --rf_viewport_y_px for outermost windows on init', () => {
      component.originElement = null;
      component.ngOnInit();

      const renderer = (component as any).renderer;
      const setStyleSpy = spyOn(renderer, 'setStyle').and.callThrough();
      component.ngOnInit(); // re-init to trigger setCssVar calls

      const calls = setStyleSpy.calls.allArgs();
      const varNames = calls.map((args: any[]) => args[1]);
      expect(varNames).toContain('--rf_viewport_x_px');
      expect(varNames).toContain('--rf_viewport_y_px');
    });

    it('should not set viewport CSS vars for child windows (has originElement)', () => {
      const mockOrigin = document.createElement('div');
      component.originElement = mockOrigin;
      component.ngOnInit();

      const renderer = (component as any).renderer;
      const setStyleSpy = spyOn(renderer, 'setStyle').and.callThrough();
      component.ngOnInit();

      const calls = setStyleSpy.calls.allArgs();
      const varNames = calls.map((args: any[]) => args[1]);
      expect(varNames).not.toContain('--rf_viewport_x_px');
      expect(varNames).not.toContain('--rf_viewport_y_px');
    });

    it('should disconnect ResizeObserver on destroy', () => {
      component.originElement = null;
      component.ngOnInit();

      const observer = component['resizeObserver'] as ResizeObserver;
      if (observer) {
        const disconnectSpy = spyOn(observer, 'disconnect');
        component.ngOnDestroy();
        expect(disconnectSpy).toHaveBeenCalled();
      }
    });
  });

  // =============================================================================
  // Phase 3: No HostBindings for width/height/left/top
  // =============================================================================
  describe('No HostBindings for position/size (Phase 3)', () => {
    it('should use setCssVar instead of HostBinding for width/height', () => {
      // The component uses setCssVar via Renderer2, not @HostBinding
      // Verify the component instance has setCssVar method (not a HostBinding getter)
      const componentAny = component as any;
      expect(typeof componentAny.setCssVar).toBe('function');
      // Verify old HostBinding getter 'widthStyle' doesn't exist on the component prototype
      expect((ModalWindowComponent.prototype as any).widthStyle).toBeUndefined();
      expect((ModalWindowComponent.prototype as any).heightStyle).toBeUndefined();
    });
  });

  // =============================================================================
  // Phase 1: Deprecated vw/vh alias conversion (minWidthVw, minHeightVh)
  // =============================================================================
  describe('Deprecated vw/vh aliases (Phase 1)', () => {
    it('should convert minWidthVw (0-100) to decimal fraction for minWidth', () => {
      component.minWidthVw = 20;
      expect(component.minWidth).toBe(0.2);
    });

    it('should convert minHeightVh (0-100) to decimal fraction for minHeight', () => {
      component.minHeightVh = 15;
      expect(component.minHeight).toBe(0.15);
    });

    it('should clamp converted values to [0, 1]', () => {
      component.minWidthVw = 150;
      expect(component.minWidth).toBe(1);
      component.minHeightVh = -50;
      expect(component.minHeight).toBe(0);
    });
  });
});