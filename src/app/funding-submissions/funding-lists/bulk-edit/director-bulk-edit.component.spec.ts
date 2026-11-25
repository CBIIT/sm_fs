import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Directive, forwardRef, NO_ERRORS_SCHEMA } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { of } from 'rxjs';
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
    fundingSubmissionsServiceSpy = jasmine.createSpyObj('FundingSubmissionsService', ['saveNciDecisions', 'getListDetail']);
    fundingSubmissionsServiceSpy.saveNciDecisions.and.returnValue(of({} as any));

    await TestBed.configureTestingModule({
      declarations: [DirectorBulkEditComponent, Select2TestValueAccessor],
      imports: [FormsModule],
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
  });

  it('shows the saved success message and disables Save after a successful save', () => {
    initializeWithGrants([grant({ applId: 1 })]);
    component.bulkDecision = 'Hold';
    component.bulkNotes = 'Pending budget review';
    component.applyChanges();

    component.onSave();
    fixture.detectChanges();

    expect(fundingSubmissionsServiceSpy.saveNciDecisions).toHaveBeenCalledWith({
      items: [{ applId: 1, nciDecision: 'Hold', nciDirectorNotes: 'Pending budget review' }]
    }, 39);
    expect(component.saveSuccessMessage).toBe('Success! Bulk changes have been saved');
    expect(component.canSave).toBeFalse();
    expect(component.hasNciDirectorNoteErrors).toBeFalse();
    expect(getSaveButton().disabled).toBeTrue();
    expect(component.rows[0].nciDecision).toBe('Hold');
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
