import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlertBillboardComponent } from './alert-billboard.component';

describe('AlertBillboardComponent', () => {
  let component: AlertBillboardComponent;
  let fixture: ComponentFixture<AlertBillboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AlertBillboardComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(AlertBillboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
