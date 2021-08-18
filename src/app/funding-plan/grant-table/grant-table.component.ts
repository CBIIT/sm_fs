import { AfterViewInit, Component, Input, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { PlanModel } from '../../model/plan/plan-model';
import { DataTableDirective } from 'angular-datatables';
import { FullGrantNumberCellRendererComponent } from '../../table-cell-renderers/full-grant-number-renderer/full-grant-number-cell-renderer.component';
import { CancerActivityCellRendererComponent } from '../../table-cell-renderers/cancer-activity-cell-renderer/cancer-activity-cell-renderer.component';
import { ExistingRequestsCellRendererComponent } from '../../table-cell-renderers/existing-requests-cell-renderer/existing-requests-cell-renderer.component';
import { NciPfrGrantQueryDtoEx } from '../../model/plan/nci-pfr-grant-query-dto-ex';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-grant-table',
  templateUrl: './grant-table.component.html',
  styleUrls: ['./grant-table.component.css']
})
export class GrantTableComponent implements OnInit, AfterViewInit {

  private _grantList: NciPfrGrantQueryDtoEx[] = [];
  private _minScore: number;
  private _maxScore: number;

  get grantList(): NciPfrGrantQueryDtoEx[] {
    return this._grantList;
  }

  get minScore(): number {
    return this._minScore;
  }

  get maxScore(): number {
    return this._maxScore;
  }

  @Input()
  set grantList(val: NciPfrGrantQueryDtoEx[]) {
    // TODO process event
    this._grantList = val;
    if (this.dtOptions) {
      this.dtOptions.data = this._grantList;
    }
    if (this.dtElement && this.dtElement.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
        dtInstance.destroy();
        this.dtTrigger.next();
      });
    }
  }

  // Need min and max score to determine "Skip" and "Exception"
  @Input()
  set minScore(val: number) {
    // TODO process event
    this._minScore = val;
  }

  @Input()
  set maxScore(val: number) {
    // TODO process event
    this._maxScore = val;
  }

  grantViewerUrl: string = this.planModel.grantViewerUrl;
  eGrantsUrl: string = this.planModel.eGrantsUrl;

  @ViewChild(DataTableDirective, {static: false}) dtElement: DataTableDirective;
  @ViewChild('fullGrantNumberRenderer') fullGrantNumberRenderer: TemplateRef<FullGrantNumberCellRendererComponent>;
  @ViewChild('cancerActivityRenderer') cancerActivityRenderer: TemplateRef<CancerActivityCellRendererComponent>;
  @ViewChild('existingRequestsRenderer') existingRequestsRenderer: TemplateRef<ExistingRequestsCellRendererComponent>;

  dtTrigger: Subject<any> = new Subject();
  dtOptions: any = {};

  constructor(private planModel: PlanModel) {
  }

  get noResult(): boolean {
    return !this._grantList || this._grantList.length === 0;
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.dtOptions = {
      paging: false,
      data: this._grantList,
      columns: [
        {title: 'Grant Number', data: 'fullGrantNum', // 0
            ngTemplateRef: { ref: this.fullGrantNumberRenderer}, className: 'all'},
        {title: 'PI', data: 'piFullName', // 1
            render: ( data, type, row, meta ) => {
              return '<a href="mailto:' + row.piEmail + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
            },
            className: 'all'},
        {title: 'Project Title', data: 'projectTitle'}, // 2
        {title: 'RFA/PA', data: 'rfaPaNumber', // 3
            render: ( data, type, row, meta ) => {
              return '<a href="' + row.nihGuideAddr + '" target="blank" >' + data + '</a>';
            }},
        {title: 'I2 Status', data: 'applStatusGroupDescrip'}, // 4
        {title: 'PD', data: 'pdFullName',  // 5
            render: ( data, type, row, meta ) => {
              return (data == null) ? '' : '<a href="mailto:' + row.pdEmailAddress + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
            }},
        {title: 'CA', data: 'cayCode', // 6
            ngTemplateRef: { ref: this.cancerActivityRenderer}, className: 'all'},
        {title: 'FY', data: 'fy'}, // 7
        {title: 'NCAB', data: 'councilMeetingDate', defaultContent: '', // 8
            render: ( data, type, row, meta) => {
              return (data) ? data.substr(4, 2) + '/' + data.substr(0, 4) : '';
            }},
        {title: 'Pctl', data: 'irgPercentileNum'}, // 9
        {title: 'PriScr', data: 'priorityScoreNum'}, // 10
        {title: 'Budget Start Date', data: 'budgetStartDate'}, // 11
        {title: 'Existing Requests', data: 'requestCount', // 12
            ngTemplateRef: { ref: this.existingRequestsRenderer}, className: 'all'},
        {data: null, defaultContent: ''}
      ],
      order: [[10, 'asc']],
      responsive: {
        details: {
          type: 'column',
          target: -1
        }
      },
      columnDefs: [
        {
          className: 'control',
          orderable: false,
          targets: -1
        },
        {responsivePriority: 1, targets: 0 }, // grant_num
        {responsivePriority: 3, targets: 1 }, // pi
        {responsivePriority: 4, targets: 8 }, // ncab
        {responsivePriority: 5, targets: 7 }, // fy
        {responsivePriority: 6, targets: 5 }, // pd
        {responsivePriority: 7, targets: 6 }, // ca
        {responsivePriority: 8, targets: 9 }, // pctl
        {responsivePriority: 9, targets: 10 }, // priscr
        {responsivePriority: 10, targets: 3 }, // rfa/pa
        {responsivePriority: 11, targets: 12 }, // existing requests
        {responsivePriority: 12, orderable: false, targets: 2 }, // project title
        {responsivePriority: 13, targets: 4 }, // i2 status
        {responsivePriority: 14, targets: 11 } // budget start date
      ],
      dom: '<"dt-controls"<"ml-auto"fB<"d-inline-block">>>rt<"dt-controls"<"mr-auto"i>>',
      buttons: [
        {
          extend: 'excel',
          className: 'btn-excel',
          titleAttr: 'Excel export',
          text: 'Export',
          filename: 'fs-fp-grants-search-result',
          title: null,
          header: true,
          exportOptions: { columns: [ 0, 1, 2, 3 , 4 , 5, 6, 7, 8, 9, 10, 11, 12 ] }
        }
      ],
      rowCallback: (row: Node, data: any[] | object, index: number) => {
        // Fix for Excel output - I removed empty renderers in column definitions
        // But now, I have to remove the first "text" child node to prevent it
        // from rendering (angular datatables bug)
        this.dtOptions.columns.forEach((column, ind) => {
          if (column.ngTemplateRef) {
            const cell = row.childNodes.item(ind);
            if (cell.childNodes.length > 1) { // you have to leave at least one child node
              $(cell.childNodes.item(0)).remove();
            }
          }
        });
      }
    };

    setTimeout(() => this.dtTrigger.next(), 0);
  }

}
