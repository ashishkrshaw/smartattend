import React, { useState, useEffect, useCallback } from 'react';
import * as api from '../../services/mockApi';
import { ClassSection, Student } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import Card from '../ui/Card';
import StudentPhotoCapture from './StudentPhotoCapture';
import { useAuth } from '../../hooks/useAuth';

const ManageStudents: React.FC = () => {
    const { user } = useAuth();
    const [assignedClass, setAssignedClass] = useState<ClassSection | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    const fetchAssignedClass = useCallback(async () => {
        if (user) {
            setIsLoading(true);
            const classData = await api.getAssignedClass(user.id);
            setAssignedClass(classData);
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchAssignedClass();
    }, [fetchAssignedClass]);
    
    const fetchStudents = useCallback(async () => {
        if (assignedClass) {
            setIsLoading(true);
            const data = await api.getStudentsByClass(assignedClass.id);
            setStudents(data);
            setIsLoading(false);
        } else {
            setStudents([]);
        }
    }, [assignedClass]);

    useEffect(() => {
        fetchStudents();
    }, [fetchStudents]);

    const handleStudentAdded = (newStudent: Student) => {
        setIsAddModalOpen(false);
        setStudents(prev => [...prev, newStudent]);
    };

    const handleStudentsImported = () => {
        setIsImportModalOpen(false);
        fetchStudents();
    };

    const handleStudentUpdated = (updatedStudent: Student) => {
        setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
        setEditingStudent(null);
    };

    return (
        <Card>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Manage Students: {assignedClass ? assignedClass.name : 'Loading...'}
                </h2>
                <div className="flex space-x-2">
                    <Button onClick={() => setIsImportModalOpen(true)} disabled={!assignedClass} variant="secondary">Bulk Import</Button>
                    <Button onClick={() => setIsAddModalOpen(true)} disabled={!assignedClass}>Add Student</Button>
                </div>
            </div>
            
            {isLoading ? <p>Loading students...</p> : (
                 <>
                    {students.length === 0 ? (
                         <p className="text-center py-8 text-gray-500 dark:text-gray-400">No students found in this class. Add the first student.</p>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {students.map(student => (
                                <div key={student.id} onClick={() => setEditingStudent(student)} className="border dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg p-3 text-center shadow-sm hover:shadow-lg hover:border-primary-500 dark:hover:border-primary-500 transition-all cursor-pointer">
                                    <img src={student.photo || 'https://i.pravatar.cc/300?u='+student.id} alt={student.name} className="w-24 h-24 rounded-full mx-auto object-cover mb-2 bg-gray-200 dark:bg-gray-700" />
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{student.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Roll No: {student.rollNo}</p>
                                </div>
                            ))}
                        </div>
                    )}
                 </>
            )}
            
            {assignedClass && (
                <>
                    <AddStudentModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onStudentAdded={handleStudentAdded} classId={assignedClass.id} />
                    <EditStudentModal isOpen={!!editingStudent} onClose={() => setEditingStudent(null)} onStudentUpdated={handleStudentUpdated} student={editingStudent} />
                    <BulkImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onStudentsImported={handleStudentsImported} classId={assignedClass.id} />
                </>
            )}
        </Card>
    );
};

const AddStudentModal: React.FC<{ isOpen: boolean; onClose: () => void; onStudentAdded: (newStudent: Student) => void; classId: string }> = ({ isOpen, onClose, onStudentAdded, classId }) => {
    const [formData, setFormData] = useState({ name: '', rollNo: '', fatherName: '', village: '' });
    const [photoData, setPhotoData] = useState<{ photo?: string; descriptor?: number[] }>({});
    const [consent, setConsent] = useState(false);
    const [error, setError] = useState('');
    
    const handlePhotoCaptured = (data: { photo: string; descriptor: number[] }) => {
        setError(''); // Clear photo-related errors
        setPhotoData(data);
    };

    const handleCaptureError = (errorMessage: string) => {
        setError(errorMessage);
        setPhotoData({}); // Clear stale photo data on error
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!classId) return;

        if (!photoData.photo || !photoData.descriptor) {
            setError('A valid student photo with a detected face is required.');
            return;
        }
        if (!consent) {
            setError('Parental consent is required to store student photo.');
            return;
        }
        
        try {
            const newStudent = await api.addStudent({
                ...formData,
                classId,
                photo: photoData.photo,
                faceDescriptor: photoData.descriptor,
                consentGiven: consent
            });
            onStudentAdded(newStudent);
            // Reset form
            setFormData({ name: '', rollNo: '', fatherName: '', village: '' });
            setPhotoData({});
            setConsent(false);
        } catch (err: any) {
            setError(err.message || 'Failed to add student');
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Add New Student">
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Input name="name" label="Full Name" value={formData.name} onChange={handleChange} required />
                <Input name="rollNo" label="Roll Number" value={formData.rollNo} onChange={handleChange} required />
                <Input name="fatherName" label="Parent's Name" value={formData.fatherName} onChange={handleChange} required />
                <Input name="village" label="Address / Village" value={formData.village} onChange={handleChange} required />

                <StudentPhotoCapture onPhotoCaptured={handlePhotoCaptured} onCaptureError={handleCaptureError} />

                <div className="flex items-start">
                    <div className="flex items-center h-5">
                        <input id="consent" name="consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700" />
                    </div>
                    <div className="ml-3 text-sm">
                        <label htmlFor="consent" className="font-medium text-gray-700 dark:text-gray-300">Parental Consent</label>
                        <p className="text-gray-500 dark:text-gray-400">I confirm parental consent has been obtained to store this student's photo for attendance purposes.</p>
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Add Student</Button>
                </div>
            </form>
        </Modal>
    );
};

const EditStudentModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    onStudentUpdated: (student: Student) => void; 
    student: Student | null;
}> = ({ isOpen, onClose, onStudentUpdated, student }) => {
    const [formData, setFormData] = useState({ name: '', rollNo: '', fatherName: '', village: '' });
    const [photoData, setPhotoData] = useState<{ photo?: string; descriptor?: number[] }>({});
    const [error, setError] = useState('');

    useEffect(() => {
        if (student) {
            setFormData({
                name: student.name,
                rollNo: student.rollNo,
                fatherName: student.fatherName,
                village: student.village
            });
            setPhotoData({ photo: student.photo, descriptor: student.faceDescriptor });
            setError('');
        }
    }, [student]);

    const handlePhotoCaptured = (data: { photo: string; descriptor: number[] }) => {
        setError('');
        setPhotoData(data);
    };

    const handleCaptureError = (errorMessage: string) => {
        setError(errorMessage);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!student) return;

        if (!photoData.photo) {
            setError('A student photo is required.');
            return;
        }
        
        try {
            const updatedStudent = await api.updateStudentDetails(student.id, {
                ...formData,
                photo: photoData.photo,
                faceDescriptor: photoData.descriptor,
            });
            onStudentUpdated(updatedStudent);
        } catch (err: any) {
            setError(err.message || 'Failed to update student');
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${student?.name}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {error && <p className="text-red-500 text-sm">{error}</p>}
                <Input name="name" label="Full Name" value={formData.name} onChange={handleChange} required />
                <Input name="rollNo" label="Roll Number" value={formData.rollNo} onChange={handleChange} required />
                <Input name="fatherName" label="Parent's Name" value={formData.fatherName} onChange={handleChange} required />
                <Input name="village" label="Address / Village" value={formData.village} onChange={handleChange} required />

                <StudentPhotoCapture
                    onPhotoCaptured={handlePhotoCaptured}
                    onCaptureError={handleCaptureError}
                    initialImage={student?.photo}
                />

                <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                </div>
            </form>
        </Modal>
    );
};

interface StudentData {
    name: string;
    rollNo: string;
    fatherName: string;
    village: string;
}
interface ImportResult {
    success: number;
    failed: number;
    errors: string[];
}

const BulkImportModal: React.FC<{ isOpen: boolean; onClose: () => void; onStudentsImported: () => void; classId: string; }> = ({ isOpen, onClose, onStudentsImported, classId }) => {
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<StudentData[]>([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);

    const resetState = () => {
        setFile(null);
        setParsedData([]);
        setError('');
        setIsLoading(false);
        setImportResult(null);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        resetState();
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        if (selectedFile.type !== 'text/csv') {
            setError('Please upload a valid .csv file.');
            return;
        }
        setFile(selectedFile);
        
        try {
            const { rows } = await parseCSV(selectedFile);
            setParsedData(rows as StudentData[]);
        } catch (err: any) {
            setError(err.message);
        }
    };
    
    const parseCSV = (csvFile: File): Promise<{ header: string[], rows: object[] }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) return reject('CSV is empty or has no data rows.');
                
                const header = lines[0].split(',').map(h => h.trim());
                const requiredHeaders = ['name', 'rollNo', 'fatherName', 'village'];
                const hasAllHeaders = requiredHeaders.every(h => header.includes(h));

                if (!hasAllHeaders) {
                    return reject(`Invalid CSV format. Header must contain: ${requiredHeaders.join(', ')}.`);
                }
                
                const rows = lines.slice(1).map(line => {
                    const values = line.split(',');
                    return header.reduce((obj, nextKey, index) => {
                      (obj as any)[nextKey] = values[index]?.trim() || '';
                      return obj;
                    }, {});
                });
                resolve({ header, rows });
            };
            reader.onerror = (error) => reject(error);
            reader.readAsText(csvFile);
        });
    };

    const handleDownloadTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,name,rollNo,fatherName,village\nExample Student,S101,Example Father,Example Village";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "student_import_template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImport = async () => {
        if (parsedData.length === 0) return;
        
        setIsLoading(true);
        const results: ImportResult = { success: 0, failed: 0, errors: [] };
        
        for (const student of parsedData) {
            if (!student.name || !student.rollNo) {
                results.failed++;
                results.errors.push(`Row skipped: Missing name or roll number.`);
                continue;
            }
            try {
                await api.addStudent({ ...student, classId, photo: undefined, faceDescriptor: undefined, consentGiven: false });
                results.success++;
            } catch (err: any) {
                results.failed++;
                results.errors.push(`Failed to import ${student.name}: ${err.message}`);
            }
        }
        
        setIsLoading(false);
        setImportResult(results);
    };

    return (
        <Modal isOpen={isOpen} onClose={() => { resetState(); onClose(); }} title="Bulk Import Students">
            {importResult ? (
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Import Complete</h3>
                    <p className="text-green-600">{importResult.success} student(s) imported successfully.</p>
                    {importResult.failed > 0 && <p className="text-red-600">{importResult.failed} row(s) failed to import.</p>}
                    {importResult.errors.length > 0 && (
                        <div className="mt-4 max-h-40 overflow-y-auto bg-gray-100 dark:bg-gray-700 p-2 rounded text-sm">
                            <h4 className="font-semibold">Error Details:</h4>
                            <ul className="list-disc list-inside">
                                {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                            </ul>
                        </div>
                    )}
                     <div className="flex justify-end pt-4">
                        <Button onClick={() => { onStudentsImported(); resetState(); }}>Finish</Button>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <div className="text-sm p-3 bg-blue-50 dark:bg-gray-700 border border-blue-200 dark:border-blue-800 rounded-md text-blue-800 dark:text-blue-200">
                        <p>Upload a CSV file with columns: <strong>name, rollNo, fatherName, village</strong>.</p>
                        <p className="mt-1">Students will be imported without photos. You can add photos individually after importing.</p>
                        <button onClick={handleDownloadTemplate} className="text-primary-600 dark:text-primary-400 hover:underline font-medium mt-2">Download Template</button>
                    </div>

                    <div>
                        <label htmlFor="csv-upload" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Upload CSV File</label>
                        <input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} className="block w-full text-sm text-gray-500 dark:text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-50 dark:file:bg-primary-900/50 file:text-primary-700 dark:file:text-primary-300 hover:file:bg-primary-100 dark:hover:file:bg-primary-900" />
                    </div>

                    {parsedData.length > 0 && (
                        <div>
                            <h4 className="font-semibold mb-2">Data Preview (first 5 rows):</h4>
                            <div className="overflow-x-auto border dark:border-gray-700 rounded-md">
                                <table className="min-w-full text-sm">
                                    <thead className="bg-gray-50 dark:bg-gray-700">
                                        <tr>
                                            <th className="p-2 text-left">Name</th>
                                            <th className="p-2 text-left">Roll No</th>
                                            <th className="p-2 text-left">Father's Name</th>
                                            <th className="p-2 text-left">Village</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-gray-700">
                                        {parsedData.slice(0, 5).map((row, i) => (
                                            <tr key={i}>
                                                <td className="p-2">{row.name}</td>
                                                <td className="p-2">{row.rollNo}</td>
                                                <td className="p-2">{row.fatherName}</td>
                                                <td className="p-2">{row.village}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => { resetState(); onClose(); }}>Cancel</Button>
                        <Button onClick={handleImport} disabled={parsedData.length === 0 || isLoading}>
                            {isLoading ? 'Importing...' : `Import ${parsedData.length} Students`}
                        </Button>
                    </div>
                </div>
            )}
        </Modal>
    );
};


export default ManageStudents;