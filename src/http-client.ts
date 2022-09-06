import * as rpn from 'request-promise-native';

export const httpClient = rpn.defaults({ jar: true });


