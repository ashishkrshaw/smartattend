import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as api from '../../services/mockApi';
import { Teacher, ClassSection } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Card from '../ui/Card';

const ManageTeachers: React.FC = () => {
    const { user } = useAuth();
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [classes, setClasses] = useState<ClassSection[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        if (user) {
            setIsLoading(true);
            const teachersData = await api.getTeachers(user.schoolId);
            const classesData = await api.getClassesBySchool(user.schoolId);
            setTeachers(teachersData);
            setClasses(classesData);
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleTeacherAdded = (newTeacher: Teacher) => {
        setIsModalOpen(false);
        setTeachers(prev => [...prev, newTeacher]);
    };

    const getAssignedClasses = (teacherId: string) => {
        return classes
            .filter(c => c.teacherId === teacherId)
            .map(c => c.name)
            .join(', ');
    };

    return (
        <Card title="Manage Teachers" action={<Button onClick={() => setIsModalOpen(true)}>Add Teacher</Button>}>
            {isLoading ? (
                <p>Loading teachers...</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Classes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {teachers.length > 0 ? teachers.map(teacher => (
                                <tr key={teacher.id}>
                                    <td className="py-4 px-6 whitespace-nowrap text-gray-900">{teacher.name}</td>
                                    <td className="py-4 px-6 whitespace-nowrap text-gray-900">{teacher.username}</td>
                                    <td className="py-4 px-6 whitespace-nowrap text-gray-900">{getAssignedClasses(teacher.id) || 'N/A'}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} className="text-center py-4">No teachers found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            <AddTeacherModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onTeacherAdded={handleTeacherAdded} />
        </Card>
    );
};

const AddTeacherModal: React.FC<{ isOpen: boolean; onClose: () => void; onTeacherAdded: (newTeacher: Teacher) => void; }> = ({ isOpen, onClose, onTeacherAdded }) => {
    const { user: principal } = useAuth();
    const [formData, setFormData] = useState({ name: '', password: '' });
    const [error, setError] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!principal) {
            setError('Principal not logged in.');
            return;
        }
        try {
            const newTeacher = await api.createTeacher({ name: formData.name, password_hash: formData.password }, principal);
            onTeacherAdded(newTeacher);
            // Reset form for next time
            setFormData({ name: '', password: '' });
        } catch (err: any) {
            setError(err.message || 'Failed to create teacher.');
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Teacher">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Input name="name" label="Full Name" value={formData.name} onChange={handleChange} required />
                <Input name="password" label="Password" type="password" value={formData.password} onChange={handleChange} required />
                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Add Teacher</Button>
                </div>
            </form>
        </Modal>
    );
};

export default ManageTeachers;