export class DatatableThrottle {

  private dtPreviousSearchValue: string;
  private dtLast: number;
  private dtTimer: NodeJS.Timeout;
  private dtFrequency: number = 800;  // ms

  constructor() {
  }

  invoke($this: any, dataTablesParameters: any, callback: ((data: any) => void), ajaxCall: (($this: any, params: any, callback: any) => void)): void {
    const filterValue = dataTablesParameters?.search?.value;
    if (!filterValue || filterValue === '' || this.dtPreviousSearchValue === filterValue) { // initial search, sort, pagination, etc
      // this.logger.debug('Ajax call - immediate search: ',filterValue, this.dtPreviousSearchValue);
      this.dtPreviousSearchValue = filterValue;
      ajaxCall($this, dataTablesParameters, callback);
      return;
    }

    const now  = +new Date();
    if (!this.dtLast || now < this.dtLast + this.dtFrequency) {
      clearTimeout(this.dtTimer);
      this.dtLast = now;
      // this.logger.debug('Ajax call - create new timer: ',filterValue, this.dtPreviousSearchValue);
      this.dtPreviousSearchValue = filterValue;
      this.dtTimer = setTimeout(() => {
        this.dtTimer = undefined;
        this.dtLast = undefined;
        // this.logger.debug('Ajax call - delayed search: ',dataTablesParameters.search?.value, this.dtPreviousSearchValue);
        ajaxCall($this, dataTablesParameters, callback);
      }, this.dtFrequency);
    }
  }

  reset() {
    this.dtPreviousSearchValue = undefined; // reset the filter
    clearTimeout(this.dtTimer);
    this.dtTimer = undefined;
    this.dtLast = undefined;
  }
}
