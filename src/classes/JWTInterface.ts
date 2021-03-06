/*
 * Copyright (c) 2021 Nils Witt.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import jwt from 'jsonwebtoken';
import fs from 'fs';
import {User, UserType} from './user/User';
import {ApiGlobal} from "../types/global";
import {NextFunction, Request, Response} from "express";
import path from "path";
import {Permissions} from "./Permissions";

declare const global: ApiGlobal;

//Load signing and validation keys
const privateKey = fs.readFileSync('./keys/jwtRS256.pem');
const publicKey = fs.readFileSync('./keys/jwtRS256_pub.pem');

//Paths without token validation
const authFreePaths = [
    '/user/login',
];

export class JWTInterface {

    /**
     * @param id {number}
     */
    static verifyId(id: string): Promise<never> {
        return new Promise(async (resolve, reject) => {
            let conn = await global.mySQLPool.getConnection();
            try {
                let rows = await conn.query("SELECT * FROM `user_token` WHERE `tokenIdentifier`= ?", [id]);
                if (rows.length === 1) {
                    resolve(rows[0]['idjwt_Token']);
                } else {
                    global.logger.log({
                        level: 'debug',
                        label: 'JWT',
                        message: '(verifyId) ' + id + ' not vaild',
                        file: path.basename(__filename)
                    });
                    reject("Not valid");
                }

            } catch (e) {
                global.logger.log({
                    level: 'error',
                    label: 'JWT',
                    message: '(verifyId) ' + id + ' e: ' + e,
                    file: path.basename(__filename)
                });
                reject(e);
            } finally {
                await conn.end();
            }
        });
    }

    /**
     * saves the tokenID into the DB
     * @param userId
     * @param tokenId
     */
    static saveToken(userId: number, tokenId: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            let conn;
            try {
                conn = await global.mySQLPool.getConnection();
                await conn.query("INSERT INTO `user_token` (`tokenIdentifier`, `userid`) VALUES (?, ?);", [tokenId, userId]);
                await conn.end();
                resolve();

            } catch (e) {
                reject(e);
                await conn.end();
            }
        });

    }

    /**
     * Creates a new JWT based on the parameters (token is active)
     * @param userId
     * @param userType
     * @param sessionId
     */
    static createJWT(userId: number, userType: UserType, sessionId: string): Promise<string> {
        return new Promise(async (resolve, reject) => {
            let payload: any = {};
            payload.userId = userId;
            payload.session = sessionId;
            payload.userType = userType;
            try {
                await JWTInterface.saveToken(userId, sessionId);
                let token = jwt.sign(payload, privateKey, {algorithm: global.config.webServerConfig.authAlgo});
                resolve(token);
            } catch (e) {
                reject(e);
            }
        });
    }

    /**
     * Validates a express request and loads all data for the processing
     * @param req
     * @param res
     * @param next
     */
    static async checkToken(req: Request, res: Response, next: NextFunction) {
        if (authFreePaths.includes(req.path)) {
            global.logger.log({
                level: 'silly',
                label: 'JWT',
                message: 'auth validation free path: ' + req.path,
                file: path.basename(__filename)
            });
            next();
        } else if (req.method === "OPTIONS") {
            next();
        } else if (req.path.substring(0, 8) === "/webcal/") {
            next();
        } else {
            //get auth header information containing auth token
            let token: string | string[] | undefined = req.headers['x-access-token'] || req.headers['authorization'];

            if (typeof token == "string") {
                if (token.startsWith('Bearer ')) {
                    token = token.slice(7, token.length);
                }
                try {
                    let decoded: any = jwt.verify(token, publicKey);
                    if (typeof decoded == 'object') {
                        decoded['jwtId'] = await JWTInterface.verifyId(decoded.session)
                        req.decoded = decoded;
                        req.user = await User.getById(req.decoded.userId);
                        await req.user.populateUser();
                        if (req.user.permissions instanceof Permissions) {
                            req.decoded.permissions = req.user.permissions;
                        }
                        next();
                    } else {
                        global.logger.log({
                            level: 'error',
                            label: 'JWT',
                            message: '(checkToken) error: ' + token,
                            file: path.basename(__filename)
                        });
                        res.sendStatus(500);
                    }

                } catch (e) {
                    global.logger.log({
                        level: 'warn',
                        label: 'JWT',
                        message: 'validation of token failed: ' + e,
                        file: path.basename(__filename)
                    });
                    return res.sendStatus(401);
                }
            } else {
                return res.sendStatus(401)
            }
        }
    }

    /**
     * removes api access for a Token
     * @param id
     */
    static revokeById(id: string): Promise<void> {
        //Delete token from DB
        return new Promise(async (resolve, reject) => {
            let conn = await global.mySQLPool.getConnection();
            try {
                await conn.query(`DELETE FROM user_token WHERE tokenIdentifier = ?`, [id]);
                global.logger.log({
                    level: 'silly',
                    label: 'JWT',
                    message: 'token revoked: ' + id,
                    file: path.basename(__filename)
                });
                resolve();
            } catch (e) {
                global.logger.log({
                    level: 'error',
                    label: 'JWT',
                    message: 'revoke of token failed ' + id + '; e:' + e,
                    file: path.basename(__filename)
                });
                reject(e);
            } finally {
                await conn.end();
            }
        });
    }

    /**
     * Returns all active tokens for a user
     * @param uid
     */
    static getByUser(uid: number) {
        return new Promise(async (resolve, reject) => {
            let conn = await global.mySQLPool.getConnection();
            try {
                let rows = await conn.query(`SELECT * FROM user_token WHERE userid = ?`, [uid.toString()]);
                resolve(rows);
            } catch (e) {
                global.logger.log({
                    level: 'error',
                    label: 'JWT',
                    message: 'Get by username failed: ' + JSON.stringify(uid) + " Err: " + JSON.stringify(e),
                    file: path.basename(__filename)
                });
                reject(e);
            } finally {
                await conn.end();
            }
        });
    }

    /**
     * Returns all active tokens
     */
    static getAll() {
        //Load all issued tokens from DB
        return new Promise(async (resolve, reject) => {
            let conn = await global.mySQLPool.getConnection();
            try {
                let rows = await conn.query("SELECT * FROM `user_token`");
                resolve(rows);
            } catch (e) {
                global.logger.log({
                    level: 'error',
                    label: 'JWT',
                    message: 'Get all failed: ' + JSON.stringify(e),
                    file: path.basename(__filename)
                });
                reject(e);
            } finally {
                await conn.end();
            }
        });
    }

    /**
     * Revokes all jwt tokens for a user
     * @param uid
     */
    static revokeUser(uid: number): Promise<void> {
        //Delete all tokens for specified user
        return new Promise(async (resolve, reject) => {
            let conn = await global.mySQLPool.getConnection();
            try {
                await conn.query("DELETE From `user_token` where `userid`=?", [uid.toString()]);
                global.logger.log({
                    level: 'silly',
                    label: 'JWT',
                    message: 'Revoked by uid: ' + uid,
                    file: path.basename(__filename)
                });
                resolve();
            } catch (e) {
                global.logger.log({
                    level: 'error',
                    label: 'JWT',
                    message: 'Revoke by username failed: ' + JSON.stringify(uid) + " Err: " + JSON.stringify(e),
                    file: path.basename(__filename)
                });
                reject(e);
            } finally {
                await conn.end();
            }
        });
    }
}