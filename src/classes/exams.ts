import {User} from "./user";

import winston from 'winston';
const logger = winston.loggers.get('main');

import {ApiGlobal} from "../types/global";
import {Course} from "./timeTable";
declare const global: ApiGlobal;
let pool = global["mySQLPool"];


export class Exams {

    static getAll(){
        return new Promise(async function (resolve, reject) {
            let conn = await pool.getConnection();
            try {
                let rows = await conn.query("SELECT `splan`.`data_klausuren`.*, `splan`.`data_exam_rooms`.room   FROM `splan`.`data_klausuren` " +
                    "LEFT JOIN `splan`.`data_exam_rooms` ON `splan`.`data_klausuren`.`roomLink` = `splan`.`data_exam_rooms`.`iddata_exam_rooms`");
                for (let row in rows) {
                    if(rows.hasOwnProperty(row)){
                        let date = new Date(rows[row]["date"]);
                        rows[row]["date"] = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2,"0")+ "-" + date.getDate().toString().padStart(2,"0");
                        rows[row]["supervisors"] = await Supervisors.getByRoomLink(rows[row]["roomLink"]);
                    }
                }
                resolve(rows);
            } catch (err) {
                logger.log({
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
        return new Promise(async function (resolve, reject) {
            let conn = await pool.getConnection();
            try {
                //TODO convert To Exam
                let data: Exam[] = [];
                const rows = await conn.query("SELECT * FROM `splan`.`data_klausuren` WHERE `subject`= ? AND `grade`= ? AND `group`= ?", [course.subject, course.grade, course.group]);
                rows.forEach((element:any) => {
                    let date = new Date(element["date"]);
                    element["date"] = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2,"0")+ "-" + date.getDate().toString().padStart(2,"0");
                    data.push(new Exam(element["date"], element["from"], element["to"], course, element["teacher"], element["students"], element["roomLink"], element["visibleOnDisplay"], element["iddata_klausuren"]));
                });
                resolve(data);
            } catch (e) {
                logger.log({
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

    static getByTeacher(teacher: string): Promise<Exam[]>{
        return new Promise(async function (resolve, reject) {
            let conn = await pool.getConnection();
            try {
                let data: Exam[] = [];
                const rows = await conn.query("SELECT * FROM `splan`.`data_klausuren` WHERE `teacher`= ?", [teacher]);
                rows.forEach((element: any) => {
                    let date = new Date(element["date"]);
                    element["date"] = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2,"0")+ "-" + date.getDate().toString().padStart(2,"0");
                    data.push(new Exam(element["date"], element["from"], element["to"], new Course(element["grade"], element["subject"], element["group"]), element["teacher"], element["students"], element["roomLink"], element["visibleOnDisplay"], element["iddata_klausuren"]));
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

    static getByRoomLink(roomLinkId: number): Promise<Exam[]>{
        return new Promise(async function (resolve, reject) {
            let conn;
            try {
                conn = await pool.getConnection();
                let data: Exam[] = [];
                const rows = await conn.query("SELECT * FROM splan.data_klausuren where roomLink = ?;", [roomLinkId]);
                for(let row in rows){
                    let date = new Date(rows[row]["date"]);
                    rows[row]["date"] = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2,"0")+ "-" + date.getDate().toString().padStart(2,"0");
                    let element = rows[row];
                    data.push(new Exam(element["date"], element["from"], element["to"], new Course(element["grade"], element["subject"], element["group"]), element["teacher"], element["students"],element["roomLink"], element["visibleOnDisplay"], element["iddata_klausuren"]));
                }
                resolve(data);
            } catch (e) {
                logger.log({
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

export class RoomLinks {

    static getRoomLinks(date: string,room: string){
        return new Promise(async function (resolve, reject) {
            let conn = await pool.getConnection();
            try {
                let roomLinks: RoomLink[] = [];
                const rows = await conn.query("SELECT * FROM `splan`.`data_exam_rooms` WHERE `date`= ? AND `room`= ? ", [date, room]);
                rows.forEach((element: any) => {
                    let date = new Date(element["date"]);
                    element["date"] = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2,"0")+ "-" + date.getDate().toString().padStart(2,"0");
                    roomLinks.push(element);
                });
                resolve(roomLinks);
            } catch (e) {
                logger.log({
                    level: 'error',
                    label: 'exams',
                    message: 'Get by course failed:  Err: ' + JSON.stringify(e)
                });
                reject();
            } finally {
                await conn.end();
            }
        });
    }


    /**
     *
     * @param roomLink {RoomLink}
     */
    static add(roomLink: RoomLink){
        return new Promise(async function (resolve, reject) {
            let conn = await pool.getConnection();
            try {
                await conn.query("INSERT INTO splan.data_exam_rooms (room, `from`, `to`, date) VALUES (?, ?, ?, ?)", [roomLink.room, roomLink.from, roomLink.to, roomLink.date]);
                resolve();
            } catch (e) {
                logger.log({
                    level: 'error',
                    label: 'roomLink',
                    message: 'RoomLink Save failed: ' + JSON.stringify(roomLink) + " Err: " + JSON.stringify(e)
                });
                reject();
            } finally {
                await conn.end();
            }
        });
    }
}

export class Supervisors {
    static getByRoomLink(id: number): Promise<any[]>{
        return new Promise(async function (resolve, reject) {
            let conn;
            try {
                conn = await pool.getConnection();
                let data: Supervisor[] = [];
                const rows = await conn.query("SELECT * FROM `splan`.`data_exam_supervisors` LEFT JOIN `splan`.`users` ON `splan`.`data_exam_supervisors`.`TeacherId` = `splan`.`users`.`idusers` WHERE `RoomLink`= ?", [id]);
                rows.forEach((element: any) => {
                    data.push(element);
                });
                resolve(data);
            } catch (e) {
                logger.log({
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

    static getById(id: number){
        if(id === undefined){
            return ;
        }
        return new Promise(async function (resolve, reject) {
            let conn;
            try {
                conn = await pool.getConnection();
                const rows = await conn.query("SELECT `splan`.`data_exam_supervisors`.*,`splan`.`users`.*, `splan`.`data_exam_rooms`.`room`, `splan`.`data_exam_rooms`.`date` FROM `splan`.`data_exam_supervisors` LEFT JOIN `splan`.`users` ON `splan`.`data_exam_supervisors`.`TeacherId` = `splan`.`users`.`idusers` LEFT JOIN `splan`.`data_exam_rooms` ON `splan`.`data_exam_supervisors`.`RoomLink` = `splan`.`data_exam_rooms`.`iddata_exam_rooms` WHERE `supervisorId`= ?", [id]);
                if(rows.length > 0){
                    let date = new Date(rows[0]["date"]);
                    rows[0]["date"] = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2,"0")+ "-" + date.getDate().toString().padStart(2,"0");
                    rows[0]["exams"] = await Exams.getByRoomLink(rows[0]["RoomLink"]);
                    resolve(rows[0]);
                }else{
                    reject("no row");
                }

            } catch (e) {
                logger.log({
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

    static getByTeacherUsername(username: string){
        if(username === undefined){
            return ;
        }
        return new Promise(async function (resolve, reject) {
            let conn;
            try {
                conn = await pool.getConnection();
                const rows = await conn.query("SELECT `splan`.`data_exam_supervisors`.*, `splan`.`data_exam_rooms`.`room`, `splan`.`data_exam_rooms`.`date` FROM `splan`.`data_exam_supervisors` LEFT JOIN `splan`.`users` ON `splan`.`data_exam_supervisors`.`TeacherId` = `splan`.`users`.`idusers` LEFT JOIN `splan`.`data_exam_rooms` ON `splan`.`data_exam_supervisors`.`RoomLink` = `splan`.`data_exam_rooms`.`iddata_exam_rooms` WHERE `TeacherId`= (SELECT idusers FROM splan.users WHERE users.username = ?)", [username]);
                if(rows.length > 0){
                    let data = [];
                    for (let i = 0; i < rows.length; i++) {
                        let row = rows[i];
                        let date = new Date(row["date"]);
                        row["date"] = date.getFullYear() + "-" + (date.getMonth() + 1).toString().padStart(2,"0")+ "-" + date.getDate().toString().padStart(2,"0");
                        data.push(row)
                    }
                    resolve(data);
                }else{
                    reject("no row");
                }

            } catch (e) {
                logger.log({
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



export class Exam {
    display: boolean;
    date: string;
    course: Course;
    from: string;
    to: string;
    teacher: string;
    students: number;
    room: any;
    id: number;

    constructor(date = "", from = "", to = "", course: Course, teacher = "", students = 0, room = "", display = false, id = 0) {
        this.course = course;
        this.date = date;
        this.from = from;
        this.to = to;
        this.teacher = teacher;
        this.students = students;
        this.room = room;
        this.display = display;
        this.id = id;
    }

    /**
     *
     * @returns {Promise<boolean>}
     */
    save(){
        let date        = this.date;
        let from        = this.from;
        let to          = this.to;
        let grade       = this.course.grade;
        let subject     = this.course.subject;
        let group       = this.course.group;
        let teacher     = this.teacher;
        let students    = this.students;
        let show        = this.display;
        let room        = this.room;
        let id          = this.id;

        return new Promise(async function (resolve, reject) {
            let avilRoomLinks: any = await RoomLinks.getRoomLinks(date, room);
            if(avilRoomLinks.length == 0){
                await RoomLinks.add(new RoomLink(room, from, to, date));
            }
            avilRoomLinks = await RoomLinks.getRoomLinks(date, room);
            if(avilRoomLinks == 0){
                reject("err");
                return ;
            }
            let linkId = avilRoomLinks[0]["iddata_exam_rooms"];
            let conn ;
            try {
                conn = await pool.getConnection();

                let uniqueIdentifier = grade + '-' + group + '-' + subject + '-' + date;

                let rows = await conn.query('SELECT * FROM splan.data_klausuren WHERE uniqueIdentifier=?', [uniqueIdentifier]);
                if(rows.length > 0 && id == null){
                    reject("row exists");
                    return ;
                }
                if(id != null ){
                    await conn.query("UPDATE `splan`.`data_klausuren` SET `date` = ?, `subject` = ?, `grade` = ?, `group` = ?, `visibleOnDisplay` = ?, `from` = ?, `to` = ?, `teacher` = ?,`students` = ? WHERE (`iddata_klausuren` = ?);", [date, subject, grade, group,  show, from, to, teacher, students, id]);
                }else {
                    await conn.query("INSERT INTO splan.data_klausuren (date, subject, grade, `group`, visibleOnDisplay, `from`, `to`, teacher, students, roomLink) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [date,subject, grade , group, show, from, to, teacher, students, linkId]);
                }
                resolve(true);
            } catch (e) {
                logger.log({
                    level: 'error',
                    label: 'exams',
                    message: 'Err: ' + JSON.stringify(e)
                });
                reject(e);
            } finally {
                await conn.end();
            }
        });
    }


    delete(){
        let id = this.id;

        return new Promise(async function (resolve, reject) {
            let conn = await pool.getConnection();
            try {
                await conn.query("DELETE FROM `splan`.`data_klausuren` WHERE (`iddata_klausuren` = ?);",[id]);
                logger.log({
                    level: 'silly',
                    label: 'exams',
                    message: 'Deleted: ' + JSON.stringify(id)
                });
                resolve();
            } catch (err) {
                logger.log({
                    level: 'error',
                    label: 'exams',
                    message: 'Delete failed: ' + JSON.stringify(id) + " Err: " + JSON.stringify(err)
                });
                reject(err);
            } finally {
                await conn.end();
            }
        });
    }
}

export class RoomLink {
    room: any;
    from: any;
    to: any;
    date: any;

    constructor(room: any, from: any, to: any, date: any) {
        this.room = room;
        this.from = from;
        this.to = to;
        this.date = date;
    }
}

export class Supervisor extends User{

}
