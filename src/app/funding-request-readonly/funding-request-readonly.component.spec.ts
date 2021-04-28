import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FundingRequestReadonlyComponent } from './funding-request-readonly.component';

describe('FundingRequestReadonlyComponent', () => {
  let component: FundingRequestReadonlyComponent;
  let fixture: ComponentFixture<FundingRequestReadonlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FundingRequestReadonlyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FundingRequestReadonlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
