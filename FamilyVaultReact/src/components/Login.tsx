import React, { useState, useEffect } from 'react';
import { useGlobalContext } from '../context/authContext';
import { useNavigate } from 'react-router-dom';
import {
    CognitoUserPool,
    CognitoUser,
    AuthenticationDetails
} from 'amazon-cognito-identity-js';

const poolData = {
    UserPoolId:  'ap-southeast-2_kaG4YFOGz', // Your user pool ID
    ClientId: '5gfq6orp7uk9q62siuom40up4' // Your client ID
};


//TODO - build this out, does a type already exist in an importable package?
interface UserAttributes {
    email_verified?: boolean,
    phone_number_verified?: boolean,
    [key: string]: any;
}

const userPool = new CognitoUserPool(poolData);

const Login: React.FC = () => {

    const { state, setTokens , isAuthenticated } = useGlobalContext(); // Use the hook to access global state functions
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [isNewPasswordRequired, setIsNewPasswordRequired] = useState(false);
    const [userAttributes, setUserAttributes] = useState<UserAttributes>({});
    const [cognitoUser, setCognitoUser] = useState<CognitoUser|null>(null);
    const navigate = useNavigate(); // Hook for programmatically navigating

    //TODO - review this is confusing, i only need it to run after an attempt to switch to this page right? not as a side effect whenever that state changes
    useEffect(() => {
        if (isAuthenticated()) {
            navigate('/'); // Redirect to home if already logged in
        }
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();

        const userData = {
            Username: username,
            Pool: userPool,
        };

        //TODO - doing this because state in react is async?? is this correct?
        const newCognitoUser = new CognitoUser(userData);
        setCognitoUser(newCognitoUser);

        // Now authenticate the user
        newCognitoUser.authenticateUser(new AuthenticationDetails({
            Username: username,
            Password: password,
        }), {
            onSuccess: (result) => {
               const tokens = {
                    accessToken: result.getAccessToken().getJwtToken(),
                    idToken: result.getIdToken().getJwtToken(),
                    refreshToken: result.getRefreshToken().getToken()
                };
                setTokens(tokens); // Update global state with new tokens
                navigate('/'); // Redirect to home page after successful login
                console.log("Login successful: ", result);
            },
            onFailure: (err) => {
                console.error("Error during login: ", err);
                setError(err.message || JSON.stringify(err));
            },
            newPasswordRequired: (userAttributes, requiredAttributes) => {
                console.log('User needs to set a new password.', userAttributes, requiredAttributes);
                setIsNewPasswordRequired(true);
                setUserAttributes(userAttributes);
            }
        });
    };


    const handleNewPasswordSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();

        if (cognitoUser) {
            // Create a copy of userAttributes to modify
            let attributesToUpdate = { ...userAttributes };
            console.log(attributesToUpdate);

            //TODO - i believe these attributes only had email and email_verified?? needs to be checked phone number deletion possibly redundant
            delete attributesToUpdate.email;
            delete attributesToUpdate.email_verified;
            delete attributesToUpdate.phone_number_verified;

            cognitoUser.completeNewPasswordChallenge(newPassword, attributesToUpdate, {
                onSuccess: (result) => {
                    console.log("Password updated successfully", result);
                    setIsNewPasswordRequired(false); // Reset state or redirect user
                },
                onFailure: (err) => {
                    console.error("Failed to update password", err);
                    setError(err.message || "Failed to update password.");
                }
            });
        } else {
            setError("User session not initialized.");
        }
    };

    return (
        <div>
            {!isNewPasswordRequired ? (
                <form onSubmit={handleSubmit}>
                    <label>
                        Username:
                        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
                    </label>
                    <label>
                        Password:
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                    </label>
                    <button type="submit">Login</button>
                    {error && <p>Error: {error}</p>}
                </form>
            ) : (
                <form onSubmit={handleNewPasswordSubmit}>
                    <label>
                        New Password:
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                    </label>
                    <button type="submit">Update Password</button>
                    {error && <p>Error: {error}</p>}
                </form>
            )}
        </div>
    );
};

export default Login;
