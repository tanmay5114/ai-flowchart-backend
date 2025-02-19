import aws from "aws-sdk";
import { getSignedUrl } from "aws-cloudfront-sign";
import { config } from "../types/config"

const region: string = config.region
const bucketName: string = config.bucket_name
const accessKeyId: string = config.aws_access_key_id
const secretAccessKey: string = config.aws_access_key_secret

let s3: aws.S3;

const initializeS3 = () => {
    if (s3 instanceof aws.S3) return s3;

    s3 = new aws.S3({
        region, 
        accessKeyId,
        secretAccessKey,
        signatureVersion: 'v4',
    });
};

export const getPreSignedUrlForUploading = async (fileName: string, fileType: string) => {
    try {
        initializeS3();

        const allowedTypes = ["image/png", "image/jpg", "image/jpeg", "image/gif", "video/mp4", "video/mov"];

        if (!allowedTypes.includes(fileType)) {
            throw new Error("invalid file type. Only images, gifs and videos are supported");
        }

        const params = ({
            Bucket: bucketName,
            Key: fileName,
            Expires: 120,
            ContentType: fileType
        });
    
        const uploadUrl = await s3.getSignedUrlPromise("putObject", params);
        return uploadUrl
    } catch (error) {
        console.log(`Error generating pre-signed urls: ${error}`)
        throw error;
    }
}

export const getPreSignedUrlForGettingFilesThroughCDN = async (objectKey: string) => {
    try {
        initializeS3();

        const cfSigningParams = {
            expireTime: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
            keypairId: config.cloudfront_key_id,
            privateKeyString: config.cloudfront_pvt_key,
        };

        const signedUrl = getSignedUrl(
            config.cdn_link + objectKey,
            cfSigningParams
    );

        return signedUrl
    } catch (error) {
        console.log(`Error generating pre-signed urls: ${error}`)
        throw error;
    }
}
