import { isSameDay } from 'date-fns';
import puppeteer from 'puppeteer';
import { houseNumber, postCode } from './inputs';

export interface IBinData {
    wasteDate: Date;
    wasteType: string;
}

async function startBrowser(runningOn: 'pi' | 'mac' | 'win'): Promise<puppeteer.Browser> {
    if (runningOn === 'pi') {
        return await puppeteer.launch({
            headless: true,
            executablePath: '/usr/bin/chromium-browser',
            args: ['--no-sandbox', 'disable-setuid-sandbox'],
            //ignoreDefaultArgs: ['--disable-extensions'],
            // defaultViewport: null,
        });
    } else if(runningOn === 'mac') {
        return await puppeteer.launch({
            headless: true,
            executablePath: '/usr/local/bin/chromium'
        });
    
    } else {
        return await puppeteer.launch({
            headless: true,
        });
    }
}

async function goToStartPage(page: puppeteer.Page) {
    const startPageUrl =
        'https://www.testvalley.gov.uk/wasteandrecycling/when-are-my-bins-collected/look-up-my-bin-collection-days';

    //console.log('Loading start page...');
    await page.goto(startPageUrl);
    //console.log('Loading start page...DONE');
}

async function doPostCodeStep(page: puppeteer.Page) {
    //console.log('Enter post code into input...');
    await page.waitForSelector('input#P153_POST_CODE', { visible: true });
    await page.type('input#P153_POST_CODE', postCode);
    //console.log('Enter post code into input...DONE');

    //console.log('Submit post code...');
    await page.waitForSelector('button[title="Search"]');
    await page.click('button[title="Search"]');
    //console.log('Submit post code...DONE');

    await page.waitForNavigation();
}

async function doStreetAddressStep(page: puppeteer.Page) {
    //console.log('Select house number...');
    const [targetOption] = await page.$x(
        `//*[@id="P153_UPRN"]/option[contains(text(), "${houseNumber}")]`
    );
    await targetOption.evaluate((targetOptionActual) => {
        (targetOptionActual as HTMLOptionElement).selected = true;
    });
    //console.log('Select house number...DONE');

    //console.log('Submit house number...');
    const [goButton] = await page.$x(
        '//span[contains(@class, "t-Button-label")][contains(text(), "Go")]/..'
    );
    await goButton.click();
    //console.log('Submit house number...DONE');

    await page.waitForNetworkIdle();
}

async function collectBinDataFromPage(page: puppeteer.Page): Promise<IBinData[]> {
    // get the two tables: ul#CollectionDay_report li
    const wasteListItems = await page.$$('ul#CollectionDay_report li');
    let wasteData: IBinData[] = [];
    for (let wasteListItem of wasteListItems) {
        const [, usefulCellHandle] = await wasteListItem.$$('td');

        // get the waste type
        const wasteTypeSpan = await usefulCellHandle.$('span');
        const wasteType = await wasteTypeSpan!.evaluate(
            (wasteTypeSpanElement) => wasteTypeSpanElement.innerHTML
        );

        // get the date
        const [dateElement] = await wasteListItem.$x('.//p[contains(@style, "padding-left:55px")]');
        const wasteDateText = await dateElement.evaluate(
            (actualDateElement) => actualDateElement.innerHTML
        );
        const wasteDate = new Date(wasteDateText);

        wasteData.push({
            wasteType,
            wasteDate,
        });
    }

    console.log('Got bin data!');
    return wasteData;
}

export async function getNextBinDate(): Promise<IBinData> {
    // https://github.com/puppeteer/puppeteer/issues/2924#issuecomment-880992772

    const browser: puppeteer.Browser = await startBrowser('mac');
    const page: puppeteer.Page = await browser.newPage();

    await goToStartPage(page);

    await doPostCodeStep(page);

    await doStreetAddressStep(page);

    const wasteData = await collectBinDataFromPage(page);

    wasteData.sort((a, b) => (a.wasteDate > b.wasteDate ? 1 : -1));

    //await page.screenshot({ path: 'example.png' });

    const nextWasteData = wasteData[0];

    // console.log(
    //     `Next collection is: [${wasteData[0].wasteType}] on [${format(
    //         wasteData[0].wasteDate,
    //         'iii do MMM'
    //     )}]`
    // );

    await browser.close();

    return nextWasteData;
}

type BinDataCacheValue = [Date, Promise<IBinData>];
type BinDataCache = BinDataCacheValue | undefined;
let staticBinDataCache: BinDataCache = undefined;

function internalIsCacheReady(binDataCache: BinDataCache): binDataCache is BinDataCacheValue {
    return !!binDataCache && isSameDay(binDataCache[0], new Date());
}

export function isCacheReady(): boolean {
    return internalIsCacheReady(staticBinDataCache);
}

export async function getCachedBinData(): Promise<IBinData> {
    if (internalIsCacheReady(staticBinDataCache)) {
        console.log('bin cache hit');
        return staticBinDataCache[1];
    }

    console.log('bin cache miss');
    const binPromise = getNextBinDate();

    console.log('setup cache');
    staticBinDataCache = [new Date(), binPromise];

    return binPromise;
}
