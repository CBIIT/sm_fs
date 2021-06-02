import {FundingSourceTypes} from '../model/funding-source-types';

export function getCurrentFiscalYear(): number {
  const today = new Date();
  const curMonth = today.getMonth();
  console.log('cur month=', curMonth);
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

// Calculate the display category for the request type.
// TODO: This code was lifted as is from the existing system. Review and evaluate before blindly using it.
export function getDisplayCategory(requestTypeId: number): number {
  const result = -1;

  // / These two arrays include request types and subtypes (and in some cases, sub-subtypes.)
  // // All request types in an array share the same display characteristics.

  const A = [2, 21, 23, 24, 25, 26, 27, 29, 28, 34, 35, 40, 44, 52, 36, 37, 38, 39, 51, 3, 4, 22, 47,
    31, 32, 43, 49, 33, 41, 42, 50, 110, 1018, 1019, 1020, 1021, 1022];

  const B = [5, 9, 13, 3, 46, 1001, 6, 7, 1002, 10, 11, 12, 1003, 14, 15, 18, 1004, 1005, 1006, 1007,
    1010, 16, 17, 19, 20, 48, 53, 1009, 1011, 1012, 1013, 1008, 30];

  A.sort();
  B.sort();

  // Restoration
  if (requestTypeId === 45) {
    return 3;
  }

// Diversity Supplement
  if (requestTypeId === 1000) {
    return 4;
  }

  if (A.indexOf(requestTypeId) >= 0) {
    return 1;
  }

  if (B.indexOf(requestTypeId) >= 0) {
    return 2;
  }

  console.error('Unable to determine display category for type:', requestTypeId);
  return result;
}

// This function determines whether the user has selected MoonShot funds and sets the final LOA to SPL.
// TODO: function pulled from existing system. Validate logic before using.
function checkForFinalLoa(): void {
  let finalLoaSpl = false;
  // If any of the funding sources are MoonShot Funds (542), we need to select SPL and disable the final LOA radio button
  $('.fundingSourceSelectClass').each(function() {
    if ($(this).val() === Number(FundingSourceTypes.MOONSHOT_FUNDS)) {
      finalLoaSpl = true;
    }
  });
  if (finalLoaSpl) {
    $('#financial_financialInfoVO_loaId4').prop('checked', true);
    $('.finalLoaRadioClass').prop('disabled', true);
    $('#financial_financialInfoVO_loaId4').prop('disabled', false); // So it can submit
  } else {
    $('.finalLoaRadioClass').prop('disabled', false);
  }
}
