export function getCurrentFiscalYear(): number {
  const today = new Date();
  const curMonth = today.getMonth();
  console.log('cur month=', curMonth);
  return (curMonth >= 9) ? today.getFullYear() + 1 : today.getFullYear();
}

//  opens   the URL in a new browser window
export function openNewWindow(url, windowName): void {
  const winName = windowName;
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

