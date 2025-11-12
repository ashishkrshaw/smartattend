
import React, { useState } from 'react';
import { principalSignUp } from '../../services/mockApi';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card from '../ui/Card';

interface SignUpPageProps {
    onSwitchToLogin: () => void;
}

const SignUpPage: React.FC<SignUpPageProps> = ({ onSwitchToLogin }) => {
    const [formData, setFormData] = useState({
        schoolName: '',
        principalName: '',
        contactEmail: '',
        contactPhone: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setIsLoading(true);
        try {
            const result = await principalSignUp({
                name: formData.schoolName,
                principalName: formData.principalName,
                contactEmail: formData.contactEmail,
                contactPhone: formData.contactPhone,
                password_hash: formData.password // Plain text for mock API
            });
            setSuccess(`School registered successfully! Your username is ${result.principal.username}. Please log in.`);
            setTimeout(() => onSwitchToLogin(), 3000);
        } catch (err: any) {
            setError(err.message || 'Sign up failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="max-w-md w-full">
                <Card title="Register Your School">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && <p className="text-red-500 text-sm">{error}</p>}
                        {success && <p className="text-green-600 text-sm">{success}</p>}
                        <Input name="schoolName" label="School Name" value={formData.schoolName} onChange={handleChange} required />
                        <Input name="principalName" label="Principal Name" value={formData.principalName} onChange={handleChange} required />
                        <Input name="contactEmail" label="Contact Email" type="email" value={formData.contactEmail} onChange={handleChange} required />
                        <Input name="contactPhone" label="Contact Phone" type="tel" value={formData.contactPhone} onChange={handleChange} required />
                        <hr className="my-2" />
                        <Input name="password" label="Password" type="password" value={formData.password} onChange={handleChange} required autoComplete="new-password" />
                        <Input name="confirmPassword" label="Confirm Password" type="password" value={formData.confirmPassword} onChange={handleChange} required autoComplete="new-password" />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? 'Registering...' : 'Register'}
                        </Button>
                        <p className="text-sm text-center text-gray-600">
                            Already have an account?{' '}
                            <button type="button" onClick={onSwitchToLogin} className="font-medium text-primary-600 hover:text-primary-500">
                                Login
                            </button>
                        </p>
                    </form>
                </Card>
            </div>
        </div>
    );
};

export default SignUpPage;