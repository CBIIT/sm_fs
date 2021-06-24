import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApprovedCostsComponent } from './approved-costs.component';

describe('ApprovedCostsComponent', () => {
  let component: ApprovedCostsComponent;
  let fixture: ComponentFixture<ApprovedCostsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ApprovedCostsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ApprovedCostsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
