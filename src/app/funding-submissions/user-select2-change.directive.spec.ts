import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { NgSelect2Module, Select2OptionData } from 'ng-select2';

import { UserSelect2ChangeDirective } from './user-select2-change.directive';

declare const jQuery: JQueryStatic;

@Component({
  template: `
    <ng-select2 appUserSelect2Change name="choice" [ngModel]="value" [data]="options"
      (appUserSelect2Change)="onUserChange($event)">
    </ng-select2>`
})
class Select2HostComponent {
  value: string | null = null;
  options: Select2OptionData[] = [];
  changes: Array<string | null> = [];

  onUserChange(value: string | null): void {
    this.value = value;
    this.changes.push(value);
  }
}

describe('UserSelect2ChangeDirective', () => {
  let fixture: ComponentFixture<Select2HostComponent>;
  let host: Select2HostComponent;
  let select: HTMLSelectElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, NgSelect2Module],
      declarations: [Select2HostComponent, UserSelect2ChangeDirective]
    }).compileComponents();
    fixture = TestBed.createComponent(Select2HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    select = fixture.nativeElement.querySelector('select');
    select.add(new Option('DOC', 'DOC'));
    select.add(new Option('NCI', 'NCI'));
  });

  it('ignores binding and options changes but reports actual Select2 selection and clearing', () => {
    host.value = 'DOC';
    fixture.detectChanges();
    host.options = [{ id: 'DOC', text: 'DOC' }, { id: 'NCI', text: 'NCI' }];
    fixture.detectChanges();
    expect(host.value).toBe('DOC');
    expect(host.changes).toEqual([]);

    jQuery(select).val('NCI').trigger('select2:select');
    expect(host.value).toBe('NCI');
    jQuery(select).val(null).trigger('select2:unselect');
    expect(host.value).toBeNull();
    expect(host.changes).toEqual(['NCI', null]);
  });

  it('detaches its handlers when the component is destroyed', () => {
    fixture.destroy();
    jQuery(select).val('NCI').trigger('select2:select');
    expect(host.changes).toEqual([]);
  });

  it('keeps automatic binding distinct from real Select2 selection after options change', async () => {
    const previousPlugin = jQuery.fn.select2;
    require('select2/dist/js/select2.full.js');
    const liveFixture = TestBed.createComponent(Select2HostComponent);
    const liveHost = liveFixture.componentInstance;
    let liveSelect: HTMLSelectElement;
    try {
      liveHost.value = 'DOC';
      liveHost.options = [{ id: 'DOC', text: 'DOC' }, { id: 'NCI', text: 'NCI' }];
      liveFixture.detectChanges();
      await liveFixture.whenStable();
      liveFixture.detectChanges();
      liveSelect = liveFixture.nativeElement.querySelector('select');
      expect(jQuery(liveSelect).val()).toBe('DOC');

      liveHost.options = [...liveHost.options, { id: 'OTHER', text: 'Other' }];
      liveFixture.detectChanges();
      await liveFixture.whenStable();
      expect(liveHost.value).toBe('DOC');
      expect(liveHost.changes).toEqual([]);
      expect(jQuery(liveSelect).val()).toBe('DOC');

      const select2: unknown = jQuery(liveSelect).data('select2');
      if (!select2 || typeof select2 !== 'object' || !('trigger' in select2)
        || typeof select2.trigger !== 'function') {
        throw new Error('Select2 did not initialize.');
      }
      select2.trigger('select', { data: { id: 'NCI', text: 'NCI' } });
      expect(liveHost.value).toBe('NCI');
      expect(liveHost.changes).toEqual(['NCI']);
    } finally {
      if (liveSelect && jQuery(liveSelect).hasClass('select2-hidden-accessible')) {
        jQuery(liveSelect).select2('destroy');
      }
      liveFixture.destroy();
      jQuery.fn.select2 = previousPlugin;
    }
  });
});
