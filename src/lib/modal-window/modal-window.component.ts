import { ChangeDetectorRef, Component, ElementRef, Renderer2 } from '@angular/core';
import { BaseWindowDirective } from '../base-window.directive';

@Component({
  selector: 'redim-modal-window',
  templateUrl: './modal-window.component.html',
  styleUrls: ['./modal-window.component.css']
})
export class ModalWindowComponent extends BaseWindowDirective {
  constructor(renderer: Renderer2, elementRef: ElementRef, cdr: ChangeDetectorRef) {
    super(renderer, elementRef, cdr);
  }
}