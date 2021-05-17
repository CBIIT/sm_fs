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
    console.log('"' + emailField + '"');
    if (!value[nameField]) {
      return '';
    }
    if (value[nameField].trim().length === 1) {
      return '';
    }
    if (!value[emailField])  {
      return value[nameField];
    }

    let subject = '';
    if (args[2]) {
      subject = '?subject=' + args[2];
    }

    const href = '<a href="mailto:' + value[emailField] + subject + '">' + value[nameField] + '</a>';
    return href;
  }

}
