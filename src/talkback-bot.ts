import { Bot } from 'grammy';
import { readFileSync } from 'fs';
import { getCachedBinData, getNextBinDate } from './get-next-bin-date';

const botToken = readFileSync('./token.txt', { encoding: 'utf-8' });

if(!botToken) {
    throw new Error('No token provided!');
}

const telegramBot = new Bot(botToken);

telegramBot.command('bins', async (context) => {
    console.log('on:/bins');

    await context.reply('Getting bins data!');

    const binDate = await getCachedBinData();

    await context.reply(binDate.wasteType);
    await context.reply(binDate.wasteDate.toDateString());

    console.log('bin data sent back!');
});

telegramBot.on('message', async (context) => {
    console.log('on:message...');

    await context.reply(`Talking back! You said: ${context.message.text}`);

    console.log('message sent back!');
});

console.log('starting bot...');

telegramBot.start();

console.log('bot started!');
