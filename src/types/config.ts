import dotenv from "dotenv";
import fs from "fs"
import path from "path"

dotenv.config();

const privateKeyPath = process.env.CLOUDFRONT_PVT_KEY || "";
const publicKeyPath = process.env.CLOUDFRONT_PUBLIC_KEY || "";

export const config = {
    admin_jwt_secret: process.env.ADMIN_JWT_SECRET as string,
    user_jwt_secret: process.env.USER_JWT_SECRET as string,
    port: Number(process.env.PORT),
    node_env: process.env.NODE_ENV as string,
    aws_access_key_secret: process.env.AWS_ACCESS_KEY_SECRET as string,
    aws_access_key_id: process.env.AWS_ACCESS_KEY_ID as string,
    bucket_name: process.env.S3_BUCKET_NAME as string,
    region: process.env.S3_REGION as string,
    cloudfront_pvt_key: fs.readFileSync(path.resolve(privateKeyPath), "utf-8"),
    cloudfront_key_id: process.env.CLOUDFRONT_KEY_ID as string,
    cdn_link: process.env.CDN_LINK as string,
    presigned_url_expiration_time: Number(process.env.PRESIGNED_URL_EXPIRATION_TIME) as number,
    distribution_id: process.env.DISTRIBUTION_ID as string
}