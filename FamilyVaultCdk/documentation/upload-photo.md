1. Request for Upload
User initiates an upload: The user's client application requests permission to upload an image by hitting an API Gateway endpoint.
Send metadata: The client includes metadata about the image (e.g., expected file size, content type) in this initial request.
2. Validate and Generate Pre-signed URL
Lambda function validates metadata: The endpoint triggers a Lambda function, which validates the provided metadata against your criteria (e.g., file size limits, allowed content types).
Generate pre-signed URL: If the metadata is valid, the Lambda function generates a pre-signed URL for uploading the image directly to a specific path in an S3 bucket. The URL includes conditions based on the validation (e.g., content type, file size range) and an expiration time.
3. Client Uploads Image
Client receives pre-signed URL: Upon receiving the pre-signed URL, the client application uploads the image directly to S3 using the URL. This upload process must conform to the conditions specified (e.g., matching content type, within the size range).
Upload within the expiration window: The client must complete the upload before the pre-signed URL expires, typically within a few minutes to ensure security.
4. S3 Event Notification Triggers Step Function
S3 event notification: Once the image is successfully uploaded to S3, an S3 event notification is configured to trigger a Lambda function.
Lambda function initiates Step Function: This Lambda function acts as a bridge, extracting necessary information from the event (e.g., bucket name, object key) and starting a Step Function execution with this data as input.
5. Step Function Manages Processing Workflow
Initial processing step: The Step Function could start with a Lambda function that verifies the image integrity, extracts additional metadata, or performs initial processing.
Create multiple image sizes: Parallel or sequential Lambda functions are invoked to create various image sizes. Parallel execution can be used for independent sizes to improve efficiency.
Update DynamoDB: Finally, another Lambda function updates a DynamoDB table with metadata about the original and processed images, such as URLs, sizes, and processing details.
6. Optional: Notification of Completion
Notify client application: Once the Step Function completes its workflow, you can optionally notify the client application of the completion status. This could be through a direct response, an update in a database the client polls, or an asynchronous notification service like Amazon SNS or WebSocket API.
Additional Considerations
Error Handling: Incorporate error handling at each stage of the workflow. For instance, if image processing fails, you might want to retry the operation, send an error notification, or clean up any partially processed data.
Security and Permissions: Ensure that IAM roles and policies for Lambda functions and the Step Function have the minimum necessary permissions for their tasks.
Monitoring and Logging: Utilize AWS CloudWatch for logging and monitoring the operation of your Lambda functions, Step Function executions, and S3 uploads to troubleshoot and optimize the workflow.
