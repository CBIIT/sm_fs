import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FundingSubmissionsControllerService } from '@cbiit/i2efsws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { HttpClient } from '@angular/common/http';

import { SearchListsComponent } from './search-lists.component';

describe('SearchListsComponent — unsaved-changes warning trigger coverage (FS-2045)', () => {
  let component: SearchListsComponent;
  let fixture: ComponentFixture<SearchListsComponent>;
  let routerSpy: jasmine.SpyObj<Router>;
  let modalServiceSpy: jasmine.SpyObj<NgbModal>;
  let modalRefSpy: jasmine.SpyObj<any>;

  // Minimal stand-in for the dynamically created GrantDetailComponent ComponentRef
  // that executeWithUnsavedGuard()/hasUnsavedDetailEdits() actually query.
  function fakeDetailComponentRef(hasUnsavedChanges: boolean, opts: { saveInProgress?: boolean; suppressLeavePrompt?: boolean } = {}) {
    return {
      instance: {
        hasUnsavedChanges: () => hasUnsavedChanges,
        isSaveInProgress: () => !!opts.saveInProgress,
        consumeSuppressNextLeavePrompt: () => !!opts.suppressLeavePrompt,
        forceDiscardAndClose: jasmine.createSpy('forceDiscardAndClose')
      },
      destroy: jasmine.createSpy('destroy')
    };
  }

  beforeEach(async () => {
    // The component's ngOnInit() touches the global jQuery/DataTables plugin object
    // ($.fn.DataTable.ext.pager.numbers_length) which isn't loaded in the Karma test env.
    (window as any).$ = (window as any).$ || { fn: { DataTable: { ext: { pager: {} } } } };

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    modalRefSpy = jasmine.createSpyObj('NgbModalRef', ['close', 'dismiss']);
    modalServiceSpy = jasmine.createSpyObj('NgbModal', ['open']);
    modalServiceSpy.open.and.returnValue(modalRefSpy);

    const fundingSubmissionsServiceSpy = jasmine.createSpyObj('FundingSubmissionsControllerService', [
      'getListDetail', 'getListStatusHistory', 'removeGrantsFromList'
    ]);
    fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({}));
    fundingSubmissionsServiceSpy.getListStatusHistory.and.returnValue(of([]));

    const propertiesServiceSpy = jasmine.createSpyObj('AppPropertiesService', ['getProperty']);
    propertiesServiceSpy.getProperty.and.returnValue('http://example/');

    await TestBed.configureTestingModule({
      declarations: [SearchListsComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: Router, useValue: routerSpy },
        { provide: NGXLogger, useValue: jasmine.createSpyObj('NGXLogger', ['debug', 'error']) },
        { provide: AppPropertiesService, useValue: propertiesServiceSpy },
        { provide: FundingSubmissionsControllerService, useValue: fundingSubmissionsServiceSpy },
        { provide: HttpClient, useValue: jasmine.createSpyObj('HttpClient', ['post']) },
        { provide: NgbModal, useValue: modalServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchListsComponent);
    component = fixture.componentInstance;
    // ngOnInit only (skip ngAfterViewInit — that wires up the live DataTables instance,
    // which isn't needed to exercise the guard logic under test here).
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('warns with the funding-submissions copy (not a "funding submissionss" copy-paste artifact)', () => {
    expect((component as any).unsavedChangesWarningMessage).toBe(
      'WARNING! Are you sure you want to navigate away from funding submissions edits? All unsaved changes will be lost.'
    );
  });

  describe('when a detail row has unsaved edits', () => {
    beforeEach(() => {
      (component as any).detailComponentsByApplId.set(100, fakeDetailComponentRef(true));
    });

    it('Back to Lists: opens the warning modal instead of navigating immediately', () => {
      component.onBackToListClick();
      expect(modalServiceSpy.open).toHaveBeenCalled();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('Send Grants in Draft: the guard blocks the (stub) action until confirmed', () => {
      component.onSendGrantsInDraftClick();
      expect(modalServiceSpy.open).toHaveBeenCalled();
    });

    it('Bulk Edit: is guarded and does not navigate until confirmed', () => {
      component.onBulkEditClick();
      expect(modalServiceSpy.open).toHaveBeenCalled();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('Add Grants to List: is guarded and does not navigate until confirmed', () => {
      component.onAddGrantsToListClick();
      expect(modalServiceSpy.open).toHaveBeenCalled();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('Remove Selected Grants: is guarded and does not open the remove-confirmation modal until confirmed', () => {
      component.selectedRows.set(100, {});
      component.onRemoveSelectedClick();
      expect(modalServiceSpy.open).toHaveBeenCalledTimes(1);
    });

    it('canDeactivate(): blocks route navigation and opens the warning modal', () => {
      const result = component.canDeactivate();
      expect(result).not.toBe(true);
      (result as any).subscribe(() => {
        // not resolved yet — no decision made
      });
      expect(modalServiceSpy.open).toHaveBeenCalled();
    });

    it('onConfirmUnsavedWarning(): discards unsaved edits and completes the original guarded action', () => {
      const detailRef = (component as any).detailComponentsByApplId.get(100);
      component.onBackToListClick();
      expect(modalServiceSpy.open).toHaveBeenCalled();

      component.onConfirmUnsavedWarning();

      expect(detailRef.instance.forceDiscardAndClose).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith([component.backRoute]);
      expect(modalRefSpy.close).toHaveBeenCalled();
    });

    it('onCancelUnsavedWarning(): retains edits and does NOT perform the original action', () => {
      const detailRef = (component as any).detailComponentsByApplId.get(100);
      component.onBackToListClick();
      expect(modalServiceSpy.open).toHaveBeenCalled();

      component.onCancelUnsavedWarning();

      expect(detailRef.instance.forceDiscardAndClose).not.toHaveBeenCalled();
      expect(routerSpy.navigate).not.toHaveBeenCalled();
      expect(modalRefSpy.dismiss).toHaveBeenCalled();
    });

    it('canDeactivate(): confirming the warning resolves the observable with true (allow navigation)', (done) => {
      const result = component.canDeactivate();
      (result as any).subscribe((allow: boolean) => {
        expect(allow).toBeTrue();
        done();
      });
      component.onConfirmUnsavedWarning();
    });

    it('canDeactivate(): cancelling the warning resolves the observable with false (block navigation)', (done) => {
      const result = component.canDeactivate();
      (result as any).subscribe((allow: boolean) => {
        expect(allow).toBeFalse();
        done();
      });
      component.onCancelUnsavedWarning();
    });

    it('respects consumeChildLeavePromptSuppression() as a one-shot bypass for canDeactivate()', () => {
      (component as any).detailComponentsByApplId.set(100, fakeDetailComponentRef(true, { suppressLeavePrompt: true }));
      const result = component.canDeactivate();
      expect(result).toBe(true);
      expect(modalServiceSpy.open).not.toHaveBeenCalled();
    });

    it('ignores rows whose save is currently in progress when computing hasUnsavedDetailEdits()', () => {
      (component as any).detailComponentsByApplId.clear();
      (component as any).detailComponentsByApplId.set(100, fakeDetailComponentRef(true, { saveInProgress: true }));

      component.onBackToListClick();

      expect(modalServiceSpy.open).not.toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith([component.backRoute]);
    });
  });

  describe('when no detail row has unsaved edits', () => {
    it('Back to Lists: navigates immediately without opening the warning modal', () => {
      component.onBackToListClick();
      expect(modalServiceSpy.open).not.toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith([component.backRoute]);
    });

    it('canDeactivate(): allows navigation immediately (returns true)', () => {
      expect(component.canDeactivate()).toBe(true);
      expect(modalServiceSpy.open).not.toHaveBeenCalled();
    });
  });

  // Prompt - Grant Detail Cancel Reverts to Read-Only (2026-08-25): GrantDetailComponent's
  // `close` output (chevron collapse) must still fully tear the row down; the new
  // `editModeExited` output (Cancel, either path) must be a no-op with respect to DOM teardown.
  // These handlers are extracted onto the component precisely so they're unit-testable without
  // going through the DataTables-driven `.toggle-details` click wiring (untestable in this spec
  // today, since ngAfterViewInit/DataTables init is deliberately skipped — see beforeEach above).
  describe('detail row output wiring (close vs. editModeExited)', () => {
    function fakeRow(shown: boolean) {
      return {
        child: {
          isShown: () => shown,
          hide: jasmine.createSpy('hide')
        }
      };
    }

    function fakeJq() {
      const jq: any = {
        removeClass: jasmine.createSpy('removeClass').and.callFake(() => jq),
        addClass: jasmine.createSpy('addClass').and.callFake(() => jq)
      };
      return jq;
    }

    it('handleDetailRowClose(): destroys the component, removes it from the map, and hides/collapses the row when shown', () => {
      const componentRef = { destroy: jasmine.createSpy('destroy') };
      const row = fakeRow(true);
      const tr = fakeJq();
      const toggleIcon = fakeJq();
      (component as any).detailComponentsByApplId.set(100, componentRef);

      (component as any).handleDetailRowClose(componentRef, 100, row, tr, toggleIcon);

      expect(componentRef.destroy).toHaveBeenCalled();
      expect((component as any).detailComponentsByApplId.has(100)).toBeFalse();
      expect(row.child.hide).toHaveBeenCalled();
      expect(tr.removeClass).toHaveBeenCalledWith('shown');
      expect(toggleIcon.removeClass).toHaveBeenCalledWith('fa-minus-circle');
      expect(toggleIcon.addClass).toHaveBeenCalledWith('fa-plus-circle');
    });

    it('handleDetailEditModeExited(): does not destroy the component, remove it from the map, or touch row/DOM teardown state', () => {
      const componentRef = { destroy: jasmine.createSpy('destroy') };
      const row = fakeRow(true);
      (component as any).detailComponentsByApplId.set(100, componentRef);

      (component as any).handleDetailEditModeExited();

      expect(componentRef.destroy).not.toHaveBeenCalled();
      expect((component as any).detailComponentsByApplId.has(100)).toBeTrue();
      expect(row.child.hide).not.toHaveBeenCalled();
    });
  });

  // Prompt - Grant Detail Save Refresh (List and Own Display) (2026-08-25): GrantDetailComponent's
  // `saved` output means "the row's underlying data object was just mutated in place" — DataTables
  // caches rendered <td> content and needs an explicit invalidate()+draw() to reflect it. This
  // handler must NOT tear down or collapse the detail row (contrast with handleDetailRowClose()).
  describe('detail row output wiring (saved)', () => {
    function fakeInvalidatingRow(shown: boolean) {
      const api = { draw: jasmine.createSpy('draw') };
      return {
        child: {
          isShown: () => shown,
          hide: jasmine.createSpy('hide')
        },
        invalidate: jasmine.createSpy('invalidate').and.returnValue(api),
        drawApi: api
      };
    }

    it('handleDetailSaved(): calls row.invalidate().draw(false) for the correct row', () => {
      const row = fakeInvalidatingRow(true);

      (component as any).handleDetailSaved(row);

      expect(row.invalidate).toHaveBeenCalledTimes(1);
      expect(row.drawApi.draw).toHaveBeenCalledWith(false);
    });

    it('handleDetailSaved(): does NOT tear down or collapse the detail row', () => {
      const componentRef = { destroy: jasmine.createSpy('destroy') };
      const row = fakeInvalidatingRow(true);
      (component as any).detailComponentsByApplId.set(100, componentRef);

      (component as any).handleDetailSaved(row);

      expect(componentRef.destroy).not.toHaveBeenCalled();
      expect((component as any).detailComponentsByApplId.has(100)).toBeTrue();
      expect(row.child.hide).not.toHaveBeenCalled();
    });
  });
});
