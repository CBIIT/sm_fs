let loadedDataTable: any;

export function installDataTables(jquery: any): void {
  if (!loadedDataTable) {
    const exported = require('datatables.net');
    loadedDataTable = jquery.fn.dataTable || exported;
  }
  const dataTable = loadedDataTable;
  if (!jquery.fn.dataTable) {
    jquery.fn.dataTable = dataTable;
    jquery.fn.dataTableSettings = dataTable.settings;
    jquery.fn.dataTableExt = dataTable.ext;
    jquery.fn.DataTable = function (options: any) {
      return jquery(this).dataTable(options).api();
    };
    Object.assign(jquery.fn.DataTable, dataTable);
  }
}
