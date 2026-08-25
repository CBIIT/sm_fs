import { FundingListsSearchComponent } from './funding-lists-search.component';

describe('FundingListsSearchComponent.formatLastActionDate (FS-2163)', () => {
  it('returns empty string for falsy input', () => {
    expect(FundingListsSearchComponent.formatLastActionDate(null)).toBe('');
    expect(FundingListsSearchComponent.formatLastActionDate(undefined)).toBe('');
    expect(FundingListsSearchComponent.formatLastActionDate('')).toBe('');
  });

  it('formats a date-only string (YYYY-MM-DD) as MM/DD/YYYY without a UTC/local day-boundary shift', () => {
    // Regression guard for FS-2163: previously `new Date('2026-08-25')` was parsed as UTC
    // midnight, then read back with local getters, displaying 08/24/2026 in timezones behind UTC.
    expect(FundingListsSearchComponent.formatLastActionDate('2026-08-25')).toBe('08/25/2026');
    expect(FundingListsSearchComponent.formatLastActionDate('2026-01-01')).toBe('01/01/2026');
    expect(FundingListsSearchComponent.formatLastActionDate('2026-12-31')).toBe('12/31/2026');
  });

  it('falls back to Date parsing for non date-only strings', () => {
    const result = FundingListsSearchComponent.formatLastActionDate('2026-08-25T14:20:07');
    expect(result).toMatch(/^\d{2}\/\d{2}\/2026$/);
  });

  it('returns the original string when the value cannot be parsed as a date', () => {
    expect(FundingListsSearchComponent.formatLastActionDate('not-a-date')).toBe('not-a-date');
  });
});
