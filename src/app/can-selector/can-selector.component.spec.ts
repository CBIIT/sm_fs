import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CanSelectorComponent } from './can-selector.component';

describe('CanSelectorComponent', () => {
  let component: CanSelectorComponent;
  let fixture: ComponentFixture<CanSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CanSelectorComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CanSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
