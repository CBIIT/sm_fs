import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RequestInformationReadonlyComponent } from './request-information-readonly.component';

describe('FundingRequestReadonlyComponent', () => {
  let component: RequestInformationReadonlyComponent;
  let fixture: ComponentFixture<RequestInformationReadonlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RequestInformationReadonlyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RequestInformationReadonlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
