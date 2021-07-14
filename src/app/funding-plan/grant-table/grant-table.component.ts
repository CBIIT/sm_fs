import {Component, Input, OnInit} from '@angular/core';
import {NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {AppPropertiesService} from '../../service/app-properties.service';
import {PlanModel} from '../../model/plan/plan-model';

@Component({
    selector: 'app-grant-table',
    templateUrl: './grant-table.component.html',
    styleUrls: ['./grant-table.component.css']
})
export class GrantTableComponent implements OnInit {
    @Input() grantList: NciPfrGrantQueryDto[];
    tooltipGrant: NciPfrGrantQueryDto;
    grantViewerUrl = this.planModel.grantViewerUrl;
    eGrantsUrl = this.planModel.eGrantsUrl;

    constructor(private planModel: PlanModel) {

    }

    ngOnInit(): void {
    }

    setGrant(grant: NciPfrGrantQueryDto): void {
        this.tooltipGrant = grant;
    }

    get noResult(): boolean {
        return !this.grantList || this.grantList.length === 0;
    }

    // ngAfterViewInit(): void {
    //     // this.initDatatable();
    //     this.grantNumberComponent.grantNumberType = this.searchCriteria.grantType;
    //     this.grantNumberComponent.grantNumberMech = this.searchCriteria.grantMech;
    //     this.grantNumberComponent.grantNumberIC = this.searchCriteria.grantIc;
    //     this.grantNumberComponent.grantNumberSerial = this.searchCriteria.grantSerial;
    //     this.grantNumberComponent.grantNumberYear = this.searchCriteria.grantYear;
    //     this.grantNumberComponent.grantNumberSuffix = this.searchCriteria.grantSuffix;
    //
    //     this.dtOptions = {
    //         pagingType: 'full_numbers',
    //         pageLength: 100,
    //         serverSide: true,
    //         processing: true,
    //         language: {
    //             paginate: {
    //                 first: '<i class="far fa-chevron-double-left" title="First"></i>',
    //                 previous: '<i class="far fa-chevron-left" title="Previous"></i>',
    //                 next: '<i class="far fa-chevron-right" title="Next"></i>',
    //                 last: '<i class="far fa-chevron-double-right" Last="First"></i>'
    //             }
    //         },
    //
    //         ajax: (dataTablesParameters: any, callback) => {
    //             this.loaderService.show();
    //             this.logger.debug('Funding Request search for: ', this.searchCriteria);
    //             this.fsRequestControllerService.searchDtGrantsUsingPOST(
    //               Object.assign(dataTablesParameters, this.searchCriteria)).subscribe(
    //               result => {
    //                   this.logger.debug('Funding Request search result: ', result);
    //                   this.grantList = result.data;
    //                   this.gsfs.searched = true;
    //                   callback({
    //                       recordsTotal: result.recordsTotal,
    //                       recordsFiltered: result.recordsFiltered,
    //                       data: result.data
    //                   });
    //                   this.loaderService.hide();
    //               }, error => {
    //                   this.loaderService.hide();
    //                   this.logger.error('HttpClient get request error for----- ' + error.message);
    //               });
    //         },
    //
    //         columns: [
    //             {title: 'Grant Number', data: 'fullGrantNum', ngTemplateRef: { ref: this.fullGrantNumberRenderer}, render: () => '', className: 'all'},
    //             {title: 'PI', data: 'piFullName', render: ( data, type, row, meta ) => {
    //                     return '<a href="mailto:' + row.piEmail + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
    //                 }, className: 'all'},
    //             {title: 'Project Title', data: 'projectTitle'},
    //             {title: 'RFA/PA', data: 'rfaPaNumber'},
    //             {title: 'I2 Status', data: 'applStatusGroupDescrip'},
    //             {title: 'PD', data: 'pdFullName', render: ( data, type, row, meta ) => {
    //                     return '<a href="mailto:' + row.pdEmailAddress + '?subject=' + row.fullGrantNum + ' - ' + row.lastName + '">' + data + '</a>';
    //                 }},
    //             {title: 'CA', data: 'cayCode', ngTemplateRef: { ref: this.cancerActivityRenderer}, render: () => '', className: 'all'},
    //             {title: 'FY', data: 'fy'},
    //             {title: 'NCAB', data: 'councilMeetingDate', defaultContent: '', render: ( data, type, row, meta) => {
    //                     return (data) ? data.substr(4, 2) + '/' + data.substr(0, 4) : '';
    //                 }},
    //             {title: 'Pctl', data: 'irgPercentileNum'},
    //             {title: 'PriScr', data: 'priorityScoreNum'},
    //             {title: 'Budjet Start Date', data: 'budgetStartDate'},
    //             {title: 'Existing Requests', data: 'requestCount', ngTemplateRef: { ref: this.existingRequestsRenderer}, render: () => '', className: 'all'},
    //             {title: 'Action', data: null,  defaultContent: 'Select', ngTemplateRef: { ref: this.fundingRequestActionRenderer}, render: () => '', className: 'all'},
    //             {data: null, defaultContent: ''}
    //         ],
    //         // columnDefs: [ { orderable: false, targets: -1 }],.
    //         // responsive: true,
    //
    //         responsive: {
    //             details: {
    //                 type: 'column',
    //                 target: -1
    //             }
    //         },
    //         columnDefs: [
    //             {
    //                 className: 'control',
    //                 orderable: false,
    //                 targets: -1
    //             },
    //             {responsivePriority: 1, targets: 0 }, // grant_num
    //             {responsivePriority: 2, targets: 13 }, // action
    //             {responsivePriority: 3, targets: 1 }, // pi
    //             {responsivePriority: 4, targets: 8 }, // ncab
    //             {responsivePriority: 5, targets: 7 }, // fy
    //             {responsivePriority: 6, targets: 5 }, // pd
    //             {responsivePriority: 7, targets: 6 }, // ca
    //             {responsivePriority: 8, targets: 9 }, // pctl
    //             {responsivePriority: 9, targets: 10 }, // priscr
    //             {responsivePriority: 10, targets: 3 }, // rfa/pa
    //             {responsivePriority: 11, targets: 12 }, // existing requests
    //             {responsivePriority: 12, targets: 2 }, // project title
    //             {responsivePriority: 13, targets: 4 }, // i2 status
    //             {responsivePriority: 14, targets: 11 } // budget start date
    //         ],
    //         // dom:  '<"table-controls"<""l><"ml-auto mr-2"B><""p>>' +
    //         //       '<"row"<"col-12"tr>>' +
    //         //       '<"table-controls"<""i><"ml-auto mr-2"B><""p>>',
    //         // buttons: {
    //         //     dom: {
    //         //       button: {
    //         //         tag: 'button',
    //         //         className: 'btn btn-sm btn-outline-secondary'
    //         //       }
    //         //     },
    //         dom: '<"dt-controls"l<"ml-auto"fB<"d-inline-block"p>>>rt<"dt-controls"<"mr-auto"i>p>',
    //         buttons: [
    //             {
    //                 extend: 'excel',
    //                 className: 'btn-excel',
    //                 titleAttr: 'Excel export',
    //                 text: 'Export',
    //                 filename: 'fs-grants-search-result',
    //                 title: null,
    //                 header: true,
    //                 exportOptions: { columns: [ 0, 1, 2, 3, 4 , 5 , 6, 7, 8, 9, 10, 11, 12 ] }
    //             }
    //         ]
    //         // },
    //     };
    //
    //     this.search();
    //     setTimeout(() => this.dtTrigger.next(), 0);
    //
    // }


}
