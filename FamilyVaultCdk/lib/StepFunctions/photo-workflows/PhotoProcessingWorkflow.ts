import { Construct } from 'constructs';
import { StateMachine, Chain, LogLevel, IChainable  } from 'aws-cdk-lib/aws-stepfunctions';
import { DynamoPutItem } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Duration, aws_stepfunctions as sfn, aws_stepfunctions_tasks as tasks } from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import { DynamoAttributeValue } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { RemovalPolicy } from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { RustFunction } from 'cargo-lambda-cdk';
import { Choice, Condition, Parallel, Pass } from 'aws-cdk-lib/aws-stepfunctions';


export class PhotoProcessingWorkflow extends Construct {

  public readonly stateMachine: StateMachine;

  constructor(scope: Construct, id: string, s3Bucket: s3.IBucket, dynamoDbTable: dynamodb.ITable) {
    super(scope, id);

    const validationLambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Lambda to access S3',
    });

    //TODO - review policy, maybe the one below used for resizing could share same?
    validationLambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject'],
      resources: [`${s3Bucket.bucketArn}/images/small/*`, `${s3Bucket.bucketArn}/images/medium/*`, `${s3Bucket.bucketArn}/images/large/*`],
    }));
    validationLambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: ['s3:DeleteObject', 's3:GetObject'],
      resources: [`${s3Bucket.bucketArn}/images/raw/*`],
    }));
    validationLambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: ['arn:aws:logs:*:*:*'],
    }));

    const validationAndTransformationLambda = new RustFunction(this, 'ValidationAndTransformation', {
      manifestPath: path.join(__dirname, './lambdas/validationAndTransformation/Cargo.toml'),
      role: validationLambdaExecutionRole,
      timeout: Duration.minutes(10),
      runtime: 'provided.al2',
    });

    const validationLambdaTask = new tasks.LambdaInvoke(this, 'ValidationAndTransformationTask', {
      lambdaFunction: validationAndTransformationLambda,
      inputPath: '$', //pass all of state input to task
    });

  /*
   * DynamoDB Numeric Value Handling in Step Functions:
   * 
   * Issue: Step Functions requires numeric values for DynamoDB to be strings in the JSON payload.
   * 
   * Transformation Steps:
   * 1. Input JSON: "size": 5984449
   * 2. Extract with sfn.JsonPath.numberAt(): Extracts as numeric 5984449
   * 3. Attempted Insertion: "Size": {"N": 5984449}
   * 4. DynamoDB Requirement: Numeric values must be strings in the API payload.
   * 5. Correct Format: "Size": {"N": "5984449"} 
   * 
   * Solution: Use a preprocessing Lambda to convert numeric values to strings.
   *
   * TODO - do i want to store size as a number in dyamodb? what about time? need to look into dynamodb type system docs
   */
    // Define Lambda tasks for resizing

    const putItemTask = new DynamoPutItem(this, 'PutItem', {
      table: dynamoDbTable,
      item: {
        'PK': DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.user')),
        'SK': DynamoAttributeValue.fromString('TODOADDPHOTONAME'),
        'Orientation': DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.orientation')),
        'UploadTime': DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.upload_time')),
        'LargeUrl': DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.large_image_key')),
        'MediumUrl': DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.medium_image_key')),
        'SmallUrl': DynamoAttributeValue.fromString(sfn.JsonPath.stringAt('$.small_image_key')),
      },
      resultPath: '$',
    });

    // =========
    // RESIZE FUNCTION
    // =========
    const resizeLambdaExecutionRole = new iam.Role(this, 'LambdaResizeExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      description: 'Role for Lambda to access S3',
    });
    // Define the policy statement for S3 access
    const resizeLambdaPolicyStatement = new iam.PolicyStatement({
      actions: ['s3:GetObject', 's3:PutObject'],
      resources: [
        `${s3Bucket.bucketArn}/images/*`,
      ],
    });
    resizeLambdaExecutionRole.addToPolicy(resizeLambdaPolicyStatement);

    // Define the policy statement to deny writing to images/raw/*
    const denyResizeLambdaPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.DENY, // Explicitly set the effect to DENY
      actions: ['s3:PutObject'],
      resources: [
        `${s3Bucket.bucketArn}/images/raw/*`, // Specify the path for raw images
      ],
    });
    resizeLambdaExecutionRole.addToPolicy(denyResizeLambdaPolicyStatement);

    const resizeLambda = new RustFunction(this, 'ResizeLambdaFunction', {
      manifestPath: path.join(__dirname, './lambdas/resize/Cargo.toml'),
      role: resizeLambdaExecutionRole,
      timeout: Duration.minutes(10),
      runtime: 'provided.al2',
    });

  const resizeLambdaSmallTask = new tasks.LambdaInvoke(this, 'ResizeToSmallTask', {
      lambdaFunction: resizeLambda,
      payload: sfn.TaskInput.fromObject({
          target_size: 'small', 
          image_key: sfn.JsonPath.stringAt('$.Payload.s3_key'),
          orientation: sfn.JsonPath.stringAt('$.Payload.orientation'),
          bucket_name: sfn.JsonPath.stringAt('$.Payload.bucket_name')
      }),
  })
  resizeLambdaSmallTask.next(putItemTask);


  const resizeParallelMergeFunction = new RustFunction(this, 'ResizeParallelMergeLambdaFunction', {
    manifestPath: path.join(__dirname, './lambdas/mergeResizeOutput/Cargo.toml'),
    timeout: Duration.minutes(1),
    runtime: 'provided.al2',
  });

  const resizeParallelMergeTask = new tasks.LambdaInvoke(this, 'ResizeParallelMergeTask', {
      lambdaFunction: resizeParallelMergeFunction,
      resultSelector: {
          "small_image_key.$": "$.Payload.small_image_key",
          "medium_image_key.$": "$.Payload.medium_image_key",
          "large_image_key.$": "$.Payload.large_image_key",
          "orientation.$": "$.Payload.orientation",
          "upload_time.$": "$.Payload.upload_time",
          "user.$": "$.Payload.user"
      },
  })

  //TODO - if we need any more of these resize tasks, create a constructor function of sorts
  //TODO - should we maybe have the lambdas output simply the new key for the image they are creating? 
  const resizeLargeImageParallel = new Parallel(this, 'ResizeLargeImageParallel' )
      .branch(
          new tasks.LambdaInvoke(this, 'ResizeToSmallParallelTask', {
              lambdaFunction: resizeLambda,
              payload: sfn.TaskInput.fromObject({
                  target_size: 'small', 
                  image_key: sfn.JsonPath.stringAt('$.Payload.s3_key'),
                  orientation: sfn.JsonPath.stringAt('$.Payload.orientation'),
                  bucket_name: sfn.JsonPath.stringAt('$.Payload.bucket_name')
              }),
              resultSelector: {
                  // Select and rename the payload from the Lambda function's output
                  "small_image_key.$": "$.Payload.small_image_key",
                  "medium_image_key.$": "$.Payload.medium_image_key",
                  "large_image_key.$": "$.Payload.large_image_key",
                  "orientation.$": "$.Payload.orientation",
                  "upload_time.$": "$.Payload.upload_time",
                  "user.$": "$.Payload.user"
              },
          })
      )
      .branch(
          new tasks.LambdaInvoke(this, 'ResizeToMediumParallelTask', {
              lambdaFunction: resizeLambda,
              payload: sfn.TaskInput.fromObject({
                  target_size: 'medium', 
                  image_key: sfn.JsonPath.stringAt('$.Payload.s3_key'),
                  orientation: sfn.JsonPath.stringAt('$.Payload.orientation'),
                  bucket_name: sfn.JsonPath.stringAt('$.Payload.bucket_name')
              }),
              resultSelector: {
                  // Select and rename the payload from the Lambda function's output
                  "small_image_key.$": "$.Payload.small_image_key",
                  "medium_image_key.$": "$.Payload.medium_image_key",
                  "large_image_key.$": "$.Payload.large_image_key",
                  "orientation.$": "$.Payload.orientation",
                  "upload_time.$": "$.Payload.upload_time",
                  "user.$": "$.Payload.user"
              },
          })
      );
  resizeLargeImageParallel.next(resizeParallelMergeTask).next(putItemTask);



  //Define a pass state as a placeholder for small images that don't need resizing
  const smallImagePass = new Pass(this, 'ResizeNotRequiredPass');
  smallImagePass.next(putItemTask);

  const checkImageSizeChoice = new Choice(this, 'ChoiceDetermineResizingTasksRequired')
    .when(Condition.stringEquals('$.Payload.size_classification', 'large'), resizeLargeImageParallel)
    .when(Condition.stringEquals('$.Payload.size_classification', 'medium'),resizeLambdaSmallTask )
    .otherwise(smallImagePass);



    const workflowChain = Chain
      .start(validationLambdaTask)
      .next(checkImageSizeChoice)

    const logGroup = new logs.LogGroup(this, 'MyStateMachineLogGroup', {
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.stateMachine = new StateMachine(this, `${id}-StateMachine`, {
      definition: workflowChain,
      logs: {
        destination: logGroup,
        level: LogLevel.ALL,
      },
    });

   const rule = new events.Rule(this, `${id}-S3EventRule`, {
    eventPattern: {
      source: ["aws.s3"],
      detailType: ["Object Created"],
      detail: {
        bucket: {
          name: [s3Bucket.bucketName],
        },
        object: {
          key: [{ "prefix": "images/raw"}]
        }
      }
    }
  });
  // Add the state machine as the target for the EventBridge rule
  rule.addTarget(new targets.SfnStateMachine(this.stateMachine));
  }
}
