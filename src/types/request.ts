import {Request} from "express"
export interface AuthRequest extends Request {
    adminId?: string;
    userId?: string;
    cookies: {
        auth_token?: string
    }
}