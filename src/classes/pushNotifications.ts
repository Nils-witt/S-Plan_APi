import firebaseAdmin from 'firebase-admin';
import webPush from "web-push";
import Telegraf from 'telegraf';
import {Telegram} from './telegram';
import {User} from './user';
import {ApiGlobal} from "../types/global";

declare const global: ApiGlobal;

let telegram: any;

export class PushNotifications {

    pushTelegram: PushTelegram;
    pushWebPush: PushWebPush;
    pushFCM: PushFCM;

    constructor() {
        this.pushTelegram = new PushTelegram();
        this.pushWebPush = new PushWebPush();
        this.pushFCM = new PushFCM();
    }

    static initFrameworks() {

        firebaseAdmin.initializeApp({
            credential: firebaseAdmin.credential.cert(require(global.config.pushFrameWorks.firebaseCertificatePath)),
            databaseURL: "https://fir-plan-194f7.firebaseio.com"
        });

        webPush.setVapidDetails(
            "https://splan.nils-witt.de",
            global.config.pushFrameWorks.vapidKeyPublic,
            global.config.pushFrameWorks.vapidKeyPrivate
        );

        telegram = new Telegraf(global.config.pushFrameWorks.telegramBotToken).telegram;
    }

    /**
     * Handler for all push subscriptions. Determines with service handles message
     * @param type
     * @param deviceInfo
     * @param title
     * @param message
     * @returns Promise resolves when push is send
     */
    send(type: any, deviceInfo: any, title: any, message: any) {
        let pushFCM = this.pushFCM;
        let pushWebPush = this.pushWebPush;
        let pushTelegram = this.pushTelegram;
            return new Promise(async function (resolve, reject) {
                try {

                    if (type === "FCM") {
                        try {
                            await pushFCM.sendPush(deviceInfo, title, message);
                            resolve();
                        } catch (e) {
                            reject();
                        }
                    } else if (type === "WP") {
                        try {
                            await pushWebPush.sendPush(JSON.parse(deviceInfo), title, message);
                            resolve();
                        } catch (e) {
                            if (e.statusCode === 410 || e.statusCode === 403) {
                                await pushWebPush.deleteSubscription(e.endpoint);
                                resolve();
                                return;
                            }
                            reject(e);
                        }
                    } else if (type === "TG") {
                        try {
                            await pushTelegram.sendPush(deviceInfo, title + ": " + message);
                            resolve();
                        } catch (e) {
                            reject();
                        }
                    }
                } catch (e) {
                    console.log(e);
                    reject(e);
                }
            });


    }

    sendBulk(devices: any, title: any, message: any) {
        let self = this;
        return new Promise(async function (resolve, reject) {
            try {
                for(let id in devices){
                    if(devices.hasOwnProperty(id)){
                        let device = devices[id];
                        let type = device.platform;
                        let deviceInfo = device.device;
                        try {
                            await self.send(type,deviceInfo,title,message);
                        }catch (e) {
                            console.log(e);
                        }


                    }
                }
                resolve();
            } catch (e) {
                console.log(e);
                reject(e);
            }

        });
    }
}


export class PushTelegram {
    bot: Telegraf<any>;

    constructor() {
        this.bot = new Telegraf(global.config.pushFrameWorks.telegramBotToken);
    }

    startTelegramBot(){
        //Set replay to /start command from TG
        this.bot.start(async (ctx) => {
            let token = await Telegram.createRequest(ctx.update.message.from.id);
            await ctx.reply("Logge dich mit diesem Link ein, um deinen Account zu verknüpfen: https://splan.nils-witt.de/pages/linkTelegram.html?token=" + token);
            global.logger.log({
                level: 'silly',
                label: 'TelegramBot',
                message: 'created Linking token'
            });
        });

        this.bot.command('stop',async (ctx) => {

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
    sendPush(chatID: number, body: string) {
        return new Promise(async function (resolve, reject) {
            try {
                await telegram.sendMessage(chatID, body);
                global.logger.log({
                    level: 'silly',
                    label: 'TelegramPush',
                    message: 'sent message: ' + body + " ;to: " + chatID
                });
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


export class PushWebPush {

    /**
     * Send a message with WebPush to a device
     * @param subscription
     * @param title
     * @param body
     * @returns Promise resolves on successful send message
     */
    sendPush(subscription: any,title: string, body: string) {
        return new Promise(async function (resolve, reject) {
            try {
                await webPush.sendNotification(subscription, JSON.stringify({title: title, body: body}), {});
                global.logger.log({
                    level: 'silly',
                    label: 'WebPush',
                    message: 'sent message: ' + JSON.stringify({
                        title: title,
                        body: body
                    }) + " ;to: " + JSON.stringify(subscription)
                });
                resolve();
            } catch (e) {
                //TODO add logger
                reject(e);
            }
        });
    }

    /**
     * Delete a subscription from DB
     * @param endpoint
     * @returns Promise resolves true if deleted
     */
    deleteSubscription(endpoint: any){
        return new Promise(async function (resolve, reject) {
            let conn = await global.mySQLPool.getConnection();
            try {
                await conn.query("DELETE FROM `devices` WHERE (`deviceID` LIKE ?);", ['%' + endpoint + '%']);
                //TODO add logger
                resolve();
            } catch (e) {
                //TODO add logger
                reject();
            } finally {
                await conn.end();
            }
        });
    }
}

export class PushFCM{
    /**
     * Send a message with FCM to a device
     * @param deviceId
     * @param title
     * @param body
     * @returns Promise resolves on successful send message
     */
    sendPush(deviceId: number, title: string, body: string) {
        return new Promise(async function (resolve, reject) {
            let message :any = {
                notification: {
                    title: title,
                    body: body
                },
                token: deviceId
            };
            try {
                let response = await firebaseAdmin.messaging().send(message);
                global.logger.log({
                    level: 'silly',
                    label: 'FCM',
                    message: 'Successfully send message: ' + JSON.stringify(response)
                });
                resolve(response);
            } catch (e) {
                if(e.code == "messaging/registration-token-not-registered"){
                    //TODO add FCM delete registration
                }
                global.logger.log({
                    level: 'error',
                    label: 'FCM',
                    message: 'Error sending message: ' + JSON.stringify(e)
                });
                reject(e);
            }
        });
    }
}