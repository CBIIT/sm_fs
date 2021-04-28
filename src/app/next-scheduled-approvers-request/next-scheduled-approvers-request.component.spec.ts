import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NextScheduledApproversRequestComponent } from './next-scheduled-approvers-request.component';

describe('ManageScheduledApproversRequestComponent', () => {
  let component: NextScheduledApproversRequestComponent;
  let fixture: ComponentFixture<NextScheduledApproversRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NextScheduledApproversRequestComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NextScheduledApproversRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
