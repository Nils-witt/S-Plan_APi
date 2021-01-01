/*
 * Copyright (c) 2021 Nils Witt.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import Telegraf from "telegraf";
import {Telegram} from "./Telegram";
import {User} from "./User";
import {ApiGlobal} from "../types/global";

declare const global: ApiGlobal;

export class PushTelegram {
    bot: Telegraf<any>;


    constructor(bot: Telegraf<any>) {
        this.bot = bot;
    }

    startTelegramBot() {
        //Set replay to /start command from TG
        this.bot.start(async (ctx) => {
            let token = await Telegram.createRequest(ctx.update.message.from.id);
            await ctx.reply("Logge dich mit diesem Link ein, um deinen Account zu verknüpfen: https://splan.nils-witt.de/pages/linkTelegram.html?token=" + token);
            global.logger.log({
                level: 'silly',
                label: 'TelegramBot',
                message: 'created Linking token id:' + ctx.update.message.from.id + " token: " + token
            });
            Telegram.logMessage(ctx.update.message.from.id, "Logge dich mit diesem Link ein, um deinen Account zu verknüpfen: https://splan.nils-witt.de/pages/linkTelegram.html?token=" + token, 'out');
        });

        this.bot.command('stop', async (ctx) => {

            await ctx.reply("Gerät wird gelöscht--->---> ");
            try {

                await User.removeDevice(ctx.update.message.from.id.toString());
                await ctx.reply("Abgeschlossen");
                global.logger.log({
                    level: 'silly',
                    label: 'TelegramBot',
                    message: 'deleted Device: ' + ctx.update.message.from.id
                });
            } catch (e) {
                console.log(e);
                await ctx.reply("Es ist ein Fehler aufgetreten");

                global.logger.log({
                    level: 'silly',
                    label: 'TelegramBot',
                    message: 'Error while deleting Device: ' + ctx.update.message.from.id
                });
            }
        });

        //Launch TG replay bot
        this.bot.launch().then(() => {
            global.logger.log({
                level: 'silly',
                label: 'TelegramBot',
                message: 'started'
            });
        });
    }


    /**
     * Send a message with Telegram to a device
     * @param chatID
     * @param body
     * @returns Promise resolves on successful send message
     */
    sendPush(chatID: number, body: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                this.bot.telegram.sendMessage(chatID, body);
                global.logger.log({
                    level: 'silly',
                    label: 'TelegramPush',
                    message: 'sent message: ' + body + " ;to: " + chatID
                });
                Telegram.logMessage(chatID, body, 'out');
                resolve();
            } catch (e) {
                global.logger.log({
                    level: 'warn',
                    label: 'TelegramPush',
                    message: 'sent message: ' + body + " ;to: " + chatID + ' Error: ' + JSON.stringify(e)
                });
                reject(e);
            }
        });
    }
}