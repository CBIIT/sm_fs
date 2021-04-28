import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NextScheduledApproversRequestReadonlyComponent } from './next-scheduled-approvers-request-readonly.component';

describe('NextScheduledApproversReadonlyComponent', () => {
  let component: NextScheduledApproversRequestReadonlyComponent;
  let fixture: ComponentFixture<NextScheduledApproversRequestReadonlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NextScheduledApproversRequestReadonlyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NextScheduledApproversRequestReadonlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
