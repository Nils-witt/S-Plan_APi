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
import {Course} from "./Course";
import {Exam} from "./Exam";
import {RoomLinks} from "./RoomLinks";

declare const global: ApiGlobal;

export class Exams {

    /**
     * @returns {Promise<Exam[]>}
     */
    static getAll(): Promise<Exam[]> {
        return new Promise(async (resolve, reject) => {
            let conn = await global.mySQLPool.getConnection();
            try {
                let rows = await conn.query("SELECT `data_exams`.*, `data_exam_rooms`.room   FROM `data_exams` LEFT JOIN `data_exam_rooms` ON `data_exams`.`roomLink` = `data_exam_rooms`.`iddata_exam_rooms`");
                resolve(await this.sqlRowToArray(rows));
            } catch (err) {
                global.logger.log({
                    level: 'error',
                    label: 'exams',
                    message: 'Get All failed: ' + JSON.stringify(err)
                });
                reject();
            } finally {
                await conn.end();
            }
        });
    }

    /**
     * @param course {Course}
     * @returns {Promise<Exam[]>}
     */
    static getByCourse(course: Course): Promise<Exam[]> {
        return new Promise(async (resolve, reject) => {
            let conn = await global.mySQLPool.getConnection();
            try {
                let rows = await conn.query("SELECT * FROM `data_exams` WHERE `subject`= ? AND `grade`= ? AND `group`= ?", [course.subject, course.grade, course.group]);
                resolve(await this.sqlRowToArray(rows));
            } catch (e) {
                global.logger.log({
                    level: 'error',
                    label: 'exams',
                    message: 'Get by course failed: ' + JSON.stringify(course) + " Err: " + JSON.stringify(e)
                });
                reject();
            } finally {
                await conn.end();
            }
        });
    }

    /**
     * @returns {Promise<Exam[]>}
     */
    static getByTeacher(teacher: string): Promise<Exam[]> {
        return new Promise(async (resolve, reject) => {
            let conn = await global.mySQLPool.getConnection();
            try {
                let rows = await conn.query("SELECT * FROM `data_exams` WHERE `teacher`= ?", [teacher]);
                resolve(await this.sqlRowToArray(rows));
            } catch (e) {
                //TODO add logger
                reject(e);

            } finally {
                await conn.end();
            }
        });
    }

    /**
     * @returns {Promise<Exam[]>}
     */
    static sqlRowToArray(rows: any): Promise<Exam[]> {
        return new Promise(async (resolve, reject) => {
            let data: Exam[] = [];
            for (let i = 0; i < rows.length; i++) {
                let element = rows[i];
                let date = new Date(element["date"]);
                element["date"] = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, "0") + "-" + date.getDate().toString().padStart(2, "0");
                data.push(new Exam(element["visibleOnDisplay"], element["date"], new Course(element["grade"], element["subject"], element["group"]), element["from"], element["to"], element["teacher"], element["students"], await RoomLinks.getById(element["roomLink"]), element["iddata_klausuren"], element["uniqueIdentifier"]))
            }
            resolve(data);
        });
    }

    /**
     * @returns {Promise<Exam[]>}
     */
    static getByRoomLink(roomLinkId: number): Promise<Exam[]> {
        return new Promise(async (resolve, reject) => {
            let conn;
            try {
                conn = await global.mySQLPool.getConnection();
                let rows = await conn.query("SELECT * FROM data_exams where roomLink = ?;", [roomLinkId]);
                resolve(await this.sqlRowToArray(rows));
            } catch (e) {
                global.logger.log({
                    level: 'error',
                    label: 'exams',
                    message: 'Get supervisors by exam failed: ' + roomLinkId + " Err: " + JSON.stringify(e)
                });
                reject(e);
            } finally {
                await conn.end();
            }
        });
    }
}








