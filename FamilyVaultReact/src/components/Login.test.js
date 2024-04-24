import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Login from './Login';

test('renders login form and submits input', () => {
    render(<Login />);
    
    // Check if input elements are rendered
    const usernameInput = screen.getByLabelText(/username:/i);
    const passwordInput = screen.getByLabelText(/password:/i);
    const loginButton = screen.getByRole('button', { name: /login/i });

    // Simulate user typing into the input fields
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password' } });

    // Simulate form submission
    fireEvent.click(loginButton);

    // Optionally check function calls or effects of submission
    // This may require mocking functions or API calls
});
