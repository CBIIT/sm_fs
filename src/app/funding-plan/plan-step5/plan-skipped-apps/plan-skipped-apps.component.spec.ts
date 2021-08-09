import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanSkippedAppsComponent } from './plan-skipped-apps.component';

describe('PlanSkippedAppsComponent', () => {
  let component: PlanSkippedAppsComponent;
  let fixture: ComponentFixture<PlanSkippedAppsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlanSkippedAppsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PlanSkippedAppsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
