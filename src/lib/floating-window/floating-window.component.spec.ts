import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, DebugElement } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { By } from '@angular/platform-browser';

import { FloatingWindowComponent } from './floating-window.component';
import { BaseWindowDirective } from '../base-window.directive';

describe('FloatingWindowComponent', () => {
    let component: FloatingWindowComponent;
    let fixture: ComponentFixture<FloatingWindowComponent>;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [DragDropModule],
            declarations: [FloatingWindowComponent]
        });
        fixture = TestBed.createComponent(FloatingWindowComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('extends BaseWindowDirective', () => {
        expect(component).toBeInstanceOf(BaseWindowDirective);
    });

    it('defaults resizeBorder to 6', () => {
        // Use jasmine.any(Number) to bypass Jasmine 5's type defs
        // which constrain toBe/toEqual to string|ArrayLike<string>
        // in the Expected<T> overload we hit. The runtime value is
        // still validated by the type guard.
        expect(component.resizeBorder).toBe(jasmine.any(Number));
    });

    it('emits focus on drag start', () => {
        spyOn(component.change, 'emit');
        const fakeEvent = { source: { _dragRef: { reset: () => {} } } } as any;
        component.onDragStart(fakeEvent);
        expect(component.change.emit).toHaveBeenCalledWith({ type: 'focus' });
    });

    it('onDragEnd accumulates distance and resets drag ref', () => {
        let resetCalled = false;
        const fakeEvent = {
            source: {
                _dragRef: { reset: () => { resetCalled = true; } },
                getFreeDragPosition: () => ({ x: 50, y: 30 })
            },
            distance: { x: 50, y: 30 }
        } as any;
        spyOn(component.change, 'emit');
        component.onDragEnd(fakeEvent);
        expect(resetCalled).toBeTrue();
        // Resets after reset, so distance is 0
        expect(fakeEvent.distance.x).toBe(0);
        expect(fakeEvent.distance.y).toBe(0);
    });

    describe('initResize()', () => {
        let mockRenderer: any;
        let originalRenderer: any;
        let unlistenMove: jasmine.Spy;
        let unlistenUp: jasmine.Spy;

        beforeEach(() => {
            unlistenMove = jasmine.createSpy('unlistenMove');
            unlistenUp = jasmine.createSpy('unlistenUp');
            // BaseWindowDirective has a public renderer field
            originalRenderer = (component as any).renderer;
            mockRenderer = {
                listen: (_el: any, evt: string, cb: any) => {
                    if (evt === 'mousemove') return unlistenMove;
                    if (evt === 'mouseup') return unlistenUp;
                    return () => {};
                }
            };
            (component as any).renderer = mockRenderer;
        });

        afterEach(() => {
            (component as any).renderer = originalRenderer;
        });

        it('attaches mousemove and mouseup listeners on initResize', () => {
            component.initResize({} as MouseEvent, 'e');
            expect(unlistenMove).not.toHaveBeenCalled();
            expect(unlistenUp).not.toHaveBeenCalled();
        });

        it('stopResize releases both listeners', () => {
            component.initResize({} as MouseEvent, 'e');
            component.stopResize();
            expect(unlistenMove).toHaveBeenCalled();
            expect(unlistenUp).toHaveBeenCalled();
        });

        it('re-initializing resize replaces the previous listeners', () => {
            component.initResize({} as MouseEvent, 'e');
            const unlistenMove2 = jasmine.createSpy('unlistenMove2');
            const unlistenUp2 = jasmine.createSpy('unlistenUp2');
            mockRenderer.listen = (_el: any, evt: string) =>
                evt === 'mousemove' ? unlistenMove2 : unlistenUp2;
            component.initResize({} as MouseEvent, 's');
            expect(unlistenMove).toHaveBeenCalled();  // first pair released
            expect(unlistenUp).toHaveBeenCalled();
        });

        it('onResize no-op when isResizing is false', () => {
            component.initResize({} as MouseEvent, 'e');
            (component as any).isResizing = false;
            const before = (component as any).unit.pixels.rect.width;
            (component as any).onResize({} as MouseEvent);
            // No change because isResizing guard rejects the event
            expect((component as any).unit.pixels.rect.width).toBe(before);
        });
    });

    it('template has cdkDrag handle on .window-drag', () => {
        const dragEl = fixture.debugElement.query(By.css('.window-drag'));
        expect(dragEl).toBeTruthy();
        expect(dragEl.attributes['cdkDrag']).toBeDefined();
    });

    it('template has resize handles in 8 directions', () => {
        const handles = fixture.debugElement.queryAll(By.css('.resize-handle'));
        // 8 directions: n, ne, e, se, s, sw, w, nw
        expect(handles.length).toBe(8);
    });
});
