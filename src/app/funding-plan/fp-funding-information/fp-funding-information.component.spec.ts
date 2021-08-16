import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FpFundingInformationComponent } from './fp-funding-information.component';

describe('FpFundingInformationComponent', () => {
  let component: FpFundingInformationComponent;
  let fixture: ComponentFixture<FpFundingInformationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FpFundingInformationComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FpFundingInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
