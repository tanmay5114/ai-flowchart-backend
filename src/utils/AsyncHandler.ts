import { NextFunction, RequestHandler, Request, Response } from "express";
import { ApiError } from "./ApiError";
import { AuthRequest } from "../types/request";

const asyncHandler = (requestHandler: RequestHandler): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(requestHandler(req, res, next)).catch((error) => {
            if (error instanceof ApiError) {
                return res.status(error.statusCode).json({
                    message: error.message,
                    success: false,
                    errors: error.errors,
                });
            }
            next(error);
        });
    };
};

export { asyncHandler };
