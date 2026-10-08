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

  beforeEach(async () => {
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
          useValue: {
            getListDetail: () => of({
              listCode: '',
              currentStatusDescrip: '',
              totalGrants: 0,
              totalDocRecAmt: 0,
              grants: []
            })
          }
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
});
