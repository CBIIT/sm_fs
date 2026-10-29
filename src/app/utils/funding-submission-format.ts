import { FundingSubmissionListGrantDto } from '@cbiit/i2efsws-lib';

export type NciDecisionGrant = FundingSubmissionListGrantDto & {
  nciDecisionByName?: string;
  nciDecisionDate?: Date | string;
};

export function formatNciDecision(grant: NciDecisionGrant): string {
  const decision = String(grant?.nciDecision || '').trim();
  if (!decision) return '';

  const locked = !!grant.lockedDate;
  const name = String((locked ? grant.lockedBy : grant.nciDecisionByName) || '').trim();
  const date = formatFundingSubmissionDate(locked ? grant.lockedDate : grant.nciDecisionDate);
  return name && date ? `${decision}${locked ? ' and locked' : ''} by ${name} on ${date}` : decision;
}

export function formatFundingSubmissionDate(value: Date | string | null | undefined): string | null {
  if (value == null || value === '') return null;

  let year: number;
  let month: number;
  let day: number;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    year = value.getFullYear();
    month = value.getMonth() + 1;
    day = value.getDate();
  } else {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(?:Z|([+-])(\d{2}):(\d{2}))?)?$/.exec(value);
    if (!match) return null;

    year = Number(match[1]);
    month = Number(match[2]);
    day = Number(match[3]);
    if (match[4] !== undefined
      && (Number(match[4]) > 23 || Number(match[5]) > 59 || Number(match[6]) > 59)) return null;
    if (match[8] !== undefined) {
      const offsetHours = Number(match[9]);
      const offsetMinutes = Number(match[10]);
      if (offsetHours > 18 || offsetMinutes > 59 || (offsetHours === 18 && offsetMinutes !== 0)) return null;
    }
  }

  if (year < 0 || year > 9999 || month < 1 || month > 12 || day < 1) return null;
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysInMonth[month - 1]) return null;
  return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${String(year).padStart(4, '0')}`;
}