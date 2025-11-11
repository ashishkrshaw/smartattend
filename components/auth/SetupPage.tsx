import React, { useState } from 'react';
import * as api from '../../services/mockApi';
import { User } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';

interface SetupPageProps {
    onSetupComplete: (user: User) => void;
}

const SetupPage: React.FC<SetupPageProps> = ({ onSetupComplete }) => {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [completedUser, setCompletedUser] = useState<User | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!name.trim()) {
            setError("Please enter your name.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 4) {
            setError("Password must be at least 4 characters long.");
            return;
        }

        setIsLoading(true);
        try {
            const newUser = await api.setupApp(name, password);
            setCompletedUser(newUser);
        } catch (err: any) {
            setError(err.message || 'Setup failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleProceedToLogin = () => {
        if (completedUser) {
            onSetupComplete(completedUser);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
            <div className="max-w-md w-full">
                <div className="flex justify-center mb-4">
                     <img src="/logo.svg" alt="App Logo" className="h-16 w-16 text-primary-600 dark:text-primary-500" />
                </div>
                <Card title={completedUser ? "Setup Complete!" : "Welcome to Smart Attendance"}>
                    {completedUser ? (
                        <div className="text-center space-y-4">
                             <p className="text-green-600 dark:text-green-400">Your account has been created successfully.</p>
                             <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                                <p className="text-gray-600 dark:text-gray-300">Your generated username is:</p>
                                <p className="text-xl font-bold text-primary-600 dark:text-primary-400 select-all">{completedUser.username}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Please save this username for future logins.</p>
                             </div>
                             <Button onClick={handleProceedToLogin} className="w-full">
                                 Proceed to Login
                             </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <p className="text-gray-600 dark:text-gray-300">
                                Let's get your application set up. Enter your details to create the first teacher account.
                            </p>
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            
                            <Input
                                label="Your Full Name"
                                id="teacher-name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                placeholder="e.g., Mr. John Smith"
                            />
                            <Input
                                label="Password"
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                             <Input
                                label="Confirm Password"
                                id="confirm-password"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Setting up...' : 'Complete Setup'}
                            </Button>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default SetupPage;