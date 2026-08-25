import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FundingSubmissionsControllerService } from '@cbiit/i2efsws-lib';
import { AppPropertiesService, LoaderService } from '@cbiit/i2ecui-lib';
import { HttpClient } from '@angular/common/http';

import { CreateFundingTableComponent } from './create-funding-table.component';

/**
 * Unit tests for the "Grant Search Results checkbox disable" feature (Compass item 10):
 * the grant search results grid's row checkbox must be disabled — with a "Already exists in a
 * list." tooltip — for any grant already in a list under the backend's `checkboxDisabled` /
 * `existsInListSelectionDate` computed fields, and the header checkbox must select/deselect only
 * the *enabled* rows on the *current* page.
 *
 * `ngAfterViewInit()` (which builds `dtOptions`, including `rowCallback`/`initComplete`) is
 * deliberately invoked here — unlike some other DataTables-backed specs in this repo that skip
 * it — because the behavior under test lives entirely inside those callbacks. The live DataTables
 * instance itself is never initialized (no `dtTrigger.next()`/real `<table>` render), so
 * `dtElement`/`dt.table(0)` are never touched by these tests; only the pure
 * `rowCallback`/`toggleRowSelection`/`applySelectAllToggle`/`isRowSelectable`/`allDataSelected`
 * logic is exercised, consistent with this repo's convention of extracting small private
 * testable seams out of jQuery/DataTables callbacks (see `search-lists.component.spec.ts`'s
 * `fakeJq()` helper for precedent).
 */
describe('CreateFundingTableComponent — Grant Search Results checkbox disable (Compass item 10)', () => {
  let component: CreateFundingTableComponent;
  let fixture: ComponentFixture<CreateFundingTableComponent>;

  /** Minimal chainable jQuery stand-in that records calls and lets tests fire a captured handler. */
  function fakeJq() {
    const handlers: { [event: string]: () => void } = {};
    const jq: any = {
      off: jasmine.createSpy('off').and.callFake(() => jq),
      on: jasmine.createSpy('on').and.callFake((event: string, handler: () => void) => {
        handlers[event] = handler;
        return jq;
      }),
      addClass: jasmine.createSpy('addClass').and.callFake(() => jq),
      removeClass: jasmine.createSpy('removeClass').and.callFake(() => jq),
      toggleClass: jasmine.createSpy('toggleClass').and.callFake(() => jq),
      attr: jasmine.createSpy('attr').and.callFake(() => jq),
      removeAttr: jasmine.createSpy('removeAttr').and.callFake(() => jq),
      closest: jasmine.createSpy('closest').and.callFake(() => jq),
      find: jasmine.createSpy('find').and.callFake(() => jq),
      not: jasmine.createSpy('not').and.callFake(() => jq),
      _trigger(event: string) {
        handlers[event]?.();
      }
    };
    return jq;
  }

  /** A fake DataTables row DOM node whose per-column cells never trigger the Excel-fix cleanup. */
  function fakeRowNode(): any {
    return {
      childNodes: {
        item: (_i: number) => ({ childNodes: { length: 0 } })
      }
    };
  }

  beforeEach(async () => {
    // ngOnInit()/ngAfterViewInit() touch the global jQuery/DataTables plugin object, which isn't
    // loaded in the Karma test env — stub the pieces this component actually reaches for. Reset
    // unconditionally (not `||=`) since individual tests below reassign `window.$` to a jasmine
    // spy and must not leak that spy into the next test's beforeEach.
    (window as any).$ = { fn: { DataTable: { ext: { pager: {} } } } };

    const fundingSubmissionsServiceSpy = jasmine.createSpyObj('FundingSubmissionsControllerService', [
      'getSelectionDateCodes', 'searchGrants', 'addGrantsToList', 'searchLists'
    ]);
    fundingSubmissionsServiceSpy.getSelectionDateCodes.and.returnValue(of([]));

    const loaderServiceSpy = jasmine.createSpyObj('LoaderService', ['show', 'hide']);
    const propertiesServiceSpy = jasmine.createSpyObj('AppPropertiesService', ['getProperty']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    const modalServiceSpy = jasmine.createSpyObj('NgbModal', ['open']);

    await TestBed.configureTestingModule({
      declarations: [CreateFundingTableComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: FundingSubmissionsControllerService, useValue: fundingSubmissionsServiceSpy },
        { provide: LoaderService, useValue: loaderServiceSpy },
        { provide: AppPropertiesService, useValue: propertiesServiceSpy },
        { provide: NGXLogger, useValue: jasmine.createSpyObj('NGXLogger', ['debug', 'error', 'warn']) },
        { provide: NgbModal, useValue: modalServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: HttpClient, useValue: jasmine.createSpyObj('HttpClient', ['post']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CreateFundingTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges(); // runs ngOnInit()
    component.ngAfterViewInit(); // builds dtOptions (rowCallback/initComplete/headerCallback)
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('row checkbox: disabled state + tooltip (isRowSelectable / rowCallback)', () => {
    it('a grant with checkboxDisabled=true is not selectable', () => {
      expect((component as any).isRowSelectable({ applId: 1, checkboxDisabled: true })).toBeFalse();
    });

    it('a grant already in a list (existsInListSelectionDate set) is not selectable', () => {
      expect((component as any).isRowSelectable({ applId: 1, existsInListSelectionDate: 'LIST-A' })).toBeFalse();
    });

    it('a grant with neither flag set is selectable', () => {
      expect((component as any).isRowSelectable({ applId: 1, checkboxDisabled: false })).toBeTrue();
    });

    it('rowCallback adds the "disabled" class and the "Already exists in a list." tooltip for a disabled row', () => {
      const jq = fakeJq();
      (window as any).$ = jasmine.createSpy('$').and.returnValue(jq);

      const data = { applId: 42, checkboxDisabled: true, selected: false };
      component.dtOptions.rowCallback(fakeRowNode(), data);

      expect(jq.removeClass).toHaveBeenCalledWith('selected');
      expect(jq.addClass).toHaveBeenCalledWith('disabled');
      expect(jq.attr).toHaveBeenCalledWith('title', 'Already exists in a list.');
      expect(data.selected).toBeFalse();
      expect(component.selectedRows.has(42)).toBeFalse();
    });

    it('rowCallback does NOT wire a click handler for a disabled row (checkbox stays inert)', () => {
      const jq = fakeJq();
      (window as any).$ = jasmine.createSpy('$').and.returnValue(jq);

      component.dtOptions.rowCallback(fakeRowNode(), { applId: 42, checkboxDisabled: true });

      expect(jq.on).not.toHaveBeenCalled();
    });

    it('rowCallback clears the disabled class/tooltip and wires a working click handler for an enabled row', () => {
      const jq = fakeJq();
      (window as any).$ = jasmine.createSpy('$').and.returnValue(jq);

      const data = { applId: 7, checkboxDisabled: false, selected: false };
      component.dtOptions.rowCallback(fakeRowNode(), data);

      expect(jq.removeClass).toHaveBeenCalledWith('disabled');
      expect(jq.removeAttr).toHaveBeenCalledWith('title');
      expect(jq.on).toHaveBeenCalledWith('click', jasmine.any(Function));

      // Simulate a click: selects the row.
      jq._trigger('click');
      expect(data.selected).toBeTrue();
      expect(component.selectedRows.has(7)).toBeTrue();
      expect(jq.toggleClass).toHaveBeenCalledWith('selected', true);

      // Click again: deselects the row.
      jq._trigger('click');
      expect(data.selected).toBeFalse();
      expect(component.selectedRows.has(7)).toBeFalse();
      expect(jq.toggleClass).toHaveBeenCalledWith('selected', false);
    });
  });

  describe('header checkbox: select/deselect all enabled rows on the current page (applySelectAllToggle)', () => {
    it('selects every enabled row on the page and leaves disabled rows untouched', () => {
      const pageData = [
        { applId: 1, checkboxDisabled: false, selected: false },
        { applId: 2, checkboxDisabled: true, selected: undefined },
        { applId: 3, existsInListSelectionDate: '2026-01-01', selected: undefined }
      ];

      const nowSelected = (component as any).applySelectAllToggle(pageData);

      expect(nowSelected).toBeTrue();
      expect(pageData[0].selected).toBeTrue();
      expect(component.selectedRows.has(1)).toBeTrue();

      // Disabled rows must not be touched by the header checkbox at all.
      expect(pageData[1].selected).toBeUndefined();
      expect(pageData[2].selected).toBeUndefined();
      expect(component.selectedRows.has(2)).toBeFalse();
      expect(component.selectedRows.has(3)).toBeFalse();
    });

    it('deselects every enabled row on the page when all are already selected (toggle back off)', () => {
      const pageData = [
        { applId: 1, checkboxDisabled: false, selected: false },
        { applId: 2, checkboxDisabled: true, selected: false }
      ];

      (component as any).applySelectAllToggle(pageData); // select all enabled rows
      const nowSelected = (component as any).applySelectAllToggle(pageData); // toggle back off

      expect(nowSelected).toBeFalse();
      expect(pageData[0].selected).toBeFalse();
      expect(component.selectedRows.has(1)).toBeFalse();
    });

    it('only considers rows on the given (current) page — a selection elsewhere does not affect allDataSelected() for this page', () => {
      const otherPageRow = { applId: 99, checkboxDisabled: false };
      component.selectedRows.set(99, otherPageRow as any);

      const currentPageData = [{ applId: 1, checkboxDisabled: false, selected: false }];
      expect(component.allDataSelected(currentPageData)).toBeFalse();

      (component as any).applySelectAllToggle(currentPageData);
      expect(component.allDataSelected(currentPageData)).toBeTrue();
      // The other page's selection is untouched either way.
      expect(component.selectedRows.has(99)).toBeTrue();
    });
  });
});
