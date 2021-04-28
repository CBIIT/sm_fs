import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NextScheduledApproversReadonlyComponent } from './next-scheduled-approvers-readonly.component';

describe('NextScheduledApproversReadonlyComponent', () => {
  let component: NextScheduledApproversReadonlyComponent;
  let fixture: ComponentFixture<NextScheduledApproversReadonlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NextScheduledApproversReadonlyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NextScheduledApproversReadonlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
