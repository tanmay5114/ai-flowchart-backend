import { config } from "../types/config"
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
import { DeleteObjectCommand, S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getSignedUrl as getSignedUrlForCDN } from "@aws-sdk/cloudfront-signer";

const region: string = config.region
const bucketName: string = config.bucket_name
const accessKeyId: string = config.aws_access_key_id
const secretAccessKey: string = config.aws_access_key_secret

// const {region , bucket_name: bucketName  } = config

console.log(bucketName)

let s3: S3Client | null = null;
let cloudfront: CloudFrontClient | null = null;


const getS3Instance = async (): Promise<S3Client> => {
    if (!s3) {
        s3 = new S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey
            }
        });
    }
    return s3;
};


const getCDNClient = async (): Promise<CloudFrontClient> => {
    if (!cloudfront) {
        cloudfront = new CloudFrontClient({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey
            }
        });
    }
    return cloudfront;
};


export const getPreSignedUrlForUploading = async (fileName: string, fileType: string) => {
    try {
        s3 = await getS3Instance();

        const allowedTypes = ["image/png", "image/jpg", "image/jpeg", "image/gif", "video/mp4", "video/mov"];

        if (!allowedTypes.includes(fileType)) {
            throw new Error("invalid file type. Only images, gifs and videos are supported");
        }

        const key = `uploads/${fileName}`
        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            ContentType: fileType
        })

        const preSignedUrl = await getSignedUrl(s3, command, {expiresIn: config.presigned_url_expiration_time});
        return { url: preSignedUrl, key }
    } catch (error) {
        console.log(`Error generating pre-signed urls: ${error}`)
        throw error;
    }
}

export const getPreSignedUrlForGettingFilesThroughCDN = async (objectKey: string) => {
    try {
        const signedUrl = getSignedUrlForCDN({
            url: config.cdn_link + objectKey,
            keyPairId: config.cloudfront_key_id,
            dateLessThan: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
            privateKey: config.cloudfront_pvt_key,
        });

        return signedUrl
    } catch (error) {
        console.log(`Error generating pre-signed urls: ${error}`)
        throw error;
    }
}

export const invalidateCDNCache = async (objectKey: string) => {
    try {
        const command = new CreateInvalidationCommand({
            DistributionId: config.distribution_id,
            InvalidationBatch: {
                Paths: { Quantity: 1, Items: [`/${objectKey}`] },
                CallerReference: `${Date.now()}` // just a unique reference, could be anything
            }
        });

        cloudfront = await getCDNClient();
        await cloudfront.send(command);
    } catch (error) {
        console.log(`Error invalidating cache: ${error}`);
        throw error;
    }
}

export const deleteS3Files = async (objectKey: string) => {
    try {
        s3 = await getS3Instance();

        const params = {
            Bucket: bucketName,
            Key: objectKey
        };
            
        await s3.send(new HeadObjectCommand({ Bucket: bucketName, Key: objectKey }));
        const s3Command = new DeleteObjectCommand(params)
        await s3.send(s3Command)

        // now the s3 file is deleted, we also have to invalidate the cache of cloudfront
        await invalidateCDNCache(objectKey);    

    } catch (error: any) {
        if (error.name === "NotFound") {
            console.log(`File ${objectKey} not found in S3, skipping deletion.`);
            throw error;
        }
        console.log(`Error deleting S3 files and images: ${error}`)
        throw error;
    }
}

// always note object key should be like /uploads/fileName
//check during uploading

// s3 user should have access to delete the image also so delete and put basically
// cloudfront user should have access to invalidate the cache
// first create the policy and then assign it to the user

