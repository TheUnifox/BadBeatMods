import { randomBytes } from 'crypto';

export class HTTPTools {
    public static createRandomString(byteCount:number): string {
        let key = randomBytes(byteCount).toString(`base64url`);
        return key;
    }

    /*
    public static validateStringParameter(param: any | undefined, minLength:number = 1, maxLength:number = 2048): param is string {
        if (typeof param === `string`) {
            if (param.length >= minLength) {
                return true;
            }
        }
        return false;
    }

    public static parseNumberParameter(param: any | undefined): number | undefined {
        if (typeof param === `number`) {
            return param;
        } else if (typeof param === `string`) {
            const num = parseInt(param, 10);
            if (!isNaN(num)) {
                return num;
            }
        }
        return undefined;
    }

    public static validateNumberParameter(param: any | undefined, min:number = 0, max:number = Number.MAX_SAFE_INTEGER): param is number {
        const num = this.parseNumberParameter(param);
        if (num !== undefined) {
            if (num >= min && num <= max) {
                return true;
            }
        }
        return false;
    }

    public static validateNumberArrayParameter(param: any | undefined): param is Array<number> {
        if (Array.isArray(param)) {
            for (let num of param) {
                if (!this.validateNumberParameter(num)) {
                    return false;
                }
            }
            return true;
        }
        return false;
    }
    */
}