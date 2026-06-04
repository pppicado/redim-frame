import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Component, ComponentRef, Injector, TemplateRef, ViewChild, ViewContainerRef } from '@angular/core';
import { Overlay, OverlayRef, OverlayModule } from '@angular/cdk/overlay';
import { PortalModule, TemplatePortal, ComponentPortal } from '@angular/cdk/portal';
import { CommonModule } from '@angular/common';

import { RedimFrameService, WINDOW_DATA } from './redim-frame.service';
import { FloatingWindowComponent } from './floating-window/floating-window.component';
import { ModalWindowComponent } from './modal-window/modal-window.component';
import { BaseWindowDirective } from './base-window.directive';
import { WindowConfig } from './redim-frame.interface';

@Component({ selector: 'lib-host', template: `<ng-template #tpl>static content</ng-template>` })
class HostFixture {
    @ViewChild('tpl', { static: true }) tpl!: TemplateRef<any>;
}

@Component({ selector: 'lib-content', template: `<p>content</p>` })
class ContentFixture {}

describe('RedimFrameService', () => {
    let service: RedimFrameService;
    let hostFixture: ComponentFixture<HostFixture>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [CommonModule, OverlayModule, PortalModule],
            declarations: [HostFixture, ContentFixture, FloatingWindowComponent, ModalWindowComponent, BaseWindowDirective],
            providers: [RedimFrameService]
        });
        hostFixture = TestBed.createComponent(HostFixture);
        hostFixture.detectChanges();
        service = TestBed.inject(RedimFrameService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('z-index pool', () => {
        it('acquireZIndex returns numeric z', () => {
            const z = (service as any).acquireZIndex();
            expect(typeof z).toBe('number');
            expect(z).toBeGreaterThanOrEqual(1000);
        });

        it('releaseZIndex does not throw and is idempotent', () => {
            const z = (service as any).acquireZIndex();
            expect(() => (service as any).releaseZIndex(z)).not.toThrow();
            expect(() => (service as any).releaseZIndex(z)).not.toThrow();  // double release
        });

        it('repeated acquires yield different values when no release', () => {
            const a = (service as any).acquireZIndex();
            const b = (service as any).acquireZIndex();
            expect(a).not.toBe(b);
        });
    });

    describe('openWindows()', () => {
        it('opens a floating window with a Component input', () => {
            const injector = TestBed.inject(Injector);
            const ref = service.openWindows('window', ContentFixture);
            expect(ref).toBeTruthy();
            expect(ref.instance).toBeInstanceOf(FloatingWindowComponent);
        });

        it('opens a modal window with a Component input', () => {
            const ref = service.openWindows('modal', ContentFixture);
            expect(ref).toBeTruthy();
            expect(ref.instance).toBeInstanceOf(ModalWindowComponent);
        });

        it('passes config contentPortal to the window component', () => {
            const config = new WindowConfig({ zIndex: 5000 });
            const ref = service.openWindows('window', ContentFixture, config);
            expect(ref.instance.zIndex).toBe(5000);
        });

        it('throws or rejects null componentOrTemplate for floating window', () => {
            // Per CR-08: no validation. Document the current behaviour: it throws on Portal.create.
            expect(() => service.openWindows('window', null as any)).toThrow();
        });
    });

    describe('closeWindow()', () => {
        it('removes the componentRef from the registry', () => {
            const ref = service.openWindows('window', ContentFixture);
            const before = (service as any).windowRegistry.has(ref);
            expect(before).toBeTrue();
            service.closeWindow(ref);
            const after = (service as any).windowRegistry.has(ref);
            expect(after).toBeFalse();
        });

        it('disposes the OverlayRef', () => {
            const ref = service.openWindows('window', ContentFixture);
            const entry = (service as any).windowRegistry.get(ref);
            spyOn(entry.overlayRef, 'dispose');
            service.closeWindow(ref);
            expect(entry.overlayRef.dispose).toHaveBeenCalled();
        });

        it('is safe to call twice (idempotent)', () => {
            const ref = service.openWindows('window', ContentFixture);
            service.closeWindow(ref);
            expect(() => service.closeWindow(ref)).not.toThrow();
        });
    });

    describe('windowData injection via WINDOW_DATA', () => {
        it('injects windowData into the FloatingWindowComponent', () => {
            const config = new WindowConfig({ windowData: { zIndex: 7777 } });
            const ref = service.openWindows('window', ContentFixture, config);
            // zIndex flows from config to directive input
            expect(ref.instance.zIndex).toBe(7777);
        });
    });
});
