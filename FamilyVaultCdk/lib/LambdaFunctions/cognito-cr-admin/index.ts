import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import { CognitoIdentityProviderClient, AdminCreateUserCommand, AdminSetUserPasswordCommand, AdminAddUserToGroupCommand } from '@aws-sdk/client-cognito-identity-provider';

const secretsManager = new SecretsManager();
const cognito = new CognitoIdentityProviderClient();

export const handler = async (): Promise<void> => {
  try {
    const secretArn = process.env.SECRET_ARN;
    const userPoolId = process.env.USER_POOL_ID;
    const adminEmail = process.env.ADMIN_EMAIL;
    
    if (!secretArn || !userPoolId || !adminEmail) {
      throw new Error('Environment variables SECRET_ARN, USER_POOL_ID, or ADMIN_EMAIL are not set');
    }

    const { SecretString } = await secretsManager.getSecretValue({ SecretId: secretArn });
    if (!SecretString) {
      throw new Error(`No secret found for ARN: ${secretArn}`);
    }
    
    const { username, password } = JSON.parse(SecretString);

    // Create the admin user
    await cognito.send(new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: username,
      TemporaryPassword: password,
      UserAttributes: [
        { Name: 'email', Value: adminEmail },
        { Name: 'email_verified', Value: 'true' }
      ],
      MessageAction: 'SUPPRESS'
    }));

    // Set the user's password to permanent
    await cognito.send(new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: username,
      Password: password,
      Permanent: true
    }));

    // TODO - yet to be tested with a fresh deploy
    await cognito.send(new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: username,
      GroupName: 'admin' 
    }));

    console.log('Admin user created and added to the admin group successfully');
  } catch (error) {
    console.error('Error in user creation or adding to group:', error);
    throw error;
  }
};
