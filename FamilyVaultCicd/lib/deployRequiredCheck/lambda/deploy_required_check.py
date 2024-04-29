import boto3
import json

def handler(event, context):
    # Parse the previous Lambda output
    artifact = event['CodePipeline.job']['data']['inputArtifacts'][0]
    credentials = event['CodePipeline.job']['data']['artifactCredentials']
    bucket = artifact['location']['s3Location']['bucketName']
    key = artifact['location']['s3Location']['objectKey']

    s3 = boto3.client('s3', aws_access_key_id=credentials['accessKeyId'],
                      aws_secret_access_key=credentials['secretAccessKey'],
                      aws_session_token=credentials['sessionToken'])

    # Get the file containing test_deploy_required flag
    file_content = s3.get_object(Bucket=bucket, Key=key)['Body'].read().decode('utf-8')
    flag_data = json.loads(file_content)
    test_deploy_required = flag_data['test_deploy_required']

    # CodePipeline client
    codepipeline = boto3.client('codepipeline')

    if test_deploy_required:
        # Continue the pipeline
        codepipeline.put_job_success_result(jobId=event['CodePipeline.job']['id'])
    else:
        # Stop the pipeline or mark this stage as skipped
        codepipeline.put_job_failure_result(jobId=event['CodePipeline.job']['id'],
                                            failureDetails={'message': 'Deployment not required', 'type': 'JobFailed'})
