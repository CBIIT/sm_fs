import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Type4ConversionMechanismComponent } from './type4-conversion-mechanism.component';

describe('Type4ConversionMechanismComponent', () => {
  let component: Type4ConversionMechanismComponent;
  let fixture: ComponentFixture<Type4ConversionMechanismComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ Type4ConversionMechanismComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Type4ConversionMechanismComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
