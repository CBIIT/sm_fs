export function getCurrentFiscalYear():number {
    var today = new Date();
    var curMonth = today.getMonth();
    console.log("cur month=", curMonth);
    return (curMonth>=9)?today.getFullYear() + 1:today.getFullYear();
}     