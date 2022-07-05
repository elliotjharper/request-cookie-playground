import { Telegram } from 'puregram';

const botToken = process.argv[2] as string;

if(!botToken) {
    throw new Error('No token provided!');
}

const telegramBot = Telegram.fromToken(botToken);

telegramBot.updates.on('message', async (context) => {
    console.log('on:message...');

    await context.reply('Talking back!');

    console.log('message sent back!');
});

console.log('starting bot...');

telegramBot.updates.startPolling();

console.log('bot started!');
