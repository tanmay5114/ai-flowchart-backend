import { Request, RequestHandler, Response } from "express";
import { asyncHandler } from "../utils/AsyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { adminSigninSchema, userSigninSchema } from "../types/zodSchema";
import { ApiError } from "../utils/ApiError";
import { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "../helpers/password";
import generateJwtToken from "../helpers/jwt";
import { config } from "../types/config";

const prisma = new PrismaClient();

export const addUser: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const parsedData = userSigninSchema.safeParse(req.body);

    if (!parsedData.success) {
        throw new ApiError(400, `Validation failed: ${parsedData.error.errors.map(e => e.message).join(", ")}`);
    };

    const { username, password } = parsedData.data;

    const user = await prisma.user.findUnique({
        where: {
            username
        },
        select: {
            id: true,
            password: true
        }
    });

    if (!user) {
        const hashedPassword = await hashPassword(password);
        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword
            }
        });

        const token = generateJwtToken(newUser.id, config.user_jwt_secret)
        res.cookie("auth_token", token, {
            httpOnly: true,
            secure: config.node_env === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 1000
        });
        res.status(200).json(new ApiResponse(200, "Successful", { message: "Login successfully" }, true));
        return
    }

    const isAuthenticated: boolean = await verifyPassword(password, user.password);

    if (!isAuthenticated) {
        throw new ApiError(403, "Password not correct");
    }

    const token = generateJwtToken(user.id, config.user_jwt_secret)

    res.cookie("auth_token", token, {
        httpOnly: true,
        secure: config.node_env === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 1000
    });

    res.status(200).json(new ApiResponse(200, "Successful", { message: "Login successfully" }, true));
    return
});


export const addAdmin: RequestHandler = asyncHandler(async (req: Request, res: Response) => {
    const parsedData = adminSigninSchema.safeParse(req.body);

    if (!parsedData.success) {
        throw new ApiError(400, `Validation failed: ${parsedData.error.errors.map(e => e.message).join(", ")}`);
    };

    const { username, password } = parsedData.data;

    const admin = await prisma.admin.findUnique({
        where: {
            username
        },
        select: {
            id: true,
            password: true
        }
    });

    if (!admin) {
        const hashedPassword = await hashPassword(password);
        const newAdmin = await prisma.admin.create({
            data: {
                username,
                password: hashedPassword
            }
        });

        const token = generateJwtToken(newAdmin.id, config.admin_jwt_secret)
        res.cookie("auth_token", token, {
            httpOnly: true,
            secure: config.node_env === "production",
            sameSite: "strict",
            maxAge: 60 * 60 * 1000
        });
        res.status(200).json(new ApiResponse(200, "Successful", { message: "Login successfully" }, true));
        return
    }

    const isAuthenticated: boolean = await verifyPassword(password, admin.password);

    if (!isAuthenticated) {
        throw new ApiError(403, "Password not correct");
    }

    const token = generateJwtToken(admin.id, config.admin_jwt_secret)

    res.cookie("auth_token", token, {
        httpOnly: true,
        secure: config.node_env === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 1000
    });

    res.status(200).json(new ApiResponse(200, "Successful", { message: "Login successfully" }, true));
    return
});