export function getCurrentFiscalYear(): number {
    const today = new Date();
    const curMonth = today.getMonth();
    console.log('cur month=', curMonth);
    return (curMonth >= 9) ? today.getFullYear() + 1 : today.getFullYear();
}

//  opens   the URL in a new browser window
export function openNewWindow(url, windowName)
{
	    var url = url;
	    var winName = windowName;
	    var features = "menubar=yes,scrollbars=yes,resizable=yes,width=850,height=700";
	    var newWin = window.open(url, winName ,features);
	    if(newWin != null && newWin.focus() != null){
	    	newWin.focus();
	    }
}