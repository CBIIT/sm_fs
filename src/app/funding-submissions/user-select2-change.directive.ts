import { AfterViewInit, Directive, ElementRef, EventEmitter, OnDestroy, Output } from '@angular/core';

declare const jQuery: JQueryStatic;

@Directive({
  selector: 'ng-select2[appUserSelect2Change]'
})
export class UserSelect2ChangeDirective implements AfterViewInit, OnDestroy {
  @Output() appUserSelect2Change = new EventEmitter<string | null>();

  private select: JQuery<HTMLSelectElement>;
  private readonly eventNames = 'select2:select.fsUserEdit select2:unselect.fsUserEdit';
  private readonly onSelection = (): void => {
    const value = this.select.val();
    this.appUserSelect2Change.emit(Array.isArray(value) ? String(value[0] ?? '') : String(value ?? '') || null);
  };

  constructor(private element: ElementRef<HTMLElement>) {}

  ngAfterViewInit(): void {
    const select = this.element.nativeElement.querySelector('select');
    if (select) {
      this.select = jQuery(select);
      this.select.on(this.eventNames, this.onSelection);
    }
  }

  ngOnDestroy(): void {
    this.select?.off(this.eventNames, this.onSelection);
  }
}
