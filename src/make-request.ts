import { RequestPromiseOptions } from "request-promise-native";
import { httpClient } from "./http-client";

export async function makeRequest(): Promise<string> {
    // const requestOptions: RequestPromiseOptions = {
    //     method: 'GET',
    //     uri: ''
    // };

    const response = await httpClient.get('https://testvalley.gov.uk/wasteandrecycling/when-are-my-bins-collected/look-up-my-bin-collection-days')

    console.log(response);

    return '';
}

console.log('Starting Request');

makeRequest().then(() => {
    console.log('DONE!');
});