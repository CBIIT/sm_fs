export function getCurrentFiscalYear(): number {
  const today = new Date();
  const curMonth = today.getMonth();
  return (curMonth >= 9) ? today.getFullYear() + 1 : today.getFullYear();
}

//  opens   the URL in a new browser window
export function openNewWindow(url, windowName, features?): void {
  // TODO - review and eliminate winName
  const winName = windowName; // This is not necessary since it's not being changed
  if (!features) {
    features = 'menubar=yes,scrollbars=yes,resizable=yes,width=850,height=700';
  }
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

export function isReallyANumber(x: any): boolean {
  if (!x) {
    return false;
  }
  if (Number.isNaN(x)) {
    return false;
  }

  if (x === null) {
    return false;
  }

  return true;

  // const regex = /^\d+$/;
  //
  // return String(x).match(regex) !== null;
}

// Convert string like 'YYYYMM,YYYYMM ..." to 'MM/YYYY, MM/YYYY ..."
export function convertNcabs(ncabs: string): string {

  function _convertNcab(ncab: string) {
    if (ncab && ncab.length === 6) {
      ncab = ncab.substr(4, 2) + '/' + ncab.substr(0, 4);
    }
    return ncab;
  }

  if (ncabs && ncabs.length > 0) {
    const lst = ncabs.split(',');
    let ret;
    for (const ncab of lst) {
      if (ret) {
        ret += ', ' + _convertNcab(ncab);
      } else {
        ret = _convertNcab(ncab);
      }
    }
    return ret;
  }
  return ncabs;
}

