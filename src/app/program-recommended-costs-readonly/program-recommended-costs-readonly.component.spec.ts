import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProgramRecommendedCostsReadonlyComponent } from './program-recommended-costs-readonly.component';

describe('ProgramRecommendedCostsReadonlyComponent', () => {
  let component: ProgramRecommendedCostsReadonlyComponent;
  let fixture: ComponentFixture<ProgramRecommendedCostsReadonlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ProgramRecommendedCostsReadonlyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ProgramRecommendedCostsReadonlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
