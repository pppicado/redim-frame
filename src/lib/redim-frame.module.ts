import { NgModule } from '@angular/core';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { OverlayModule } from '@angular/cdk/overlay';
import { PortalModule } from '@angular/cdk/portal';
import { FloatingWindowComponent } from './floating-window/floating-window.component';
import { ModalWindowComponent } from './modal-window/modal-window.component';
import { BaseWindowDirective } from './base-window.directive';
import { VirtualScrollbarModule } from '@pppicado/virtual-scrollbar';

@NgModule({
  declarations: [
    FloatingWindowComponent,
    ModalWindowComponent,
    BaseWindowDirective
  ],
  imports: [
    CommonModule,
    DragDropModule,
    OverlayModule,
    PortalModule,
    VirtualScrollbarModule
  ],
  exports: [
    FloatingWindowComponent,
    ModalWindowComponent,
    BaseWindowDirective,
    VirtualScrollbarModule
  ]
})
export class RedimFrameModule { }
