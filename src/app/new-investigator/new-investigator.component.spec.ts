import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewInvestigatorComponent } from './new-investigator.component';

describe('NewInvestigatorComponent', () => {
  let component: NewInvestigatorComponent;
  let fixture: ComponentFixture<NewInvestigatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NewInvestigatorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NewInvestigatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
