import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConversionGrantActivityMechComponent } from './conversion-grant-activity-mech.component';

describe('ConversionGrantActivityMechComponent', () => {
  let component: ConversionGrantActivityMechComponent;
  let fixture: ComponentFixture<ConversionGrantActivityMechComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConversionGrantActivityMechComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConversionGrantActivityMechComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
