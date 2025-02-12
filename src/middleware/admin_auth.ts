import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { AuthRequest } from "../types/request";
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || "";

export const adminToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.cookies.auth_token;

    if (!token) {
        throw new ApiError(401, "Unauthorized")
    }

    jwt.verify(token, ADMIN_JWT_SECRET, (err: any, decoded: any) => {
        if (err instanceof TokenExpiredError) {
            throw new ApiError(403, "Token expired")
        }
        else if (decoded && decoded.id) {        
            req.adminId = decoded.id as string
            next();
        }
        else if (err instanceof JsonWebTokenError) {
            throw new ApiError(403, "Invalid Token")
        }
    });
}