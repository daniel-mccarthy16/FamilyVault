import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { aws_cloudfront_origins as cloudfrontOrigins } from 'aws-cdk-lib';


export class CloudFront extends Construct {

  //TODO - hardcoded region in api origin
  //TODO - interface for props?
  //TODO - shared certificate and CORS
  constructor(scope: Construct, id: string, props: { api: apigateway.RestApi, bucket: s3.Bucket }) {
    super(scope, id);

    const distribution = new cloudfront.Distribution(this, 'MyDistribution', {
      defaultBehavior: {
        origin: new cloudfrontOrigins.S3Origin(props.bucket, {
          originPath: '/public', // Direct CloudFront to fetch content from /public in the bucket
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new cloudfrontOrigins.HttpOrigin(`${props.api.restApiId}.execute-api.ap-southeast-2.region.amazonaws.com`, {
            originPath: `/${props.api.deploymentStage.stageName}`,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED, // API calls typically not cached
        },
        '/css/*': {
          origin: new cloudfrontOrigins.S3Origin(props.bucket, {
            originPath: '/public', // Serve CSS from /public/css in the bucket
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED, // Optimize caching for CSS
        },
        '/js/*': {
          origin: new cloudfrontOrigins.S3Origin(props.bucket, {
            originPath: '/public', // Serve JavaScript from /public/js in the bucket
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED, // Optimize caching for JS
        }
      },
    });

    new cdk.CfnOutput(this, 'DistributionUrl', {
      value: distribution.distributionDomainName,
    });
  }
}
