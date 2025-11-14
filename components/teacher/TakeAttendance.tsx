import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as api from '../../services/mockApi';
import { Student, ClassSection, AttendanceRecord, Holiday } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';

declare global {
    interface Window {
        faceapi: any;
    }
}

const MODEL_URL = '/models';

const TakeAttendance: React.FC = () => {
    const { user } = useAuth();
    const [assignedClass, setAssignedClass] = useState<ClassSection | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [attendance, setAttendance] = useState<Map<string, { status: 'Present' | 'Absent'; method: 'Manual' | 'FaceScan' }>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [isTodayHoliday, setIsTodayHoliday] = useState(false);
    const [statusMessage, setStatusMessage] = useState('Ready to start attendance.');
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [recognizedThisSession, setRecognizedThisSession] = useState(new Set<string>());
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const faceMatcherRef = useRef<any>(null);

    const today = new Date().toISOString().split('T')[0];

    const loadModels = useCallback(async () => {
        if (modelsLoaded) return;
        setStatusMessage('Loading recognition models...');
        try {
            // Load only necessary models - skip ssdMobilenetv1 for better performance
            await Promise.all([
                window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            setModelsLoaded(true);
            setStatusMessage('Models loaded. Ready to start camera.');
        } catch (error) {
            console.error("Failed to load face-api models", error);
            setStatusMessage('Error loading models. Please refresh.');
        }
    }, [modelsLoaded]);

    const initializeData = useCallback(async () => {
        if (!user) return;
        setIsLoading(true);
        try {
            const classData = await api.getAssignedClass(user.id);
            setAssignedClass(classData);

            if (classData) {
                const [studentsData, holidaysData, attendanceData] = await Promise.all([
                    api.getStudentsByClass(classData.id),
                    api.getHolidays(),
                    api.getAttendance({ classId: classData.id, date: today }),
                ]);
                
                setStudents(studentsData);
                setHolidays(holidaysData);

                const todayIsHoliday = holidaysData.some(h => h.date === today);
                setIsTodayHoliday(todayIsHoliday);

                const initialAttendance = new Map();
                studentsData.forEach(student => {
                    const record = attendanceData.find(a => a.studentId === student.id);
                    if (record) {
                        initialAttendance.set(student.id, { status: record.status, method: record.method });
                    } else {
                        initialAttendance.set(student.id, { status: 'Absent', method: 'Manual' });
                    }
                });
                setAttendance(initialAttendance);

                // Prepare face matcher
                const labeledFaceDescriptors = studentsData
                    .filter(s => s.faceDescriptor && s.faceDescriptor.length > 0)
                    .map(s => new window.faceapi.LabeledFaceDescriptors(s.id, [Float32Array.from(s.faceDescriptor!)]));
                
                if (labeledFaceDescriptors.length > 0) {
                    faceMatcherRef.current = new window.faceapi.FaceMatcher(labeledFaceDescriptors, 0.5);
                }
            }
        } catch (error) {
            console.error("Error initializing data", error);
            setStatusMessage('Failed to load class data.');
        } finally {
            setIsLoading(false);
            loadModels();
        }
    }, [user, today, loadModels]);

    useEffect(() => {
        initializeData();
    }, [initializeData]);

    const stopCamera = useCallback(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = async () => {
        if (isCameraOn) return;
        setIsCameraOn(true);
        setStatusMessage('Starting camera...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            streamRef.current = stream;
        } catch (err) {
            setStatusMessage('Camera access denied. Please check permissions.');
            setIsCameraOn(false);
        }
    };
    
    const handleVideoPlay = () => {
        if (!faceMatcherRef.current) {
            setStatusMessage("No student faces registered for recognition.");
            return;
        }
        
        // Setup canvas once
        const canvas = window.faceapi.createCanvasFromMedia(videoRef.current!);
        canvasRef.current!.innerHTML = '';
        canvasRef.current!.appendChild(canvas);
        
        setStatusMessage("Detecting faces...");
        intervalRef.current = setInterval(async () => {
            if (videoRef.current && canvas) {
                const displaySize = { width: videoRef.current.clientWidth, height: videoRef.current.clientHeight };
                window.faceapi.matchDimensions(canvas, displaySize);
                
                // Clear previous drawings
                const ctx = canvas.getContext('2d');
                if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);

                // Use only TinyFaceDetector for speed (skip ssdMobilenetv1)
                const detections = await window.faceapi
                    .detectAllFaces(videoRef.current, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptors();
                
                if (detections.length === 0) return;
                
                const resizedDetections = window.faceapi.resizeResults(detections, displaySize);
                const results = resizedDetections.map((d: any) => faceMatcherRef.current.findBestMatch(d.descriptor));

                results.forEach((result: any, i: number) => {
                    const box = resizedDetections[i].detection.box;
                    const studentId = result.label;
                    const student = students.find(s => s.id === studentId);
                    
                    if (student && studentId !== 'unknown') {
                        // Draw box with student name
                        const drawBox = new window.faceapi.draw.DrawBox(box, { 
                            label: `${student.name} ${recognizedThisSession.has(studentId) ? '✓' : ''}`,
                            boxColor: recognizedThisSession.has(studentId) ? '#10b981' : '#2563eb' 
                        });
                        drawBox.draw(canvas);
                        
                        // Only mark if not already recognized in this session
                        if (!recognizedThisSession.has(studentId)) {
                           markAttendance(studentId, 'Present', 'FaceScan');
                           setRecognizedThisSession(prev => new Set(prev).add(studentId));
                           setStatusMessage(`✓ Recognized: ${student.name}`);
                        }
                    }
                });
            }
        }, 600); // Increased from 300ms to 600ms for better performance
    };

    const handleCameraToggle = () => {
        if (isCameraOn) {
            stopCamera();
            setIsCameraOn(false);
            setStatusMessage('Camera off.');
        } else {
            setRecognizedThisSession(new Set()); // Reset for new session
            startCamera();
        }
    };

    const toggleCamera = async () => {
        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newFacingMode);
        
        if (isCameraOn) {
            // Restart camera with new facing mode
            stopCamera();
            setStatusMessage('Switching camera...');
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacingMode } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // Wait for video to be ready and restart detection
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current?.play();
                        handleVideoPlay();
                    };
                }
                streamRef.current = stream;
                setStatusMessage('Camera switched. Detecting faces...');
            } catch (err) {
                setStatusMessage('Failed to switch camera.');
            }
        }
    };

    const markAttendance = (studentId: string, status: 'Present' | 'Absent', method: 'Manual' | 'FaceScan' = 'Manual') => {
        setAttendance(prev => new Map(prev).set(studentId, { status, method }));
    };

    const handleSaveAttendance = async () => {
        setIsLoading(true);
        const recordsToSave = Array.from(attendance.entries()).map(([studentId, data]) => ({
            studentId,
            date: today,
            status: data.status,
            method: data.method,
        }));
        try {
            await api.saveAttendance(recordsToSave);
            setStatusMessage('Attendance saved successfully!');
        } catch (error) {
            setStatusMessage('Failed to save attendance.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        return () => stopCamera();
    }, [stopCamera]);
    
    if (isLoading && !modelsLoaded) {
        return <Card title="Take Attendance"><p>Loading class data...</p></Card>;
    }
    
    if (isTodayHoliday) {
        const holidayDesc = holidays.find(h => h.date === today)?.description;
        return (
            <Card title="Take Attendance">
                <div className="text-center p-8">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Today is a Holiday!</h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">{holidayDesc}</p>
                </div>
            </Card>
        );
    }
    
    if (!assignedClass) {
        return <Card title="Take Attendance"><p>You are not assigned to any class. Please contact the administrator.</p></Card>;
    }

    return (
        <Card>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                 <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    Attendance for {assignedClass.name} on {new Date(today).toLocaleDateString()}
                </h2>
                <div className="flex space-x-2">
                     <Button onClick={handleCameraToggle} disabled={!modelsLoaded} variant={isCameraOn ? 'danger' : 'primary'}>
                        {isCameraOn ? 'Stop Camera' : 'Start Face Scan'}
                    </Button>
                    <Button onClick={handleSaveAttendance}>Save Attendance</Button>
                </div>
            </div>

            <p className="text-center text-sm font-medium p-2 bg-gray-100 dark:bg-gray-700 rounded-md mb-4">{statusMessage}</p>
            
            {isCameraOn && (
                <div className="mb-4 relative w-full aspect-video bg-black rounded-md overflow-hidden">
                    <video ref={videoRef} onPlay={handleVideoPlay} autoPlay muted playsInline className="w-full h-full object-cover -scale-x-100" />
                    <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />
                    <button
                        type="button"
                        onClick={toggleCamera}
                        className="absolute top-2 right-2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-3 rounded-full transition-all z-10"
                        title="Switch Camera"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white text-xs px-3 py-1 rounded">
                        Using: {facingMode === 'user' ? 'Front' : 'Rear'} Camera
                    </div>
                </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map(student => {
                    const att = attendance.get(student.id) || { status: 'Absent', method: 'Manual' };
                    return (
                        <div key={student.id} className={`p-3 rounded-lg shadow-sm border-l-4 ${att.status === 'Present' ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'}`}>
                            <div className="flex items-center space-x-3">
                                <img src={student.photo || 'https://i.pravatar.cc/300?u='+student.id} alt={student.name} className="w-14 h-14 rounded-full object-cover" />
                                <div className="flex-grow">
                                    <p className="font-semibold text-gray-800 dark:text-gray-200">{student.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Roll No: {student.rollNo}</p>
                                    {att.status === 'Present' && (
                                        <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                            Marked via: {att.method}
                                        </span>
                                    )}
                                </div>
                                <div className="flex flex-col space-y-1">
                                    <Button size="sm" variant={att.status === 'Present' ? 'primary' : 'secondary'} onClick={() => markAttendance(student.id, 'Present')}>P</Button>
                                    <Button size="sm" variant={att.status === 'Absent' ? 'danger' : 'secondary'} onClick={() => markAttendance(student.id, 'Absent')}>A</Button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </Card>
    );
};

export default TakeAttendance;