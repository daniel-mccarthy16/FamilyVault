import json
import boto3
import urllib.request
import logging

#TODO - refactor to typescript??
#TODO - refactor into several functions

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    # Fetch the GitHub token from Secrets Manager
    secrets_client = boto3.client('secretsmanager')
    secret = secrets_client.get_secret_value(SecretId='arn:aws:secretsmanager:ap-southeast-2:891377335175:secret:cicd-github-token-RYutJE')
    github_token = json.loads(secret['SecretString'])['github-token']

    # Define the repository and the headers for the API request
    repo_url = 'https://api.github.com/repos/daniel-mccarthy16/FamilyVault/commits'
    headers = {
        'Authorization': f'token {github_token}',
        'Accept': 'application/vnd.github.v3+json'
    }

    # Fetch the latest commits from the main branch
    params = {
        'sha': 'main',
        'per_page': 2  # Fetch only the latest two commits
    }
    req = urllib.request.Request(f'{repo_url}?sha={params["sha"]}&per_page={params["per_page"]}', headers=headers)
    with urllib.request.urlopen(req) as response:
        commits_data = json.loads(response.read().decode())

    # Ensure there are at least two commits to compare
    if len(commits_data) < 2:
        logger.info("Not enough commits to compare.")
        return {'statusCode': 200, 'body': json.dumps({'message': 'Not enough commits to compare.'})}

    current_commit = commits_data[0]['sha']
    previous_commit = commits_data[1]['sha']

    # Use the GitHub API to compare the two commits
    compare_url = f'https://api.github.com/repos/daniel-mccarthy16/FamilyVault/compare/{previous_commit}...{current_commit}'
    req_compare = urllib.request.Request(compare_url, headers=headers)
    with urllib.request.urlopen(req_compare) as response:
        comparison_data = json.loads(response.read().decode())

    # Determine if changes in specific directories or files require actions
    cdk_test_deploy_required = False
    cdk_testing_required = False
    relevant_paths = ['FamilyVaultCdk/lib/', 'FamilyVaultCdk/package.json']
    additional_paths = ['FamilyVaultCicd/test', 'FamilyVaultCicd/jest.config.ts']

    for file in comparison_data.get('files', []):
        path = file['filename']
        if any(path.startswith(relevant_path) for relevant_path in relevant_paths):
            cdk_test_deploy_required = True
            cdk_testing_required = True  # Set testing required if relevant cdk paths are modified
        if any(path.startswith(additional_path) for additional_path in additional_paths):
            cdk_testing_required = True  # Set testing required if additional paths are modified

    return {
        'statusCode': 200,
        'cdk_test_deploy_required': cdk_test_deploy_required,
        'cdk_testing_required': cdk_testing_required
    }
