import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
  name: 'mailtoFormatter'
})
export class MailtoFormatterPipe implements PipeTransform {

  transform(value: any, ...args: string[]): unknown {
    if (!args || args.length < 2) {
      throw new Error('Mailto formatter requires at least two parameters');
    }

    const nameField = args[0];
    const emailField = args[1];
    if (!value[nameField]) {
      return '';
    }
    if (value[nameField].trim().length === 1) {
      return '';
    }
    if (!value[emailField]) {
      return value[nameField];
    }

    let subject = '';
    // TODO: look at making this more generic and reusable by using template literals
    // If args[2] exists:
    //    if no further arguments, use as is
    //    otherwise, interpolate those values into args 2
    if (args[2]) {
      if (args[2] === 'PI/PD name' && value[args[3]] && value[args[4]]) {
        subject = '?subject=' + value[args[3]] + ' - ' + value[args[4]];
      } else {
        subject = '?subject=' + args[2];
      }
    }

    return '<a href="mailto:' + value[emailField] + subject + '">' + value[nameField] + '</a>';
  }

}
