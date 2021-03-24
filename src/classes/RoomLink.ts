/*
 * Copyright (c) 2021 Nils Witt.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {ApiGlobal} from "../types/global";
import path from "path";
import {Supervisor} from "./user/Supervisor";

declare const global: ApiGlobal;


export class RoomLink {
    public room: string;
    public from: string;
    public to: string;
    public date: string;
    public id: number;
    public supervisors: Supervisor[];

    constructor(room: string, from: string, to: string, date: string, id: number, supervisors: Supervisor[] = []) {
        this.room = room;
        this.from = from;
        this.to = to;
        this.date = date;
        this.id = id;
        this.supervisors = supervisors;
    }

    /**
     * @returns {Promise<RoomLink[]>}
     */
    static getRoomLinks(date: string, room: string): Promise<RoomLink[]> {
        return new Promise(async (resolve, reject) => {
            let conn = await global.mySQLPool.getConnection();
            try {
                let roomLinks: RoomLink[] = [];
                let rows = await conn.query("SELECT * FROM `exams_rooms` WHERE `date`= ? AND `room`= ? ", [date, room]);
                rows.forEach((element: any) => {
                    let date = new Date(element["date"]);
                    element["date"] = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, "0") + "-" + date.getDate().toString().padStart(2, "0");
                    roomLinks.push(element);
                });
                resolve(roomLinks);
            } catch (e) {
                global.logger.log({
                    level: 'error',
                    label: 'exams',
                    message: 'Get by course failed:  Err: ' + JSON.stringify(e),
                    file: path.basename(__filename)
                });
                reject();
            } finally {
                await conn.end();
            }
        });
    }

    /**
     * @returns {Promise<RoomLink>}
     */
    static getById(id: number): Promise<RoomLink> {
        return new Promise(async (resolve, reject) => {
            let conn;
            try {
                conn = await global.mySQLPool.getConnection();
                let result = await conn.query("SELECT * FROM exams_rooms WHERE id_exam_rooms = ?", [id]);
                if (result.length === 1) {
                    let row = result[0];
                    resolve(await this.fromSqlRow(row));
                } else {
                    reject("No roomlink");
                }

            } catch (e) {

            } finally {
                await conn.end();
            }
        });
    }

    static fromSqlRow(row: RoomLinkSqlRow): Promise<RoomLink> {
        return new Promise(async (resolve, reject) => {
            let date = new Date(row["date"]);
            let dateString = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, "0") + "-" + date.getDate().toString().padStart(2, "0");
            let rl = new RoomLink(row.room, row.from, row.to, dateString, row.id_exam_rooms, await Supervisor.getByRoomLink(row.id_exam_rooms));
            resolve(rl);

        });
    }


    /**
     * @returns {Promise<void>}
     */
    save(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            let conn = await global.mySQLPool.getConnection();
            try {
                await conn.query("INSERT INTO exams_rooms (room, `from`, `to`, date) VALUES (?, ?, ?, ?)", [this.room, this.from, this.to, this.date]);
                resolve();
            } catch (e) {
                global.logger.log({
                    level: 'error',
                    label: 'roomLink',
                    message: 'RoomLink Save failed: ' + JSON.stringify(this) + " Err: " + JSON.stringify(e),
                    file: path.basename(__filename)
                });
                reject(e);
            } finally {
                await conn.end();
            }
        });
    }
}

type RoomLinkSqlRow = {
    id_exam_rooms: number;
    room: string;
    from: string;
    to: string;
    date: string;
}