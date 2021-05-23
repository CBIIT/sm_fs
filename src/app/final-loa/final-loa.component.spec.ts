import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FinalLoaComponent } from './final-loa.component';

describe('FinalLoaComponent', () => {
  let component: FinalLoaComponent;
  let fixture: ComponentFixture<FinalLoaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FinalLoaComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FinalLoaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
