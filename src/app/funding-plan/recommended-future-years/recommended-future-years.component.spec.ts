import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecommendedFutureYearsComponent } from './recommended-future-years.component';

describe('RecommendedFutureYearsComponent', () => {
  let component: RecommendedFutureYearsComponent;
  let fixture: ComponentFixture<RecommendedFutureYearsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RecommendedFutureYearsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(RecommendedFutureYearsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
