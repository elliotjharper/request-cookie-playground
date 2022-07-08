import { readFileSync } from 'fs';
import { Bot, Context, InlineKeyboard, session, SessionFlavor } from 'grammy';
import { getCachedBinData, getStreetAddresses } from './get-next-bin-date';

type BinBotState =
    | 'awaitingPostCodeInput'
    | 'awaitingHouseNumberInput'
    | 'awaitingInputsConfirmation'
    | 'gettingStreetAddresses'
    | 'awaitingStreetAddressConfirmation';

interface IBinSession {
    state?: BinBotState;

    postCode?: string;
    houseNumber?: string;
    streetAddresses?: string[];
    streetAddress?: string;
}

type BinBotContext = Context & SessionFlavor<IBinSession>;

const botToken = readFileSync('./token.txt', { encoding: 'utf-8' });

if (!botToken) {
    throw new Error('No token provided!');
}

const binBot = new Bot<BinBotContext>(botToken);

function createInitialBinSession(): IBinSession {
    return {};
}

binBot.use(session({ initial: createInitialBinSession }));

binBot.command('bins_hardcoded', async (context) => {
    console.log('on:/bins-hardcoded');

    await context.reply('Getting bins data!');

    const binDate = await getCachedBinData();

    await context.reply(binDate.wasteType);
    await context.reply(binDate.wasteDate.toDateString());

    console.log('bin data sent back!');
});

binBot.command('bins_advanced', async (context) => {
    console.log('on:/bins-advanced');
    context.session.state = 'awaitingPostCodeInput';
    await context.reply('What is your post code?');
});

async function abortByMessage(context: BinBotContext): Promise<void> {
    context.session = createInitialBinSession();
    await context.reply('Cancellation received. Going back to standby...');
}

async function abortByCallbackQuery(context: BinBotContext): Promise<void> {
    context.session = createInitialBinSession();
    await context.answerCallbackQuery();
    await context.reply('Cancellation received. Going back to standby...');
}

async function sendBusyStatus(context: BinBotContext): Promise<void> {
    await context.reply(
        'Currently awaiting response to a prompt. Until response is received messages are ignored.'
    );
}

const confirmInputsQuery = 'confirm-inputs';
const abortQuery = 'abort';

async function handlePostcodeResponse(context: BinBotContext): Promise<void> {
    context.session.state = 'awaitingHouseNumberInput';
    context.session.postCode = context.message?.text;
    await context.reply('What is your house number?');
}

async function handleHouseNumberResponse(
    context: BinBotContext
): Promise<void> {
    context.session.state = 'awaitingInputsConfirmation';
    context.session.houseNumber = context.message?.text;

    const inlineKeyboard = new InlineKeyboard();
    inlineKeyboard.text('Yes', confirmInputsQuery);
    inlineKeyboard.text('No', abortQuery);

    await context.reply(
        `Are these correct? Post code: ${context.session.postCode} House number: ${context.session.houseNumber}`,
        { reply_markup: inlineKeyboard }
    );
}

binBot.on('message', async (context) => {
    console.log('on:message...');

    if (context.session.state === 'awaitingPostCodeInput') {
        return await handlePostcodeResponse(context);
    }

    if (context.session.state === 'awaitingHouseNumberInput') {
        return await handleHouseNumberResponse(context);
    }

    if (context.session.state === 'awaitingInputsConfirmation') {
        return await sendBusyStatus(context);
    }

    await context.reply(`Talking back! You said: ${context.message.text}`);

    console.log('message sent back!');
});

binBot.callbackQuery(confirmInputsQuery, async (context) => {
    context.session.state = 'gettingStreetAddresses';
    await context.answerCallbackQuery();
    await context.reply(
        'Thanks for confirming your inputs. Gathering street addresses now...'
    );

    if (!context.session.postCode || !context.session.houseNumber) {
        throw new Error(
            'Was about to get street addresses but did not have postCode'
        );
    }

    const streetAddresses = await getStreetAddresses(context.session.postCode);

    // await context.reply('Got addresses:');
    // for (const streetAddress of streetAddresses) {
    //     await context.reply(streetAddress);
    // }

    if (!streetAddresses?.length) {
        await context.reply(
            'Did not get any street addresses for the post code you provided.'
        );
        return;
    }

    const usersStreetAddress = streetAddresses.find((streetAddress) => {
        return streetAddress.startsWith(
            context.session.houseNumber!.toString()
        );
    });

    if (!usersStreetAddress) {
        await context.reply(
            'Could not find your house number in the list of street addresses:'
        );

        for (const streetAddress of streetAddresses) {
            await context.reply(streetAddress);
        }

        return;
    }

    context.session.streetAddress = usersStreetAddress;
    context.session.state = 'awaitingStreetAddressConfirmation';
    await context.reply(`Is this your address? ${usersStreetAddress}`);
});

binBot.callbackQuery(abortQuery, async (context) => {
    await abortByCallbackQuery(context);
});

// binBot.on('callback_query:data', async (context) => {

// });

console.log('starting bot...');

binBot.start();

console.log('bot started!');
