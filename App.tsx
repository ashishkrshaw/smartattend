import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import LoginPage from './components/auth/LoginPage';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import SetupPage from './components/auth/SetupPage';
import * as api from './services/mockApi';
import { User } from './types';
import { useTheme } from './hooks/useTheme';

const AppLoader: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center">
            <svg className="animate-spin h-8 w-8 text-primary-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600 dark:text-gray-300">Loading Application...</p>
        </div>
    </div>
);

const AppContent: React.FC = () => {
    const { user, isLoading, updateUser } = useAuth();
    const [isDbInitialized, setIsDbInitialized] = useState<boolean | null>(null);
    const [forceLogin, setForceLogin] = useState(false);

    useEffect(() => {
        const checkDb = async () => {
            const exists = await api.isDbInitialized();
            setIsDbInitialized(exists);
        };
        checkDb();
    }, []);

    const handleSetupComplete = useCallback((newUser: User) => {
        updateUser(newUser);
        setIsDbInitialized(true);
    }, [updateUser]);

    if (isLoading || isDbInitialized === null) {
        return <AppLoader />;
    }

    if (!isDbInitialized && !forceLogin) {
        return <SetupPage onSetupComplete={handleSetupComplete} onGoToLogin={() => setForceLogin(true)} />;
    }

    if (!user) {
        return <LoginPage />;
    }

    return <TeacherDashboard />;
};

const App: React.FC = () => {
    // Initialize theme hook
    useTheme();
    
    return (
        <AuthProvider>
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
                <AppContent />
            </div>
        </AuthProvider>
    );
};

export default App;