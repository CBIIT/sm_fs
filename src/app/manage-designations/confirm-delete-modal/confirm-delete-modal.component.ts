import {Component, Input, OnInit} from '@angular/core';
import {FundingRequestPermDelDto} from '@nci-cbiit/i2ecws-lib/model/fundingRequestPermDelDto';
import {NgbActiveModal} from '@ng-bootstrap/ng-bootstrap';
import {NgForm} from '@angular/forms';

@Component({
  selector: 'app-confirm-delete-modal',
  templateUrl: './confirm-delete-modal.component.html',
  styleUrls: ['./confirm-delete-modal.component.css']
})
export class ConfirmDeleteModalComponent implements OnInit {

  constructor(public modal: NgbActiveModal) { }

  @Input() data: FundingRequestPermDelDto = {};

  ngOnInit(): void {
  }

  onSubmit(editForm: NgForm): void {
    if (editForm.valid) {
      this.modal.close(this.data.id);
    }
  }
}
