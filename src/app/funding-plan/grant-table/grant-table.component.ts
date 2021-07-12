import {Component, Input, OnInit} from '@angular/core';
import {NciPfrGrantQueryDto} from '@nci-cbiit/i2ecws-lib';
import {AppPropertiesService} from '../../service/app-properties.service';
import {PlanModel} from '../../model/plan-model';

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

}
