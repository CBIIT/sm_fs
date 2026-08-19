import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { LookupsControllerService } from '@cbiit/i2ecommonws-lib';
import { NGXLogger } from 'ngx-logger';

import { DocSelectComponent } from './doc-select.component';

describe('DocSelectComponent', () => {
  let component: DocSelectComponent;
  let fixture: ComponentFixture<DocSelectComponent>;
  let lookupsControllerServiceSpy: jasmine.SpyObj<LookupsControllerService>;
  let loggerSpy: jasmine.SpyObj<NGXLogger>;

  const mockDocs = [
    { abbreviation: 'DCP', description: 'Division of Cancer Prevention' },
    { abbreviation: 'DCTD', description: 'Division of Cancer Treatment and Diagnosis' },
  ];

  beforeEach(async () => {
    lookupsControllerServiceSpy = jasmine.createSpyObj('LookupsControllerService', ['getNciDocs']);
    lookupsControllerServiceSpy.getNciDocs.and.returnValue(of(mockDocs) as any);
    loggerSpy = jasmine.createSpyObj('NGXLogger', ['info', 'error', 'warn', 'debug']);

    await TestBed.configureTestingModule({
      imports: [FormsModule],
      declarations: [DocSelectComponent],
      providers: [
        { provide: LookupsControllerService, useValue: lookupsControllerServiceSpy },
        { provide: NGXLogger, useValue: loggerSpy },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(DocSelectComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should call getNciDocs and populate docs on init', () => {
    fixture.detectChanges();
    expect(lookupsControllerServiceSpy.getNciDocs).toHaveBeenCalled();
    expect(component.docs).toEqual(mockDocs);
  });
});
