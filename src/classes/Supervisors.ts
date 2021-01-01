/*
 * Copyright (c) 2021 Nils Witt.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {Supervisor} from "./Supervisor";
import {ApiGlobal} from "../types/global";
import {Exams} from "./Exams";

declare const global: ApiGlobal;

export class Supervisors {

    /**
     * @param id
     * @returns {Promise<Supervisor[]>}
     */
    static getByRoomLink(id: number): Promise<Supervisor[]> {
        return new Promise(async (resolve, reject) => {
            let conn;
            try {
                conn = await global.mySQLPool.getConnection();
                let data: Supervisor[] = [];
                //TODO Add Supervisor object
                let rows = await conn.query("SELECT * FROM `data_exam_supervisors` LEFT JOIN `users` ON `data_exam_supervisors`.`TeacherId` = `users`.`idusers` WHERE `RoomLink`= ?", [id]);
                rows.forEach((element: any) => {
                    data.push(element);
                });
                resolve(data);
            } catch (e) {
                global.logger.log({
                    level: 'error',
                    label: 'exams',
                    message: 'Get supervisors by exam failed: ' + id + " Err: " + JSON.stringify(e)
                });
                reject(e);
            } finally {
                await conn.end();
            }
        });
    }

    /**
     * @param id
     * @returns {Promise<Supervisor>}
     */
    static getById(id: number): Promise<Supervisor> {
        return new Promise(async (resolve, reject) => {
            let conn;
            try {
                conn = await global.mySQLPool.getConnection();
                let rows = await conn.query("SELECT `data_exam_supervisors`.*,`users`.*, `data_exam_rooms`.`room`, `data_exam_rooms`.`date` FROM `data_exam_supervisors` LEFT JOIN `users` ON `data_exam_supervisors`.`TeacherId` = `users`.`idusers` LEFT JOIN `data_exam_rooms` ON `data_exam_supervisors`.`RoomLink` = `data_exam_rooms`.`iddata_exam_rooms` WHERE `supervisorId`= ?", [id]);
                if (rows.length > 0) {
                    let date = new Date(rows[0]["date"]);
                    rows[0]["date"] = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, "0") + "-" + date.getDate().toString().padStart(2, "0");
                    rows[0]["exams"] = await Exams.getByRoomLink(rows[0]["RoomLink"]);
                    resolve(rows[0]);
                } else {
                    reject("no row");
                }

            } catch (e) {
                global.logger.log({
                    level: 'error',
                    label: 'exams',
                    message: 'Get supervisor by id failed: ' + id + " Err: " + JSON.stringify(e)
                });
                reject(e);
            } finally {
                await conn.end();
            }
        });
    }

    //TODO REMOVE
    static getByTeacherUsername(username: string): Promise<Supervisor[]> {
        return new Promise(async (resolve, reject) => {
            let conn;
            try {
                conn = await global.mySQLPool.getConnection();
                let rows = await conn.query("SELECT `data_exam_supervisors`.*, `data_exam_rooms`.`room`, `data_exam_rooms`.`date` FROM `data_exam_supervisors` LEFT JOIN `users` ON `data_exam_supervisors`.`TeacherId` = `users`.`idusers` LEFT JOIN `data_exam_rooms` ON `data_exam_supervisors`.`RoomLink` = `data_exam_rooms`.`iddata_exam_rooms` WHERE `TeacherId`= (SELECT idusers FROM users WHERE users.username = ?)", [username]);
                if (rows.length > 0) {
                    let data = [];
                    for (let i = 0; i < rows.length; i++) {
                        let row = rows[i];
                        let date = new Date(row["date"]);
                        row["date"] = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, "0") + "-" + date.getDate().toString().padStart(2, "0");
                        data.push(row)
                    }
                    resolve(data);
                } else {
                    reject("no row");
                }

            } catch (e) {
                global.logger.log({
                    level: 'error',
                    label: 'exams',
                    message: 'Get supervisor by Teacher username failed: ' + username + " Err: " + JSON.stringify(e)
                });
                reject(e);
            } finally {
                await conn.end();
            }
        });
    }
}