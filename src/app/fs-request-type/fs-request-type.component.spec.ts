import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FsRequestTypeComponent } from './fs-request-type.component';

describe('FsRequestTypeComponent', () => {
  let component: FsRequestTypeComponent;
  let fixture: ComponentFixture<FsRequestTypeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ FsRequestTypeComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FsRequestTypeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
