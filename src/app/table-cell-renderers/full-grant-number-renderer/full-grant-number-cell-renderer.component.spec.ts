import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NgbTooltip, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { FullGrantNumberCellRendererComponent } from './full-grant-number-cell-renderer.component';

describe('FullGrantNumberCellRendererComponent recused institution icon', () => {
  let fixture: ComponentFixture<FullGrantNumberCellRendererComponent>;
  let component: FullGrantNumberCellRendererComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FullGrantNumberCellRendererComponent],
      imports: [NgbTooltipModule]
    }).compileComponents();
    fixture = TestBed.createComponent(FullGrantNumberCellRendererComponent);
    component = fixture.componentInstance;
  });

  for (const recusedFlag of [true, false, null, undefined]) {
    it(`renders the correct institution icon for recusedFlag ${recusedFlag}`, async () => {
      component.data = { applId: 100, grantNumber: '1R01CA123456-01', recusedFlag };
      fixture.detectChanges();

      const image = fixture.nativeElement.querySelector('img[src="images/institution-recused.svg"]') as HTMLImageElement;
      const standardIcon = fixture.nativeElement.querySelector('.fa-university');
      if (recusedFlag === true) {
        expect(image).not.toBeNull();
        await image.decode();
        expect(image.naturalWidth).toBe(18);
        expect(image.naturalHeight).toBe(16);
        expect(image.width).toBe(18);
        expect(image.height).toBe(16);
        expect(image.alt).toBe('Recused institution');
        expect(standardIcon).toBeNull();
      } else {
        expect(image).toBeNull();
        expect(standardIcon).not.toBeNull();
      }
    });
  }

  it('preserves the institution tooltip and prevents navigation for the SVG icon', () => {
    component.data = { grantNumber: '1R01CA123456-01', institution: 'Example University', recusedFlag: true };
    fixture.detectChanges();
    const anchor = fixture.debugElement.query(By.css('img')).parent;
    expect(anchor.injector.get(NgbTooltip).ngbTooltip).toBe('Example University (Recused)');
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    anchor.nativeElement.dispatchEvent(event);
    expect(event.defaultPrevented).toBeTrue();
  });

  describe('recused institution tooltip', () => {
    const cases = [
      { data: { orgName: ' Example University ', institutionCity: ' Bethesda ', institutionState: ' MD ' }, expected: 'Example University\nBethesda, MD (Recused)' },
      { data: { institution: 'Example University' }, expected: 'Example University (Recused)' },
      { data: { institutionCity: 'Bethesda', institutionState: 'MD' }, expected: 'Bethesda, MD (Recused)' },
      { data: {}, expected: 'View Grantee Institution. (Recused)' }
    ];

    for (const { data, expected } of cases) {
      it(`builds "${expected}" for a recused grant`, () => {
        component.data = { ...data, grantNumber: '1R01CA123456-01', recusedFlag: true };
        fixture.detectChanges();
        expect(component.instituteTooltip).toBe(expected);
        const tooltips = fixture.debugElement.queryAll(By.directive(NgbTooltip))
          .map(element => element.injector.get(NgbTooltip).ngbTooltip);
        expect(tooltips).toContain(expected);
      });
    }

    for (const recusedFlag of [false, null, undefined, 'true', 1]) {
      it(`does not append Recused for ${String(recusedFlag)} (${typeof recusedFlag})`, () => {
        component.data = { institution: 'Example University', institutionCity: 'Bethesda', institutionState: 'MD', recusedFlag };
        expect(component.instituteTooltip).toBe('Example University\nBethesda, MD');
      });
    }
  });

  it('keeps the fullGrantNum institution icon unchanged', () => {
    component.data = { fullGrantNum: '1R01CA123456-01', recusedFlag: true };
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.querySelector('.fa-university')).not.toBeNull();
  });
});