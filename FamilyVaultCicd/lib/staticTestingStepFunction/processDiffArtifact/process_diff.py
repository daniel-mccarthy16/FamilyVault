import json
import boto3

def lambda_handler(event, context):
    bucket_name = event['bucket']
    object_key = event['key']
    
    s3_client = boto3.client('s3')
    
    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
        diff_data = json.loads(response['Body'].read().decode('utf-8'))
        
        return {
            'statusCode': 200,
            'body': json.dumps(diff_data),
            'isBase64Encoded': False
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}),
            'isBase64Encoded': False
        }
