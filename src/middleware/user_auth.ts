import { NextFunction, Request,Response } from "express";
import { ApiError } from "../utils/ApiError";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { AuthRequest } from "../types/request";
const USER_JWT_SECRET = process.env.USER_JWT_SECRET || "";

export const userToken = (req:  AuthRequest, res: Response, next: NextFunction) => {
    const token = req.cookies.auth_token;

    if (!token) {
        throw new ApiError(401, "Unauthorized")
    }

    jwt.verify(token, USER_JWT_SECRET, (err: any, decoded: any) => {
        if (err instanceof TokenExpiredError) {
            throw new ApiError(403, "Token expired")
        }
        else if (decoded) {
            req.userId = decoded?.id as string
            next();
        }
        else if (err instanceof JsonWebTokenError) {
            throw new ApiError(403, "Invalid Token")
        }
    });
}