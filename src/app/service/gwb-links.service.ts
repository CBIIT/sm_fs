import { Injectable} from '@angular/core';
import {GwbLinksControllerService} from '@nci-cbiit/i2ecws-lib';

@Injectable({
  providedIn: 'root'
})
export class GwbLinksService {

  private gwb_links = {};
  private names:string[]=['Paylist'];

  constructor(private gwbLinksControllerService: GwbLinksControllerService) {

  }


  initialize(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.gwbLinksControllerService.getLinksUsingGET(this.names).subscribe(
        (result) => {
          result.forEach((element) => {
            this.gwb_links[element.name] = element.composedUrl;
          });
          resolve();
        },
        (error) => {
          console.error('Failed to load App Properties because of error, ', error);
          reject();
        }
      );
    });
  }

  getProperty(name: string): string {   
      return this.gwb_links[name];
  }

}
