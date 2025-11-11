import React from 'react';
import Button from '../ui/Button';
import { useAuth } from '../../hooks/useAuth';
import ThemeToggle from '../ui/ThemeToggle';

const Header: React.FC = () => {
    const { user, logout } = useAuth();

    if (!user) return null;

    return (
        <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center space-x-3">
                         <img src="/logo.svg" alt="App Logo" className="h-8 w-8 text-primary-600 dark:text-primary-500" />
                        <span className="text-xl font-bold text-gray-800 dark:text-gray-100 hidden sm:block">Smart Attendance</span>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <ThemeToggle />
                        <div className='hidden sm:block'>
                            <p className="font-medium text-gray-800 dark:text-gray-200 text-right">{user.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-right">{user.role}</p>
                        </div>
                        <Button onClick={logout} size="sm" variant="secondary">Logout</Button>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;