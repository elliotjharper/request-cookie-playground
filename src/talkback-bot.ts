import { Bot } from 'grammy';
import { readFileSync } from 'fs';

const botToken = readFileSync('./token.txt', { encoding: 'utf-8' });

if(!botToken) {
    throw new Error('No token provided!');
}

const telegramBot = new Bot(botToken);

telegramBot.on('message', async (context) => {
    console.log('on:message...');

    await context.reply('Talking back!');

    console.log('message sent back!');
});

console.log('starting bot...');

telegramBot.start();

console.log('bot started!');
