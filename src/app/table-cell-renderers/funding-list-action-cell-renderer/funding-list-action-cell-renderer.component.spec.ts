import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FundingListActionCellRendererComponent } from './funding-list-action-cell-renderer.component';

describe('FundingListActionCellRendererComponent', () => {
  let component: FundingListActionCellRendererComponent;
  let fixture: ComponentFixture<FundingListActionCellRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FundingListActionCellRendererComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FundingListActionCellRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
