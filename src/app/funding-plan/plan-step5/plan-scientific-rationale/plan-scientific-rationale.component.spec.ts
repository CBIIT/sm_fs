import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanScientificRationaleComponent } from './plan-scientific-rationale.component';

describe('PlanScientificRationaleComponent', () => {
  let component: PlanScientificRationaleComponent;
  let fixture: ComponentFixture<PlanScientificRationaleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlanScientificRationaleComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PlanScientificRationaleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
