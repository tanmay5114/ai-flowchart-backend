import dotenv from "dotenv";

dotenv.config();

export const config = {
    admin_jwt_secret: process.env.ADMIN_JWT_SECRET as string,
    user_jwt_secret: process.env.USER_JWT_SECRET as string,
    port: Number(process.env.PORT),
    node_env: process.env.NODE_ENV as string
}