/*
 * Copyright (c) 2021. Nils Witt.
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


import {ApiGlobal} from "../types/global";
import {Starter} from "../startEnviroment";
import {TOTP} from "../classes/secondFactor/TOTP";
import {User} from "../classes/user/User";
import * as twofactor from 'node-2fa';

declare const global: ApiGlobal;

let useStandardENV: boolean = true;

(async () => {
    try {
        Starter.logger();
        Starter.config();
        Starter.mysql();

        if (!useStandardENV) {
            setCustomParams();
        }
        let endpoint: any = await TOTP.new(await User.getByUsername("user"));
        let secret = endpoint.secret;
        console.log(secret)

        // @ts-ignore
        let token: string = (twofactor.generateToken(secret)).token;
        console.log(token)

        // await totp.verify(secret, token);

        console.log("SUCCESSFUL")
        process.exit(0)
    } catch (e) {
        console.log("The tester run into an error:")
        console.error(e);
    }
})();

function setCustomParams() {

}