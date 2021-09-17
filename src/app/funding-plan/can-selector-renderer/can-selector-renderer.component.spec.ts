import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CanSelectorRendererComponent } from './can-selector-renderer.component';

describe('CanSelectorRendererComponent', () => {
  let component: CanSelectorRendererComponent;
  let fixture: ComponentFixture<CanSelectorRendererComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CanSelectorRendererComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CanSelectorRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
