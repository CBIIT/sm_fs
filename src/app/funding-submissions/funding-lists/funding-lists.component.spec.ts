import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NGXLogger } from 'ngx-logger';
import { of } from 'rxjs';
import { FundingListsComponent } from './funding-lists.component';
import { FundingSubmissionsService } from '@cbiit/i2efsws-lib';
import { AppPropertiesService, LoaderService } from '@cbiit/i2ecui-lib';
import { DataTableDirective } from 'angular-datatables';

describe('FundingListsComponent', () => {
  let component: FundingListsComponent;
  let fixture: ComponentFixture<FundingListsComponent>;
  let fundingSubmissionsServiceSpy: jasmine.SpyObj<FundingSubmissionsService>;

  beforeEach(async () => {
    fundingSubmissionsServiceSpy = jasmine.createSpyObj<FundingSubmissionsService>('FundingSubmissionsService', [
      'getListDetail',
      'saveNciDecisions'
    ]);
    fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({
      listCode: '',
      currentStatusDescrip: '',
      totalGrants: 0,
      totalDocRecAmt: 0,
      grants: []
    } as any));
    fundingSubmissionsServiceSpy.saveNciDecisions.and.returnValue(of({} as any));

    const testingModule = TestBed.configureTestingModule({
      declarations: [FundingListsComponent],
      imports: [RouterTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { queryParams: of({}) }
        },
        {
          provide: HttpClient,
          useValue: {}
        },
        {
          provide: AppPropertiesService,
          useValue: { getProperty: () => '' }
        },
        {
          provide: LoaderService,
          useValue: { show: jasmine.createSpy('show'), hide: jasmine.createSpy('hide') }
        },
        {
          provide: NgbModal,
          useValue: { open: jasmine.createSpy('open') }
        },
        {
          provide: FundingSubmissionsService,
          useValue: fundingSubmissionsServiceSpy
        },
        {
          provide: NGXLogger,
          useValue: { error: jasmine.createSpy('error') }
        }
      ]
    });
    TestBed.overrideComponent(FundingListsComponent, { set: { template: '' } });
    await testingModule.compileComponents();

    fixture = TestBed.createComponent(FundingListsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('exports the 16 visible data columns in table order without checkbox or Action', () => {
    const columns = component.dtOptions.columns;
    const exportIndexes = component.dtOptions.buttons[0].exportOptions.columns;

    expect(exportIndexes.map((index: number) => columns[index].title)).toEqual([
      'DOC',
      'PI',
      'Grant Number',
      'Institution',
      'Project Title',
      'Abs',
      'SS',
      'Justification',
      'Review status',
      'ESI',
      'NCI Decision',
      'DOC Decision',
      'DOC Priority',
      'DOC/NCI Sel',
      'Annual or MYF',
      'Recused'
    ]);
    expect(exportIndexes.map((index: number) => columns[index].title)).not.toContain('');
    expect(exportIndexes.map((index: number) => columns[index].title)).not.toContain('Action');
  });

  it('uses the export orthogonal value for Review status', () => {
    const reviewStatus = component.dtOptions.columns.find((column: any) => column.title === 'Review status');
    const exportOptions = component.dtOptions.buttons[0].exportOptions;
    const render = reviewStatus.render;

    expect(exportOptions.orthogonal).toBe('export');
    expect(render('Pay', 'export', { reviewStatusDate: new Date(2026, 0, 2) })).toBe('Pay 01/02/2026');
    expect(render('Pay', 'export', { reviewStatusDate: null })).toBe('Pay');
    expect(render('Pay', 'export', { reviewStatusDate: undefined })).toBe('Pay');
    expect(render('Pay', 'export', { reviewStatusDate: '' })).toBe('Pay');
    expect(render('', 'export', { reviewStatusDate: new Date(2026, 0, 2) })).toBe('');
    expect(render(null, 'export', { reviewStatusDate: new Date(2026, 0, 2) })).toBe('');
    expect(render(undefined, 'export', { reviewStatusDate: new Date(2026, 0, 2) })).toBe('');
  });

  it('keeps the Review status display rendering unchanged', () => {
    const reviewStatus = component.dtOptions.columns.find((column: any) => column.title === 'Review status');
    const render = reviewStatus.render;
    const withDate = render('Pay', 'display', { reviewStatusDate: new Date(2026, 0, 2) });
    const withoutDate = render('Pay', 'display', { reviewStatusDate: null });

    expect(withDate).toBe('<div>Pay</div><div class="text-muted">01/02/2026</div>');
    expect((withDate.match(/<div\b/g) || []).length).toBe(2);
    expect(withoutDate).toBe('<div>Pay</div>');
    expect((withoutDate.match(/<div\b/g) || []).length).toBe(1);
  });

  it('enables Export when rows exist and disables it when the table is empty', async () => {
    const button = {
      enable: jasmine.createSpy('enable'),
      disable: jasmine.createSpy('disable')
    };
    const tableApi = {
      columns: { adjust: jasmine.createSpy('adjust') },
      rows: jasmine.createSpy('rows').and.returnValue({ count: () => 1 }),
      button: jasmine.createSpy('button').and.returnValue(button)
    };
    spyOn<any>(component, 'syncExpandedDetailWidths').and.stub();
    spyOn<any>(component, 'bindHorizontalDragScroll').and.stub();
    spyOn<any>(component, 'bindSelectionEvents').and.stub();
    spyOn<any>(component, 'bindActionEvents').and.stub();
    spyOn<any>(component, 'bindDocLinkEvents').and.stub();
    component.dtElement = { dtInstance: Promise.resolve(tableApi) } as unknown as DataTableDirective;

    component.dtOptions.drawCallback();
    await Promise.resolve();

    expect(tableApi.button).toHaveBeenCalledWith('.btn-export-all');
    expect(tableApi.rows).toHaveBeenCalledWith({ search: 'applied' });
    expect(button.enable).toHaveBeenCalled();
    expect(button.disable).not.toHaveBeenCalled();

    tableApi.rows.and.returnValue({ count: () => 0 });
    component.dtOptions.drawCallback();
    await Promise.resolve();

    expect(button.disable).toHaveBeenCalled();
  });

  it('formats a date-only review status value using its calendar date', () => {
    const reviewStatus = component.dtOptions.columns.find((column: any) => column.title === 'Review status');

    expect(reviewStatus.render('Pay', 'export', { reviewStatusDate: '2026-01-02' })).toBe('Pay 01/02/2026');
  });

  it('scrolls to top after a successful individual Process decision save so success feedback is visible', () => {
    const scrollSpy = spyOn(window, 'scrollTo');
    spyOn<any>(component, 'reloadTable').and.stub();

    (component as any).pendingDecision = 'Approve';
    (component as any).pendingDecisionGrant = { applId: 42, grantNumber: 'R01CA123456' } as any;
    (component as any).pendingDecisionGrantNumber = 'R01CA123456';
    component.pendingDecisionNote = '';

    component.onConfirmGrantDecision();

    expect(fundingSubmissionsServiceSpy.saveNciDecisions).toHaveBeenCalled();
    expect(scrollSpy).toHaveBeenCalled();
    const scrollArg = scrollSpy.calls.mostRecent().args[0] as ScrollToOptions;
    expect(scrollArg.top).toBe(0);
    expect(scrollArg.behavior).toBe('smooth');
    expect(component.decisionSuccessMessage).toContain('Success! Grant R01CA123456 has been approved.');
  });

  it('does not call save or scroll when Hold is submitted without required note', () => {
    const scrollSpy = spyOn(window, 'scrollTo');

    (component as any).pendingDecision = 'Hold';
    (component as any).pendingDecisionGrant = { applId: 99, grantNumber: 'R21CA000999' } as any;
    (component as any).pendingDecisionGrantNumber = 'R21CA000999';
    component.pendingDecisionNote = '   ';

    component.onConfirmGrantDecision();

    expect(component.pendingDecisionValidationMessage).toBe('NCI Director Note is required.');
    expect(fundingSubmissionsServiceSpy.saveNciDecisions).not.toHaveBeenCalled();
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  describe('Process dropdown row expansion', () => {
    it('expands the selected grant row when Process is opened, even if legacy expansion predicate would be false', () => {
      const rowData = { applId: 123 } as any;
      const rowApi = { data: () => rowData } as any;

      const tableEl = document.createElement('table');
      const tbodyEl = document.createElement('tbody');
      const trEl = document.createElement('tr');
      const tdEl = document.createElement('td');
      tdEl.innerHTML = `
        <div class="btn-group process-dropdown-wrap">
          <button type="button" class="btn process-toggle" data-appl-id="123">Process</button>
          <div class="dropdown-menu process-menu"></div>
        </div>
      `;
      trEl.appendChild(tdEl);
      tbodyEl.appendChild(trEl);
      tableEl.appendChild(tbodyEl);
      document.body.appendChild(tableEl);

      const dtMock = {
        table: () => ({ body: () => tbodyEl }),
        row: jasmine.createSpy('row').and.returnValue(rowApi)
      } as any;

      const shouldExpandSpy = spyOn<any>(component, 'shouldExpandDetailForProcessDropdown').and.returnValue(false);
      const ensureExpandedSpy = spyOn<any>(component, 'ensureGrantRowExpanded').and.stub();

      (component as any).bindActionEvents(dtMock);

      const processButton = tdEl.querySelector('.process-toggle') as HTMLButtonElement;
      processButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(dtMock.row).toHaveBeenCalled();
      expect(shouldExpandSpy).not.toHaveBeenCalled();
      expect(ensureExpandedSpy).toHaveBeenCalled();
      const args = ensureExpandedSpy.calls.mostRecent().args;
      expect(args[0]).toBe(123);
      expect(args[3]).toBe(rowData);

      tableEl.remove();
    });

    it('does not try to expand when process button applId is invalid', () => {
      const rowData = { applId: 321 } as any;
      const rowApi = { data: () => rowData } as any;

      const tableEl = document.createElement('table');
      const tbodyEl = document.createElement('tbody');
      const trEl = document.createElement('tr');
      const tdEl = document.createElement('td');
      tdEl.innerHTML = `
        <div class="btn-group process-dropdown-wrap">
          <button type="button" class="btn process-toggle" data-appl-id="NaN">Process</button>
          <div class="dropdown-menu process-menu"></div>
        </div>
      `;
      trEl.appendChild(tdEl);
      tbodyEl.appendChild(trEl);
      tableEl.appendChild(tbodyEl);
      document.body.appendChild(tableEl);

      const dtMock = {
        table: () => ({ body: () => tbodyEl }),
        row: jasmine.createSpy('row').and.returnValue(rowApi)
      } as any;

      const ensureExpandedSpy = spyOn<any>(component, 'ensureGrantRowExpanded').and.stub();

      (component as any).bindActionEvents(dtMock);

      const processButton = tdEl.querySelector('.process-toggle') as HTMLButtonElement;
      processButton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

      expect(ensureExpandedSpy).not.toHaveBeenCalled();

      tableEl.remove();
    });
  });
});
