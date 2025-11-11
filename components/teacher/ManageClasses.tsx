import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/mockApi';
import { ClassSection } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Card from '../ui/Card';

const ManageClasses: React.FC = () => {
    const [classes, setClasses] = useState<ClassSection[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        const classData = await api.getAllClasses();
        setClasses(classData);
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const handleClassAdded = (newClass: ClassSection) => {
        setIsModalOpen(false);
        setClasses(prev => [...prev, newClass]);
    };
    
    const handleClassDeleted = async (classId: string) => {
        if(window.confirm("Are you sure you want to delete this class? All students in this class will also be deleted.")) {
            await api.deleteClass(classId);
            setClasses(prev => prev.filter(c => c.id !== classId));
        }
    }

    return (
        <Card title="Manage School Classes" action={<Button onClick={() => setIsModalOpen(true)}>Add Class</Button>}>
            {isLoading ? <p>Loading classes...</p> : (
                 <div className="overflow-x-auto">
                    <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Name</th>
                                <th className="py-3 px-6 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                             {classes.length > 0 ? classes.map(c => (
                                <tr key={c.id}>
                                    <td className="py-4 px-6 whitespace-nowrap font-medium">{c.name}</td>
                                    <td className="py-4 px-6 whitespace-nowrap text-right">
                                        <Button size="sm" variant="danger" onClick={() => handleClassDeleted(c.id)}>Delete</Button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={2} className="text-center py-4">No classes found. Add the first class.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
            <AddClassModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onClassAdded={handleClassAdded} />
        </Card>
    );
};

const AddClassModal: React.FC<{ isOpen: boolean; onClose: () => void; onClassAdded: (newClass: ClassSection) => void; }> = ({ isOpen, onClose, onClassAdded }) => {
    const [className, setClassName] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        try {
            const newClass = await api.createClass({ name: className });
            onClassAdded(newClass);
            setClassName('');
        } catch (err: any) {
            setError(err.message || "Failed to create class");
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Class">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Input label="Class Name (e.g., Grade 5)" value={className} onChange={(e) => setClassName(e.target.value)} required />
                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Add Class</Button>
                </div>
            </form>
        </Modal>
    );
};

export default ManageClasses;
