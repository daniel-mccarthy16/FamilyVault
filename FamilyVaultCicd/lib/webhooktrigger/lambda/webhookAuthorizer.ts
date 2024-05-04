import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { APIGatewayTokenAuthorizerEvent, APIGatewayAuthorizerResult } from "aws-lambda";

const secretsManagerClient = new SecretsManagerClient();

async function getSecret(secretName: string): Promise<string> {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await secretsManagerClient.send(command);
    return response.SecretString || "";
}

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
    const token = event.authorizationToken;
    const expectedToken = await getSecret("github-webhook-secret");

    if (token === expectedToken) {
        return generateAllow(event.methodArn);
    } else {
        return generateDeny(event.methodArn);
    }
};

const generateAllow = (methodArn: string): APIGatewayAuthorizerResult => ({
    principalId: 'user',
    policyDocument: {
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: 'Allow',
                Resource: methodArn
            }
        ]
    }
});

const generateDeny = (methodArn: string): APIGatewayAuthorizerResult => ({
    principalId: 'user',
    policyDocument: {
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'execute-api:Invoke',
                Effect: 'Deny',
                Resource: methodArn
            }
        ]
    }
});
