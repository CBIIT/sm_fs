import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';
import { NGXLogger } from 'ngx-logger';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FundingSubmissionsService } from '@cbiit/i2efsws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';
import { HttpClient } from '@angular/common/http';

import { SearchListsComponent } from './search-lists.component';
import { FundingSubmDropdownLookupService } from '../funding-subm-dropdown-lookup.service';

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

  function renderRemoveGrantsWarningModal() {
    const viewRef = (component as any).removeGrantsWarningModalRef.createEmbeddedView({});
    viewRef.detectChanges();
    const host = document.createElement('div');
    viewRef.rootNodes.forEach((node: Node) => host.appendChild(node));
    document.body.appendChild(host);
    return { host, viewRef };
  }

  function renderSendGrantsInDraftWarningModal() {
    const viewRef = (component as any).sendGrantsInDraftWarningModalRef.createEmbeddedView({});
    viewRef.detectChanges();
    const host = document.createElement('div');
    viewRef.rootNodes.forEach((node: Node) => host.appendChild(node));
    document.body.appendChild(host);
    return { host, viewRef };
  }

  beforeEach(async () => {
    // The component's ngOnInit() touches the global jQuery/DataTables plugin object
    // ($.fn.DataTable.ext.pager.numbers_length) which isn't loaded in the Karma test env.
    (window as any).$ = (window as any).$ || { fn: { DataTable: { ext: { pager: {} } } } };

    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    modalRefSpy = jasmine.createSpyObj('NgbModalRef', ['close', 'dismiss']);
    modalServiceSpy = jasmine.createSpyObj('NgbModal', ['open']);
    modalServiceSpy.open.and.returnValue(modalRefSpy);

    const fundingSubmissionsServiceSpy = jasmine.createSpyObj('FundingSubmissionsService', [
      'getListDetail', 'getListStatusHistory', 'removeGrantsFromList', 'sendListToDocsForReview'
    ]);
    fundingSubmissionsServiceSpy.getListDetail.and.returnValue(of({}));
    fundingSubmissionsServiceSpy.getListStatusHistory.and.returnValue(of([]));
    fundingSubmissionsServiceSpy.sendListToDocsForReview.and.returnValue(of(1));

    const propertiesServiceSpy = jasmine.createSpyObj('AppPropertiesService', ['getProperty']);
    propertiesServiceSpy.getProperty.and.returnValue('http://example/');

    const dropdownLookupServiceSpy = jasmine.createSpyObj('FundingSubmDropdownLookupService', ['getDocDecisions']);
    dropdownLookupServiceSpy.getDocDecisions.and.returnValue(of([
      { id: 'Pay', text: 'Pay' },
      { id: 'Do Not Pay', text: 'Do Not Pay' }
    ]));

    await TestBed.configureTestingModule({
      declarations: [SearchListsComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParams: of({}) } },
        { provide: Router, useValue: routerSpy },
        { provide: NGXLogger, useValue: jasmine.createSpyObj('NGXLogger', ['debug', 'error']) },
        { provide: AppPropertiesService, useValue: propertiesServiceSpy },
        { provide: FundingSubmissionsService, useValue: fundingSubmissionsServiceSpy },
        { provide: HttpClient, useValue: jasmine.createSpyObj('HttpClient', ['post']) },
        { provide: NgbModal, useValue: modalServiceSpy },
        { provide: FundingSubmDropdownLookupService, useValue: dropdownLookupServiceSpy }
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

  describe('Abs/SS plain text rendering (FS-2027)', () => {
    it('renders plain Y or blank with no anchor markup for Abs and SS columns', () => {
      component.ngAfterViewInit();
      const columns = (component as any).dtOptions.columns;
      const absRender = columns[1].render as (data: boolean) => string;
      const ssRender = columns[2].render as (data: boolean) => string;

      expect(absRender(true)).toBe('Y');
      expect(absRender(false)).toBe('');
      expect(ssRender(true)).toBe('Y');
      expect(ssRender(false)).toBe('');
      expect(absRender(true)).not.toContain('<a');
      expect(ssRender(true)).not.toContain('<a');
    });
  });

  it('warns with the funding-submissions copy (not a "funding submissionss" copy-paste artifact)', () => {
    expect((component as any).unsavedChangesWarningMessage).toBe(
      'Are you sure you want to navigate away from funding submissions edits? All unsaved changes will be lost.'
    );
  });

  describe('remove-grants confirmation modal copy (FS-2219)', () => {
    it('renders the exact interpolated count-and-list-name message', () => {
      component.selectionDate = '9-May 19th';
      component.selectedRows.set(100, {});
      component.selectedRows.set(101, {});
      component.selectedRows.set(102, {});

      const { host, viewRef } = renderRemoveGrantsWarningModal();

      expect(host.querySelector('.modal-body p')?.textContent?.trim())
        .toBe('Are you sure you want to remove 3 grant(s) from 9-May 19th?');

      viewRef.destroy();
      host.remove();
    });

    it('renders Yes/No labels and keeps the existing confirm/cancel handlers wired to those buttons', () => {
      const cancelSpy = spyOn(component, 'onCancelRemove');
      const confirmSpy = spyOn(component, 'onConfirmRemove');

      const { host, viewRef } = renderRemoveGrantsWarningModal();
      const buttons = Array.from(host.querySelectorAll('.modal-footer button')) as HTMLButtonElement[];

      expect(buttons.map(button => button.textContent?.trim())).toEqual(['No', 'Yes']);

      buttons[0].click();
      buttons[1].click();

      expect(cancelSpy).toHaveBeenCalledTimes(1);
      expect(confirmSpy).toHaveBeenCalledTimes(1);

      viewRef.destroy();
      host.remove();
    });
  });

  describe('send-grants confirmation modal', () => {
    it('renders expected title, explanatory copy, and Cancel/Ok, proceed buttons', () => {
      const { host, viewRef } = renderSendGrantsInDraftWarningModal();

      expect(host.querySelector('.modal-title')?.textContent?.trim()).toBe('Send Grants to DOCs');
      expect(host.querySelector('.modal-body')?.textContent).toContain('Clicking yes will send all grants currently in Draft status');
      expect(host.querySelector('.modal-body')?.textContent).toContain('Are you sure you want to Continue?');

      const buttons = Array.from(host.querySelectorAll('.modal-footer button')) as HTMLButtonElement[];
      expect(buttons.map(button => button.textContent?.trim())).toEqual(['Cancel', 'Ok, proceed']);

      viewRef.destroy();
      host.remove();
    });

    it('click handlers are wired: Cancel calls cancel and Ok, proceed calls confirm', () => {
      const cancelSpy = spyOn(component, 'onCancelSendGrantsInDraft');
      const confirmSpy = spyOn(component, 'onConfirmSendGrantsInDraft');
      const { host, viewRef } = renderSendGrantsInDraftWarningModal();

      const buttons = Array.from(host.querySelectorAll('.modal-footer button')) as HTMLButtonElement[];
      buttons[0].click();
      buttons[1].click();

      expect(cancelSpy).toHaveBeenCalledTimes(1);
      expect(confirmSpy).toHaveBeenCalledTimes(1);

      viewRef.destroy();
      host.remove();
    });

    it('onSendGrantsInDraftClick() opens the send-grants confirmation modal when there are no unsaved edits', () => {
      component.onSendGrantsInDraftClick();

      expect(modalServiceSpy.open).toHaveBeenCalledWith((component as any).sendGrantsInDraftWarningModalRef, { centered: true });
    });

    it('onConfirmSendGrantsInDraft() calls API and closes modal on success', () => {
      (component as any).sendGrantsInDraftModalRef = modalRefSpy;

      component.onConfirmSendGrantsInDraft();

      const fundingSvc = TestBed.inject(FundingSubmissionsService) as jasmine.SpyObj<FundingSubmissionsService>;
      expect(fundingSvc.sendListToDocsForReview).toHaveBeenCalledWith(component.listId);
      expect(modalRefSpy.close).toHaveBeenCalled();
      expect(component.sendGrantsToDocsSuccessMessage).toBe('Success! The list has been sent to the assigned DOC contacts for review.');
    });
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

    it('Send Grants in Draft: the guard blocks opening the send-to-DOCs modal until confirmed', () => {
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

    it('global side-nav paylist href navigation is guarded and opens the warning modal', () => {
      const anchor = document.createElement('a');
      anchor.href = '/paylist/#side-nav-paylists';

      const action = (component as any).buildGlobalAnchorNavigationAction(anchor);

      expect(action).toEqual(jasmine.any(Function));
      expect(modalServiceSpy.open).not.toHaveBeenCalled();

      const fakeEvent = {
        defaultPrevented: false,
        button: 0,
        metaKey: false,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        target: anchor,
        preventDefault: jasmine.createSpy('preventDefault'),
        stopPropagation: jasmine.createSpy('stopPropagation'),
        stopImmediatePropagation: jasmine.createSpy('stopImmediatePropagation')
      } as any;

      (component as any).handleGlobalAnchorNavigationIntent(fakeEvent);

      expect(fakeEvent.preventDefault).toHaveBeenCalled();
      expect(modalServiceSpy.open).toHaveBeenCalled();
    });

    it('does not globally guard routerLink anchors', () => {
      const anchor = document.createElement('a');
      anchor.href = '/funding-submissions/lists';
      anchor.setAttribute('routerLink', '/funding-submissions/lists');

      const action = (component as any).buildGlobalAnchorNavigationAction(anchor);

      expect(action).toBeNull();
    });

    it('does not globally guard same-page hash-only anchors', () => {
      const anchor = document.createElement('a');
      anchor.href = window.location.pathname + window.location.search + '#nav-collapse-paylist';

      const action = (component as any).buildGlobalAnchorNavigationAction(anchor);

      expect(action).toBeNull();
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

  // Prompt - Display NAME for DOC-NCI Selection and Annual-MYF (2026-08-25): the main grid's
  // DOC/NCI Sel and Annual or MYF columns must display the NAME-valued fields, not the CODE
  // fields used elsewhere for edit-dropdown pre-selection/save payload.
  describe('DOC/NCI Selection & Annual/MYF CODE-vs-NAME fix (2026-08-25)', () => {
    it('DOC/NCI Sel column binds to the NAME field (docNciSelectionName), not the CODE field', () => {
      const column = (component.dtOptions.columns as any[]).find(col => col.title === 'DOC/NCI Sel');
      expect(column.data).toBe('docNciSelectionName');
    });

    it('Annual or MYF column binds to the NAME field (annualOrMyfName), not the CODE field', () => {
      const column = (component.dtOptions.columns as any[]).find(col => col.title === 'Annual or MYF');
      expect(column.data).toBe('annualOrMyfName');
    });
  });

  // Display CODE vs NAME Reconciliation (2026-08-25): the "Grants in this List" grid's IMPAC II
  // Status column previously displayed impacStatus's raw opaque groupCode (e.g. "PA", "SR")
  // verbatim; it must now bind to the additive impacStatusDescrip field instead, matching every
  // other grid in sm_fs that shows an IMPAC II Status column.
  describe('IMPAC II Status CODE-vs-NAME fix (2026-08-25)', () => {
    it('IMPAC II Status column binds to the description field (impacStatusDescrip), not the raw code field', () => {
      const column = (component.dtOptions.columns as any[]).find(col => col.title === 'IMPAC II Status');
      expect(column.data).toBe('impacStatusDescrip');
    });
  });

  // Display CODE vs NAME Reconciliation (2026-08-25): docDecision's mock data currently defines
  // CODE and NAME as the same literal string, so this is future-proofing only, not a live-visible
  // fix — but the DOC Decision column renderer must resolve via FundingSubmDropdownLookupService
  // exactly like Grant Detail's read-only display, with the same fallback-to-raw-code behavior.
  describe('DOC Decision CODE-vs-NAME display fix (2026-08-25)', () => {
    it('DOC Decision column renders a known CODE as its NAME via docDecisionDisplayMap', () => {
      const column = (component.dtOptions.columns as any[]).find(col => col.title === 'DOC Decision');
      expect(column.render('Pay', null, {})).toBe('Pay');
      expect(column.render('Do Not Pay', null, {})).toBe('Do Not Pay');
    });

    it('DOC Decision column falls back to the raw code for an unresolvable value instead of throwing or blanking out', () => {
      const column = (component.dtOptions.columns as any[]).find(col => col.title === 'DOC Decision');
      expect(column.render('Some Future Code', null, {})).toBe('Some Future Code');
    });
  });
});
