import { Component, HostBinding } from '@angular/core';
import { BaseWindowDirective } from '../base-window.directive';

@Component({
  selector: 'lib-modal-window',
  templateUrl: './modal-window.component.html',
  styleUrls: ['./modal-window.component.css']
})
export class ModalWindowComponent extends BaseWindowDirective {
  @HostBinding('style.--width') get widthStyle() { return this.width + 'vw'; }
  @HostBinding('style.--height') get heightStyle() { return this.height + 'vh'; }
  @HostBinding('style.--z-index') get zIndexStyle() { return this.zIndex; }
}
