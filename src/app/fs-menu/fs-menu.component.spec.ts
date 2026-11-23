import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NGXLogger } from 'ngx-logger';
import { of } from 'rxjs';
import { FundingSubmissionsStateService } from '../funding-submissions/funding-submissions-state.service';
import { AppUserSessionService } from '../service/app-user-session.service';
import { roleNames } from '../service/role-names';
import { FsMenuComponent } from './fs-menu.component';
import { PaylistControllerService } from '@cbiit/i2efsws-lib';

@Component({ template: '' })
class TestRouteComponent {}

describe('FsMenuComponent', () => {
  let fixture: ComponentFixture<FsMenuComponent>;
  let component: FsMenuComponent;
  let activeRoles: Set<string>;
  let userSessionService: jasmine.SpyObj<AppUserSessionService>;
  let fundingSubmissionsStateService: jasmine.SpyObj<FundingSubmissionsStateService>;

  const createEnabledRoles = [
    roleNames.OEFIA_CERTIFIER,
    roleNames.DOC_FUNDING_LIST_COR,
    roleNames.FINANCIAL_ANALYST
  ];

  beforeEach(async () => {
    activeRoles = new Set<string>();
    userSessionService = jasmine.createSpyObj<AppUserSessionService>(
      'AppUserSessionService',
      ['hasRole', 'isPD', 'isPA']
    );
    userSessionService.hasRole.and.callFake((role: string) => activeRoles.has(role));
    userSessionService.isPD.and.returnValue(false);
    userSessionService.isPA.and.returnValue(false);

    fundingSubmissionsStateService = jasmine.createSpyObj<FundingSubmissionsStateService>(
      'FundingSubmissionsStateService',
      ['requestFreshNavigation']
    );
    const paylistControllerService = jasmine.createSpyObj<PaylistControllerService>(
      'PaylistControllerService',
      ['getPaylistPendingGrantsCount']
    );
    paylistControllerService.getPaylistPendingGrantsCount.and.returnValue(of(0) as any);

    await TestBed.configureTestingModule({
      declarations: [FsMenuComponent, TestRouteComponent],
      imports: [
        CommonModule,
        RouterTestingModule.withRoutes([
          { path: 'funding-submissions/lists', component: TestRouteComponent },
          { path: 'funding-submissions/create', component: TestRouteComponent }
        ])
      ],
      providers: [
        { provide: AppUserSessionService, useValue: userSessionService },
        { provide: PaylistControllerService, useValue: paylistControllerService },
        { provide: NGXLogger, useValue: { error: jasmine.createSpy('error') } },
        { provide: FundingSubmissionsStateService, useValue: fundingSubmissionsStateService }
      ]
    }).compileComponents();
  });

  function renderWithRoles(roles: string[]): void {
    activeRoles = new Set(roles);
    fixture = TestBed.createComponent(FsMenuComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function hasLink(label: string): boolean {
    return Array.from(fixture.nativeElement.querySelectorAll('a'))
      .some((anchor: HTMLAnchorElement) => anchor.textContent.trim() === label);
  }

  function expectFundingSubmissionsMenu(searchLists: boolean, createList: boolean): void {
    expect(hasLink('Funding Submissions')).toBe(searchLists);
    expect(hasLink('Search Lists')).toBe(searchLists);
    expect(hasLink('Create Funding List')).toBe(createList);
  }

  it('shows Search Lists but not Create to a GM Leadership-only user', () => {
    renderWithRoles([roleNames.GM_LEADERSHIP]);

    expectFundingSubmissionsMenu(true, false);
  });

  it('does not show Funding Submissions links when no qualifying role is present', () => {
    renderWithRoles([]);

    expectFundingSubmissionsMenu(false, false);
  });

  it('treats an inactive GM Leadership role as absent when no other qualifying role exists', () => {
    // The session service reports only active authorities, so an inactive role is absent here.
    renderWithRoles([]);

    expectFundingSubmissionsMenu(false, false);
  });

  createEnabledRoles.forEach((role) => {
    it(`preserves Search Lists and Create for ${role}`, () => {
      renderWithRoles([role]);

      expectFundingSubmissionsMenu(true, true);
    });

    it(`preserves Create for ${role} when combined with GM Leadership`, () => {
      renderWithRoles([role, roleNames.GM_LEADERSHIP]);

      expectFundingSubmissionsMenu(true, true);
    });

    [false, true].forEach((withGmLeadership) => {
      const roles = [role, roleNames.NCI_DIRECTOR];
      if (withGmLeadership) {
        roles.push(roleNames.GM_LEADERSHIP);
      }

      it(`hides Create for ${role} combined with NCI Director${withGmLeadership ? ' and GM Leadership' : ''}`, () => {
        renderWithRoles(roles);

        expectFundingSubmissionsMenu(true, false);
      });
    });
  });

  it('shows Search Lists but not Create for NCI Director, including with GM Leadership', () => {
    renderWithRoles([roleNames.NCI_DIRECTOR, roleNames.GM_LEADERSHIP]);

    expectFundingSubmissionsMenu(true, false);
  });

  it('preserves GM Leadership Paylists links', () => {
    renderWithRoles([roleNames.GM_LEADERSHIP]);

    expect(hasLink('Dashboard')).toBe(true);
    const pendingGrantsLink = Array.from(fixture.nativeElement.querySelectorAll('a'))
      .find((anchor: HTMLAnchorElement) => anchor.textContent.trim().startsWith('Pending Grants'));
    expect(pendingGrantsLink).toBeTruthy();
  });

  it('preserves navigation routes and fresh-navigation click behavior', async () => {
    renderWithRoles([roleNames.OEFIA_CERTIFIER]);

    const searchListsLink = Array.from(fixture.nativeElement.querySelectorAll('a'))
      .find((anchor: HTMLAnchorElement) => anchor.textContent.trim() === 'Search Lists') as HTMLAnchorElement;
    const createListLink = Array.from(fixture.nativeElement.querySelectorAll('a'))
      .find((anchor: HTMLAnchorElement) => anchor.textContent.trim() === 'Create Funding List') as HTMLAnchorElement;

    searchListsLink.click();
    expect(fundingSubmissionsStateService.requestFreshNavigation).toHaveBeenCalledTimes(1);
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/funding-submissions/lists');

    createListLink.click();
    expect(fundingSubmissionsStateService.requestFreshNavigation).toHaveBeenCalledTimes(2);
    await fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/funding-submissions/create');
  });
});
