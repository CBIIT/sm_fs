import { FundingSourceTypes } from '../model/request/funding-source-types';

export function getCurrentFiscalYear(): number {
  const today = new Date();
  const curMonth = today.getMonth();
  return (curMonth >= 9) ? today.getFullYear() + 1 : today.getFullYear();
}

//  opens   the URL in a new browser window
export function openNewWindow(url, windowName): void {
  // TODO - review and eliminate winName
  const winName = windowName; // This is not necessary since it's not being changed
  const features = 'menubar=yes,scrollbars=yes,resizable=yes,width=850,height=700';
  const newWin = window.open(url, winName, features);
  if (newWin != null && newWin.focus() != null) {
    newWin.focus();
  }
}

/**
 * Stolen from the web to build a simple copy properties implementation
 * Warning: this needs testing before we should rely on it!
 */
export function hasOwnProperty<X extends {}, Y extends PropertyKey>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return obj.hasOwnProperty(prop);
}

export function isReallyANumber(x: string): boolean {
  if (!x) {
    return false;
  }
  if (Number.isNaN(x)) {
    return false;
  }

  const regex = /^\d+$/;

  return String(x).match(regex) !== null;
}
