export function getCurrentFiscalYear(): number {
    const today = new Date();
    const curMonth = today.getMonth();
    console.log('cur month=', curMonth);
    return (curMonth >= 9) ? today.getFullYear() + 1 : today.getFullYear();
}
