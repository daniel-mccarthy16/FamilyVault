import { APIGatewayProxyHandler, APIGatewayProxyEvent } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommandInput } from "@aws-sdk/client-s3";

//TODO - add validation regarding filename etc...
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
});

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent) => {

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Request body is empty' }),
      };
    }

    const metadata = JSON.parse(event.body);

    if (!metadata.fileName || !metadata.contentType || !metadata.expectedSize) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing required metadata fields.' }),
      };
    }

    const bucketName = process.env.BUCKET_NAME;
    const key = `images/raw/${metadata.fileName}`;

    const putObjectParams: PutObjectCommandInput = {
      Bucket: bucketName,
      Key: key,
      ContentType: metadata.contentType,
      Metadata: {
        expectedSize: metadata.expectedSize.toString(),
      },
    }

    const command = new PutObjectCommand(putObjectParams);

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return {
      statusCode: 200,
      body: JSON.stringify({ uploadUrl: signedUrl }),
    };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error generating signed URL' }),
    };
  }
};
