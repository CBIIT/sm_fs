import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { of, Subject } from 'rxjs';
import { NGXLogger } from 'ngx-logger';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FundingSubmissionsControllerService } from '@cbiit/i2efsws-lib';
import { AppPropertiesService } from '@cbiit/i2ecui-lib';

import { GrantDetailComponent } from './grant-detail.component';
import { FundingSubmDropdownLookupService } from '../../funding-subm-dropdown-lookup.service';

describe('GrantDetailComponent', () => {
  let component: GrantDetailComponent;
  let fixture: ComponentFixture<GrantDetailComponent>;
  let fundingSubmissionsServiceSpy: jasmine.SpyObj<FundingSubmissionsControllerService>;
  let getJustificationSubject: Subject<any>;

  beforeEach(async () => {
    getJustificationSubject = new Subject<any>();

    fundingSubmissionsServiceSpy = jasmine.createSpyObj('FundingSubmissionsControllerService', [
      'getJustification', 'saveJustificationForm', 'bulkUpdateListGrants'
    ]);
    fundingSubmissionsServiceSpy.getJustification.and.returnValue(getJustificationSubject.asObservable());

    const dropdownLookupServiceSpy = jasmine.createSpyObj('FundingSubmDropdownLookupService', [
      'getDocDecisions', 'getAnnualFundingR01Options', 'getAnnualOrMyfOptions',
      'getBudgetCategories', 'getDocNciSelections'
    ]);
    dropdownLookupServiceSpy.getDocDecisions.and.returnValue(of([]));
    dropdownLookupServiceSpy.getAnnualFundingR01Options.and.returnValue(of([]));
    dropdownLookupServiceSpy.getAnnualOrMyfOptions.and.returnValue(of([]));
    dropdownLookupServiceSpy.getBudgetCategories.and.returnValue(of([]));
    dropdownLookupServiceSpy.getDocNciSelections.and.returnValue(of([]));

    const propertiesServiceSpy = jasmine.createSpyObj('AppPropertiesService', ['getProperty']);
    propertiesServiceSpy.getProperty.and.returnValue('http://grant-viewer/');

    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [GrantDetailComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: FundingSubmissionsControllerService, useValue: fundingSubmissionsServiceSpy },
        { provide: FundingSubmDropdownLookupService, useValue: dropdownLookupServiceSpy },
        { provide: AppPropertiesService, useValue: propertiesServiceSpy },
        { provide: NGXLogger, useValue: jasmine.createSpyObj('NGXLogger', ['debug', 'error']) },
        { provide: NgbModal, useValue: jasmine.createSpyObj('NgbModal', ['open']) }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(GrantDetailComponent);
    component = fixture.componentInstance;
    component.listId = 1;
    component.data = { applId: 100, grantNumber: '1R01CA123456-01', justificationText: '' };
  });

  it('should create', () => {
    fixture.detectChanges();
    getJustificationSubject.complete();
    expect(component).toBeTruthy();
  });

  it('should not populate the form from onEdit() until the initial justification fetch resolves', () => {
    fixture.detectChanges(); // ngOnInit() -> refreshJustificationData() (in flight)

    expect(component.justificationLoaded).toBeFalse();

    // Simulate a click on the (still-disabled) Edit button before the fetch resolves.
    component.onEdit();
    expect(component.isEditMode).toBeFalse();
    expect(component.formModel.justificationText).toBeUndefined();

    // Fetch resolves with a previously-saved justification.
    getJustificationSubject.next({ justificationText: 'Previously saved justification' });
    getJustificationSubject.complete();

    expect(component.justificationLoaded).toBeTrue();
    expect(component.data.justificationText).toBe('Previously saved justification');

    // Now Edit is expected to work and pick up the resolved value.
    component.onEdit();
    expect(component.isEditMode).toBeTrue();
    expect(component.formModel.justificationText).toBe('Previously saved justification');
  });

  it('should populate the form correctly once a delayed fetch resolves, instead of leaving it blank', () => {
    fixture.detectChanges();

    getJustificationSubject.next({ justificationText: 'Delayed justification text' });
    getJustificationSubject.complete();

    component.onEdit();

    expect(component.formModel.justificationText).toBe('Delayed justification text');
  });

  it('should still allow Edit mode to be reached if the justification fetch errors out', () => {
    fixture.detectChanges();

    expect(component.justificationLoaded).toBeFalse();

    getJustificationSubject.error(new Error('network error'));

    expect(component.justificationLoaded).toBeTrue();

    component.onEdit();
    expect(component.isEditMode).toBeTrue();
  });

  it('should reset justificationLoaded to false and re-fetch on ngOnChanges() for a new row', () => {
    fixture.detectChanges();
    getJustificationSubject.next({ justificationText: 'first row text' });
    getJustificationSubject.complete();
    expect(component.justificationLoaded).toBeTrue();

    getJustificationSubject = new Subject<any>();
    fundingSubmissionsServiceSpy.getJustification.and.returnValue(getJustificationSubject.asObservable());

    component.data = { applId: 200, grantNumber: '1R01CA654321-01', justificationText: '' };
    component.ngOnChanges({ data: {} as any });

    expect(component.justificationLoaded).toBeFalse();

    getJustificationSubject.next({ justificationText: 'second row text' });
    getJustificationSubject.complete();
    expect(component.justificationLoaded).toBeTrue();
  });
});
