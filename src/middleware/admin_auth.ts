import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import jwt, { JsonWebTokenError, JwtPayload, TokenExpiredError } from "jsonwebtoken";
import { config } from "../types/config";
import { AuthRequest } from "../types/request";
const ADMIN_JWT_SECRET = config.admin_jwt_secret

export const adminToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies.auth_token;
        if (!token) {
            return next(new ApiError(401, "Unauthorized - No token provided"));
        }

        const decoded = jwt.verify(token, ADMIN_JWT_SECRET) as JwtPayload;

        if (!decoded || !decoded.id) {
            return next(new ApiError(403, "Forbidden - Invalid token"));
        }

        req.adminId = decoded.id;

        next();
    } catch (error) {
        if (error instanceof TokenExpiredError) {
            return next(new ApiError(403, "Token expired, please login again"));
        }
        return next(new ApiError(403, "Invalid authentication token"));
    }
};
