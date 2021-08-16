import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FpDirectTotalCostComponent } from './fp-direct-total-cost.component';

describe('FpDirectTotalCostComponent', () => {
  let component: FpDirectTotalCostComponent;
  let fixture: ComponentFixture<FpDirectTotalCostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FpDirectTotalCostComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FpDirectTotalCostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
