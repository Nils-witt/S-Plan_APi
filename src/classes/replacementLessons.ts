import winston from 'winston';
const logger = winston.loggers.get('main');
//Create Database connection pool for requests
import {ApiGlobal} from "../types/global";
import {Course, Lesson, TimeTable} from "./timeTable";
declare const global: ApiGlobal;
let pool = global["mySQLPool"];

export class ReplacementLessons {
    /**
     * Get replacement lessons by course
     * @param course {course}
     * @returns {Promise<unknown>}
     */
    static getByCourse(course: Course) {
        return new Promise(async (resolve, reject) => {
            let conn = await pool.getConnection();
            try {
                let data: any = [];
                let rows = await conn.query("SELECT data_replacementlessons.iddata_vertretungen, data_replacementlessons.date, data_replacementlessons.subject AS replacmentSubject, data_replacementlessons.room, data_replacementlessons.info, data_replacementlessons.lessonId, data_replacementlessons.teacherId AS replacementTeacherId, data_replacementlessons.replacementId, data_courses.iddata_courses, data_courses.grade, data_courses.subject, data_courses.`group`, data_courses.coursename, data_courses.teacher, data_courses.teacherId FROM splan.data_replacementlessons LEFT JOIN splan.data_lessons ON data_replacementlessons.lessonId = data_lessons.idlessons LEFT JOIN splan.data_courses ON data_lessons.courseId = data_courses.iddata_courses WHERE data_courses.grade = ? AND data_courses.subject = ? AND  data_courses.`group` = ?", [course.grade, course.subject, course.group]);
                rows.forEach((replacementLesson: any) => {
                    let date = new Date(replacementLesson["date"]);
                    replacementLesson["date"] = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2,"0")+ "-" + date.getDate().toString().padStart(2,"0");
                    data.push(replacementLesson);
                });
                resolve(data);
            } catch (e) {
                //TODO add logger
                reject(e);
            } finally {
                await conn.end();
            }

        });
    }

    /**
     * Get replacement lessons by course within the specified time frame
     * @param course {course}
     * @param dateStart {String}
     * @param dateEnd {String}
     * @returns Promise {replacementLesson}
     */
    static getByCourseTimeFrame(course: Course, dateStart: string, dateEnd: string) {
        return new Promise(async function (resolve, reject) {
            let conn = await pool.getConnection();
            try {
                let data: any = [];
                let rows = await conn.query("SELECT * FROM `splan`.`data_replacementlessons` WHERE `lessonId`= (SELECT idlessons FROM splan.data_lessons WHERE courseId = (SELECT iddata_courses FROM splan.data_courses WHERE `grade`= ? AND `subject`= ? AND `group`= ?)) AND `date` >= ? AND `date`<= ?", [course.grade, course.subject, course.group, dateStart, dateEnd]);
                rows.forEach((replacementLesson: any) => {
                    let date = new Date(replacementLesson["date"]);
                    replacementLesson["date"] = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2,"0")+ "-" + date.getDate().toString().padStart(2,"0");
                    data.push(replacementLesson);
                });
                resolve(data);
            } catch (e) {
                //TODO add logger
                reject(e);
            } finally {
                await conn.end();
            }

        });
    }

    /**
     * Get all replacement Lessons
     * @returns Promise {replacementLessons}
     */
    static getAll(): Promise<ReplacementLesson[]> {
        return new Promise(async function (resolve, reject) {
            let conn = await pool.getConnection();
            try {
                let data: any = [];

                let rows = await conn.query("SELECT * FROM splan.data_replacementlessons");
                for (let i = 0; i < rows.length; i++) {
                    let replacementLesson = rows[i];
                    let date = new Date(replacementLesson["date"]);
                    replacementLesson["date"] = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2, "0") + "-" + date.getDate().toString().padStart(2, "0");
                    let lesson: Lesson = await TimeTable.getLessonById(replacementLesson["lessonId"].toString());
                    data.push(new ReplacementLesson(replacementLesson["iddata_vertretungen"], lesson.course, lesson, replacementLesson["teacherId"], replacementLesson["room"], replacementLesson["subject"], replacementLesson["info"], replacementLesson["date"]));
                }
                resolve(data);
            } catch (e) {
                //TODO add logger
                reject(e);
            } finally {
                await conn.end();
            }
        });
    }

    /**
     * Get all replacement lessons within the specified time frame
     * @param date {String}
     * @returns Promise {replacementLessons}
     */
    static getByDate(date: string) {
        return new Promise(async function (resolve, reject) {
            let conn = await pool.getConnection();
            try {
                let data: any = [];

                let rows = await conn.query("SELECT * FROM `splan`.`data_replacementlessons` WHERE `date`= ? ", [date]);
                rows.forEach((replacementLesson: any) => {
                    let date = new Date(replacementLesson["date"]);
                    replacementLesson["date"] = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2,"0")+ "-" + date.getDate().toString().padStart(2,"0");
                    data.push(replacementLesson);
                });
                resolve(data);
            } catch (e) {
                //TODO add logger
                reject(e);
            } finally {
                await conn.end();
            }

        });
    }
    /**
     * //TODO create JDOC
     */
    static getById(id: number) {
        return new Promise(async function (resolve, reject) {
            let conn = await pool.getConnection();
            try {
                let data: any = [];

                let rows = await conn.query("SELECT * FROM `splan`.`data_replacementlessons` WHERE `replacementId`= ? ", [id]);
                rows.forEach((replacementLesson: any) => {
                    let date = new Date(replacementLesson["date"]);
                    replacementLesson["date"] = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2,"0")+ "-" + date.getDate().toString().padStart(2,"0");
                    data.push(replacementLesson);
                });
                resolve(data);
            } catch (e) {
                //TODO add logger
                reject(e);
            } finally {
                await conn.end();
            }

        });
    }

    /**
     * Add a replacementLesson
     * @param replacementLesson {ReplacementLesson}
     * @returns Promise {String} status
     */
    static add(replacementLesson: ReplacementLesson){
        return new Promise(async function (resolve, reject) {
            let conn = await pool.getConnection();
            try {

                try {
                    let rows = await conn.query("INSERT INTO `splan`.`data_replacementlessons` (`date`, `lessonId`, `subject`, `teacherId`, `room`, `info`) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE subject = ?, teacherId = ?, room = ?, info = ?"
                        , [replacementLesson.date, replacementLesson.lesson.id, replacementLesson.subject, replacementLesson.teacherId, replacementLesson.room, replacementLesson.info, replacementLesson.subject, replacementLesson.teacherId, replacementLesson.room, replacementLesson.info]);
                    if (rows.insertId > 0) {
                        resolve("added");
                    } else if (rows.insertId === 0) {
                        resolve("updated");
                    } else {
                        resolve(rows)
                    }

                } catch (e) {
                    if (e.code === "ER_DUP_ENTRY") {
                        console.log("update Needed");
                    }
                    //TODO add logger
                    reject(e)
                }
            } catch (e) {
                //TODO add logger
                reject(e);
            } finally {
                await conn.end();
            }
        });
    }

    /**
     * Delete replacement Lesson by id
     * @param id {string}
     * @returns Promise
     */
    static deleteById(id: string): Promise<Course> {
        return new Promise(async function (resolve, reject) {
            let conn = await pool.getConnection();
            try {
                let rows = await conn.query("SELECT * FROM `splan`.`data_replacementlessons` WHERE `replacementId` = ? ", [id]);
                if(rows.length == 1){
                    await conn.query("DELETE FROM `splan`.`data_replacementlessons` WHERE `replacementId` = ? ", [id]);
                    resolve(rows[0]);
                }else {
                    reject('NE')
                }

            } catch (e) {
                //TODO add logger
                reject(e);
            } finally {
                await conn.end();
            }

        });
    }

    /**
     * Get replacement lessons by teacher
     * @param teacherId {number}
     * @param dateStart {String}
     * @param dateEnd {String}
     * @returns Promise {[replacementLessons]}
     */
    static getByTeacher(teacherId: number, dateStart: string, dateEnd: string){
        return new Promise(async function (resolve, reject) {
            let conn = await pool.getConnection();
            try {
                let data: any = [];
                let rows = await conn.query("SELECT * FROM `splan`.`data_replacementlessons` WHERE `teacherId` = ? AND `date` >= ? AND `date`<= ?", [teacherId, dateStart, dateEnd]);
                rows.forEach((replacementLesson: any) => {
                    data.push(replacementLesson);
                });
                resolve(data);
            } catch (e) {
                //TODO add logger
                reject(e);
            } finally {
                await conn.end();
            }
        });
    }

    static search(info: string){
        return new Promise(async function (resolve, reject) {
            let conn = await pool.getConnection();
            try {
                let data: any = [];
                let rows = await conn.query("SELECT * FROM `splan`.`data_replacementlessons` WHERE `info` LIKE ? ", [info]);
                rows.forEach((replacementLesson: any) => {
                    data.push(replacementLesson);
                });
                resolve(data);
            } catch (e) {
                //TODO add logger
                reject(e);
            } finally {
                await conn.end();
            }
        });
    }
}

export class ReplacementLesson {
    id: number | null;
    course: Course;
    lesson: Lesson;
    teacherId: number | null;
    room: string;
    subject: string;
    info: string;
    date: string;

    constructor(id: number | null, course: Course, lesson: Lesson, teacherId: number| null, room: string, subject: string, info: string, date: string) {
        this.id = id;
        this.course = course;
        this.lesson = lesson;
        this.teacherId = teacherId;
        this.room = room;
        this.subject = subject;
        this.info = info;
        this.date = date;

    }
}