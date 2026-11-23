import { Component } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { FundingSaveProgressService } from './funding-save-progress.service';
import { withFundingSaveNavigationGuard } from './funding-save-navigation.guard';

@Component({ standalone: true, selector: 'app-test-list-page', template: 'list' })
class ListPageComponent {}

@Component({ standalone: true, selector: 'app-test-other-page', template: 'other' })
class OtherPageComponent {}

describe('withFundingSaveNavigationGuard (real router)', () => {
  let router: Router;
  let location: Location;
  let saveProgress: FundingSaveProgressService;
  let pageGuard: jasmine.Spy;

  beforeEach(fakeAsync(() => {
    pageGuard = jasmine.createSpy('page canDeactivate').and.returnValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          withFundingSaveNavigationGuard({ path: 'search', component: ListPageComponent, canDeactivate: [pageGuard] }),
          { path: 'other', component: OtherPageComponent }
        ]),
        provideLocationMocks()
      ]
    });
    // The harness supplies an activated root outlet, as the app shell does.
    RouterTestingHarness.create();
    tick();
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);
    saveProgress = TestBed.inject(FundingSaveProgressService);
  }));

  function navigate(url: string): boolean {
    let result: boolean;
    router.navigateByUrl(url).then(value => result = value);
    tick();
    return result;
  }

  it('leaves query-parameter route reuse and the page guard unchanged while no save is active', fakeAsync(() => {
    expect(navigate('/search?listId=1')).toBeTrue();
    expect(navigate('/search?listId=2')).toBeTrue();
    expect(pageGuard).not.toHaveBeenCalled();
    expect(navigate('/other')).toBeTrue();
    expect(pageGuard).toHaveBeenCalledTimes(1);
  }));

  it('blocks same-route listId changes, Back, and route changes while a save is active', fakeAsync(() => {
    navigate('/search?listId=1');
    navigate('/search?listId=2');
    const token = saveProgress.begin();

    expect(navigate('/search?listId=3')).toBeFalse();
    expect(router.url).toBe('/search?listId=2');

    location.back();
    tick();
    expect(router.url).toBe('/search?listId=2');

    expect(navigate('/other')).toBeFalse();
    expect(router.url).toBe('/search?listId=2');

    saveProgress.end(token);
    expect(navigate('/search?listId=3')).toBeTrue();
    expect(router.url).toBe('/search?listId=3');
  }));
});
