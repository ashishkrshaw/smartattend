import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as api from '../../services/mockApi';
import { User } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';

const Settings: React.FC = () => {
    const { user, updateUser } = useAuth();
    
    if (!user) return null;

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <EditProfileCard user={user} onProfileUpdated={updateUser} />
            <ChangeCredentialsCard user={user} onCredentialsUpdated={updateUser} />
        </div>
    );
};

interface CardProps {
    user: User;
    onProfileUpdated?: (user: User) => void;
    onCredentialsUpdated?: (user: User) => void;
}

const EditProfileCard: React.FC<CardProps> = ({ user, onProfileUpdated }) => {
    const [name, setName] = useState(user.name);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsLoading(true);
        try {
            const updatedUser = await api.updateTeacherProfile(user.id, { name });
            if(onProfileUpdated) onProfileUpdated(updatedUser);
            setSuccess('Profile updated successfully!');
        } catch (err: any) {
            setError(err.message || 'Failed to update profile.');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Card title="Edit Profile">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                {success && <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>}
                <Input 
                    label="Full Name" 
                    id="name"
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading || name === user.name}>
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Card>
    );
};

const ChangeCredentialsCard: React.FC<CardProps> = ({ user, onCredentialsUpdated }) => {
    const [formData, setFormData] = useState({
        currentPassword: '',
        newUsername: user.username || '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (formData.newPassword && formData.newPassword !== formData.confirmNewPassword) {
            setError('New passwords do not match.');
            return;
        }
        
        if (formData.newUsername === user.username && !formData.newPassword) {
            setError('Please provide a new username or a new password.');
            return;
        }

        setIsLoading(true);
        try {
            const updatedUser = await api.updateTeacherCredentials(user.id, {
                current_password_hash: formData.currentPassword,
                new_username: formData.newUsername,
                new_password_hash: formData.newPassword
            });
            if(onCredentialsUpdated) onCredentialsUpdated(updatedUser);
            setSuccess('Credentials updated successfully!');
            setFormData(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmNewPassword: '' }));

        } catch (err: any) {
            setError(err.message || 'Failed to update credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
         <Card title="Change Username/Password">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                {success && <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>}
                <Input 
                    label="New Username" 
                    name="newUsername"
                    value={formData.newUsername} 
                    onChange={handleChange} 
                    required 
                />
                 <Input 
                    label="New Password (leave blank to keep current)" 
                    name="newPassword"
                    type="password"
                    value={formData.newPassword} 
                    onChange={handleChange}
                />
                 <Input 
                    label="Confirm New Password" 
                    name="confirmNewPassword"
                    type="password"
                    value={formData.confirmNewPassword} 
                    onChange={handleChange}
                    disabled={!formData.newPassword}
                />
                <hr className="my-1 border-gray-200 dark:border-gray-700"/>
                 <Input 
                    label="Current Password (required to save changes)" 
                    name="currentPassword"
                    type="password"
                    value={formData.currentPassword} 
                    onChange={handleChange} 
                    required 
                />
                <div className="flex justify-end">
                    <Button type="submit" disabled={isLoading}>
                        {isLoading ? 'Saving...' : 'Save Credentials'}
                    </Button>
                </div>
            </form>
        </Card>
    );
};

export default Settings;