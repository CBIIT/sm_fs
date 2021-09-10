import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApplicationsProposedForFundingReadonlyComponent } from './applications-proposed-for-funding-readonly.component';

describe('ApplicationsProposedForFundingReadonlyComponent', () => {
  let component: ApplicationsProposedForFundingReadonlyComponent;
  let fixture: ComponentFixture<ApplicationsProposedForFundingReadonlyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ApplicationsProposedForFundingReadonlyComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ApplicationsProposedForFundingReadonlyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
