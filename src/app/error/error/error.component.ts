import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ErrorHandlerService } from "../error-handler.service";
import { NGXLogger } from "ngx-logger";
import { environment } from "../../../environments/environment";

@Component({
  selector: "app-error",
  templateUrl: "./error.component.html",
  styleUrls: ["./error.component.css"]
})
export class ErrorComponent implements OnInit {

  emailLink: string;

  constructor(
    private route: ActivatedRoute,
    private errorHandler: ErrorHandlerService,
    private logger: NGXLogger) {
  }

  ngOnInit(): void {
    const errorId = this.route.snapshot.params.errorId;
    const errorMessage = encodeURIComponent(this.errorHandler.getMessage(+errorId));
    const errorDetails = encodeURIComponent(this.errorHandler.getDetails(+errorId));
    const techSupport = environment.TECH_SUPPORT_EMAIL;

    this.emailLink = this.truncate(`mailto:${techSupport}?subject=Funding Selections&body=${errorMessage}%0A${errorDetails}`);
  }

  private truncate(details: string): string {
    if (!details) {
      return "";
    }

    if (details.length < 2000) {
      return details;
    }

    return `${details.substring(0, 1997)}...`;
  }
}
