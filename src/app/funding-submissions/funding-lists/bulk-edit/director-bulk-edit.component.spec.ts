import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Directive, forwardRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { NgbAlertConfig, NgbAlertModule } from '@ng-bootstrap/ng-bootstrap';
import { of, Subject, throwError } from 'rxjs';
import { FundingSubmissionsService } from '@cbiit/i2efsws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { DirectorBulkEditComponent } from './director-bulk-edit.component';

@Directive({
  selector: 'ng-select2',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => Select2TestValueAccessor),
    multi: true
  }]
})
class Select2TestValueAccessor implements ControlValueAccessor {
  writeValue(): void {}
  registerOnChange(): void {}
  registerOnTouched(): void {}
}

// FS-2639 Director Bulk Decision (List View #46): option copy, required NCI Director Notes for
// Hold/Reject, saved-success copy, Export control, and PI mail-to subject.
describe('DirectorBulkEditComponent', () => {
  const NOTE_REQUIRED = 'NCI Director Note is required';

  let component: DirectorBulkEditComponent;
  let fixture: ComponentFixture<DirectorBulkEditComponent>;
  let fundingSubmissionsServiceSpy: jasmine.SpyObj<FundingSubmissionsService>;
  let scrollToSpy: jasmine.Spy;

  function grant(overrides: { [field: string]: any } = {}): any {
    return {
      applId: 1,
      grantNumber: '1R01CA000001-01',
      piName: 'Doe, Jane',
      piEmail: 'jane.doe@example.com',
      doc: 'DCB',
      nciDecision: null,
      nciDirectorNotes: '',
      ...overrides
    };
  }

  function initializeWithGrants(grants: any[]): void {
    spyOnProperty(history, 'state', 'get').and.returnValue({ grants });
    fixture.detectChanges();
  }

  function getSaveButton(): HTMLButtonElement {
    return Array.from(fixture.nativeElement.querySelectorAll('button'))
      .find((button: HTMLButtonElement) => button.textContent?.trim() === 'Save') as HTMLButtonElement;
  }

  function renderNotesCell(row: any): string {
    const view = component.nciNotesRenderer.createEmbeddedView({ adtData: row });
    view.detectChanges();
    const text = view.rootNodes.map((node: any) => node.textContent || '').join(' ');
    view.destroy();
    return text;
  }

  function column(title: string): any {
    return component.dtOptions.columns.find((entry: any) => entry.title === title);
  }

  beforeEach(async () => {
    scrollToSpy = spyOn(window, 'scrollTo');
    fundingSubmissionsServiceSpy = jasmine.createSpyObj('FundingSubmissionsService', ['saveNciDecisions', 'getListDetail']);
    fundingSubmissionsServiceSpy.saveNciDecisions.and.returnValue(of({} as any));

    await TestBed.configureTestingModule({
      declarations: [DirectorBulkEditComponent, Select2TestValueAccessor],
      imports: [FormsModule, NgbAlertModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({ listId: '39' }), snapshot: { queryParamMap: convertToParamMap({}) } }
        },
        { provide: Router, useValue: jasmine.createSpyObj('Router', ['navigate']) },
        { provide: AppPropertiesService, useValue: { getProperty: () => '' } },
        { provide: FundingSubmissionsService, useValue: fundingSubmissionsServiceSpy },
        { provide: NGXLogger, useValue: jasmine.createSpyObj('NGXLogger', ['debug', 'info', 'warn', 'error']) }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    TestBed.inject(NgbAlertConfig).animation = false;
    fixture = TestBed.createComponent(DirectorBulkEditComponent);
    component = fixture.componentInstance;
  });

  it('displays Hold as the option text for the Hold decision', () => {
    expect(component.decisionOptions.map(option => option.text)).toEqual(['Approve', 'Hold', 'Reject']);
    expect(component.decisionOptions.find(option => option.id === 'Hold')?.text).toBe('Hold');
  });

  ['Hold', 'Rejected'].forEach(decision => {
    it(`requires an NCI Director Note on each row when ${decision} is applied without notes`, () => {
      initializeWithGrants([grant({ applId: 1 }), grant({ applId: 2 })]);
      component.bulkDecision = decision;

      component.applyChanges();
      fixture.detectChanges();

      component.rows.forEach(row => {
        expect(component.hasNciDirectorNoteError(row)).toBeTrue();
        expect(renderNotesCell(row)).toContain(NOTE_REQUIRED);
      });
      expect(getSaveButton().disabled).toBeTrue();

      component.rows[0].nciDirectorNotes = 'Reason one';
      component.onRowChange();
      fixture.detectChanges();

      expect(renderNotesCell(component.rows[0])).not.toContain(NOTE_REQUIRED);
      expect(renderNotesCell(component.rows[1])).toContain(NOTE_REQUIRED);
      expect(getSaveButton().disabled).toBeTrue();

      component.rows[1].nciDirectorNotes = 'Reason two';
      component.onRowChange();
      fixture.detectChanges();

      expect(component.hasNciDirectorNoteErrors).toBeFalse();
      expect(getSaveButton().disabled).toBeFalse();
      expect(scrollToSpy).not.toHaveBeenCalled();
    });
  });

  it('does not require notes when Approve is applied and enables Save', () => {
    initializeWithGrants([grant({ applId: 1 }), grant({ applId: 2 })]);
    component.bulkDecision = 'Approve';

    component.applyChanges();
    fixture.detectChanges();

    expect(component.hasNciDirectorNoteErrors).toBeFalse();
    expect(renderNotesCell(component.rows[0])).not.toContain(NOTE_REQUIRED);
    expect(getSaveButton().disabled).toBeFalse();
  });

  it('flags a row changed to Hold with a blank note but not an unchanged saved Hold row', () => {
    initializeWithGrants([
      grant({ applId: 1, nciDecision: 'Approve' }),
      grant({ applId: 2, nciDecision: 'Hold', nciDirectorNotes: '' })
    ]);

    component.rows[0].nciDecision = 'Hold';
    component.rows[0].nciDirectorNotes = '   ';
    component.onRowChange();

    expect(component.hasNciDirectorNoteError(component.rows[0])).toBeTrue();
    expect(component.hasNciDirectorNoteError(component.rows[1])).toBeFalse();
  });

  it('does not call saveNciDecisions while any row is missing a required note', () => {
    initializeWithGrants([grant({ applId: 1 })]);
    component.bulkDecision = 'Rejected';
    component.applyChanges();

    component.onSave();

    expect(fundingSubmissionsServiceSpy.saveNciDecisions).not.toHaveBeenCalled();
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('scrolls to the saved success message and disables Save only after a successful response', () => {
    const response = new Subject<any>();
    fundingSubmissionsServiceSpy.saveNciDecisions.and.returnValue(response);
    initializeWithGrants([grant({ applId: 1 })]);
    component.bulkDecision = 'Hold';
    component.bulkNotes = 'Pending budget review';
    component.applyChanges();

    component.onSave();
    expect(scrollToSpy).not.toHaveBeenCalled();
    expect(component.saveSuccessMessage).toBe('');

    response.next({});
    response.complete();
    fixture.detectChanges();

    expect(fundingSubmissionsServiceSpy.saveNciDecisions).toHaveBeenCalledWith({
      items: [{ applId: 1, nciDecision: 'Hold', nciDirectorNotes: 'Pending budget review' }]
    }, 39);
    expect(component.saveSuccessMessage).toBe('Success! Bulk changes have been saved');
    expect(component.canSave).toBeFalse();
    expect(component.hasNciDirectorNoteErrors).toBeFalse();
    expect(getSaveButton().disabled).toBeTrue();
    expect(component.rows[0].nciDecision).toBe('Hold');
    expect(component.rows[0].nciDirectorNotes).toBe('Pending budget review');
    expect(scrollToSpy).toHaveBeenCalledOnceWith({ top: 0, behavior: 'smooth' });
  });

  it('renders the dismissible success alert directly alongside the heading and form', () => {
    initializeWithGrants([grant()]);
    component.saveSuccessMessage = 'Success! Bulk changes have been saved';
    fixture.detectChanges();

    const page: HTMLElement = fixture.nativeElement.querySelector('.director-bulk-edit-page');
    const alert: HTMLElement = page.querySelector('ngb-alert[type="success"]');
    expect(alert.parentElement).toBe(page);
    expect(alert.previousElementSibling).toBe(page.querySelector('h1'));
    expect(alert.nextElementSibling).toBe(page.querySelector('.bulk-form'));
    expect(alert.classList.contains('alert-success')).toBeTrue();
    expect(alert.textContent).toContain('Success! Bulk changes have been saved');

    alert.querySelector<HTMLButtonElement>('button.btn-close').click();
    fixture.detectChanges();

    expect(component.saveSuccessMessage).toBe('');
    expect(page.querySelector('ngb-alert[type="success"]')).toBeNull();
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('does not scroll or show success when the API save fails', () => {
    fundingSubmissionsServiceSpy.saveNciDecisions.and.returnValue(throwError(() => ({ status: 500 })));
    initializeWithGrants([grant()]);
    component.bulkDecision = 'Approve';
    component.applyChanges();

    component.onSave();
    fixture.detectChanges();

    expect(fundingSubmissionsServiceSpy.saveNciDecisions).toHaveBeenCalledTimes(1);
    expect(component.loadErrorMessage).toBe('Unable to save Director Bulk Edit changes right now. Please try again.');
    expect(component.saveSuccessMessage).toBe('');
    expect(component.savingInProgress).toBeFalse();
    expect(getSaveButton().disabled).toBeFalse();
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  [[], [grant()]].forEach(grants => {
    it(`does not save or scroll for ${grants.length ? 'unchanged rows' : 'an empty selection'}`, () => {
      initializeWithGrants(grants);
      component.canSave = true;

      component.onSave();

      expect(fundingSubmissionsServiceSpy.saveNciDecisions).not.toHaveBeenCalled();
      expect(component.canSave).toBeFalse();
      expect(component.saveSuccessMessage).toBe('');
      expect(scrollToSpy).not.toHaveBeenCalled();
    });
  });

  it('does not save or scroll when a changed row has no decision', () => {
    initializeWithGrants([grant()]);
    component.bulkNotes = 'Review pending';
    component.applyChanges();

    component.onSave();

    expect(fundingSubmissionsServiceSpy.saveNciDecisions).not.toHaveBeenCalled();
    expect(component.loadErrorMessage).toContain('Please select an NCI Decision');
    expect(component.saveSuccessMessage).toBe('');
    expect(scrollToSpy).not.toHaveBeenCalled();
  });

  it('configures the Export button and exports the displayed NCI Decision label', () => {
    initializeWithGrants([grant()]);

    expect(component.dtOptions.dom).toContain('B');
    expect(component.dtOptions.buttons).toEqual([jasmine.objectContaining({
      extend: 'excel',
      className: 'btn-excel btn-export-all',
      text: 'Export',
      exportOptions: { orthogonal: 'export' }
    })]);
    const decisionRender = column('NCI Decision').render;
    expect(decisionRender('Rejected', 'export')).toBe('Reject');
    expect(decisionRender('Hold', 'export')).toBe('Hold');
    expect(decisionRender('Rejected', 'display')).toBe('Rejected');
    expect(column('NCI Director Notes')).toBeDefined();
  });

  it('uses the PI last name in the mail-to subject for "Last, First" and "First Last" names', () => {
    initializeWithGrants([grant()]);
    const piRender = column('PI').render;

    const commaLink = piRender('Doe, Jane', 'display', grant({ piName: 'Doe, Jane' }));
    const spaceLink = piRender('Jane Smith', 'display', grant({ piName: 'Jane Smith' }));

    expect(commaLink).toContain(`subject=${encodeURIComponent('1R01CA000001-01 - Doe')}"`);
    expect(spaceLink).toContain(`subject=${encodeURIComponent('1R01CA000001-01 - Smith')}"`);
  });
});
