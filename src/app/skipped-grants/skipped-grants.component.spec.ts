import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkippedGrantsComponent } from './skipped-grants.component';

describe('SkippedGrantsComponent', () => {
  let component: SkippedGrantsComponent;
  let fixture: ComponentFixture<SkippedGrantsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SkippedGrantsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SkippedGrantsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
