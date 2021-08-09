import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanExceptionAppsComponent } from './plan-exception-apps.component';

describe('PlanExceptionAppsComponent', () => {
  let component: PlanExceptionAppsComponent;
  let fixture: ComponentFixture<PlanExceptionAppsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PlanExceptionAppsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PlanExceptionAppsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
