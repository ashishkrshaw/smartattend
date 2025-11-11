
import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { User } from '../types';
import * as api from '../services/mockApi';

interface AuthContextType {
    user: User | null;
    login: (username: string, password_hash: string) => Promise<void>;
    logout: () => void;
    isLoading: boolean;
    updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(() => {
        try {
            const storedUser = localStorage.getItem('user');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch {
            return null;
        }
    });
    const [isLoading, setIsLoading] = useState(false);

    const login = useCallback(async (username: string, password_hash: string) => {
        setIsLoading(true);
        try {
            const loggedInUser = await api.loginUser(username, password_hash);
            if (loggedInUser) {
                setUser(loggedInUser);
                localStorage.setItem('user', JSON.stringify(loggedInUser));
            } else {
                throw new Error("Invalid username or password");
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('user');
    }, []);

    const updateUser = useCallback((updatedUser: User) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, isLoading, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};