import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProgramRecommendedCostsComponent } from './program-recommended-costs.component';

describe('ProgramRecommendedCostsComponent', () => {
  let component: ProgramRecommendedCostsComponent;
  let fixture: ComponentFixture<ProgramRecommendedCostsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProgramRecommendedCostsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProgramRecommendedCostsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
