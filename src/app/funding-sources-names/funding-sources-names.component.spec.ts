import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FundingSourcesNamesComponent } from './funding-sources-names.component';

describe('FundingSourcesNamesComponent', () => {
  let component: FundingSourcesNamesComponent;
  let fixture: ComponentFixture<FundingSourcesNamesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FundingSourcesNamesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FundingSourcesNamesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
