import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FundingSourceEntryModalComponent } from './funding-source-entry-modal.component';

describe('FundingSourceEntryModalComponent', () => {
  let component: FundingSourceEntryModalComponent;
  let fixture: ComponentFixture<FundingSourceEntryModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FundingSourceEntryModalComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FundingSourceEntryModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
