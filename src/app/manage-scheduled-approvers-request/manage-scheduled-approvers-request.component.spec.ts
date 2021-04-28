import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageScheduledApproversRequestComponent } from './manage-scheduled-approvers-request.component';

describe('ManageScheduledApproversRequestComponent', () => {
  let component: ManageScheduledApproversRequestComponent;
  let fixture: ComponentFixture<ManageScheduledApproversRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ManageScheduledApproversRequestComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageScheduledApproversRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
