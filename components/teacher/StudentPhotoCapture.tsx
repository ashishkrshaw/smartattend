import React, { useState, useRef, useCallback, useEffect } from 'react';
import Button from '../ui/Button';
import Modal from '../ui/Modal'; // Import Modal

declare global {
    interface Window {
        faceapi: any;
    }
}

interface StudentPhotoCaptureProps {
    onPhotoCaptured: (data: { photo: string; descriptor: number[] }) => void;
    onCaptureError: (error: string) => void;
    initialImage?: string;
}

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

const loadFaceApiModels = async () => {
    await window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
    await window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
};

const StudentPhotoCapture: React.FC<StudentPhotoCaptureProps> = ({ onPhotoCaptured, onCaptureError, initialImage }) => {
    const [image, setImage] = useState<string | null>(null);
    const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
    const [detectionStatus, setDetectionStatus] = useState<'idle' | 'detecting' | 'detected' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('Photo Preview');
    const [modelsLoaded, setModelsLoaded] = useState(false);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if(initialImage) {
            setImage(initialImage);
            setStatusMessage('Current photo. Capture or upload to replace.');
        }
    }, [initialImage]);

    useEffect(() => {
        const initFaceApi = async () => {
            if (window.faceapi && !modelsLoaded) {
                try {
                    await loadFaceApiModels();
                    setModelsLoaded(true);
                    setStatusMessage(initialImage ? 'Current photo. Capture or upload to replace.' : 'Ready to capture');
                } catch (error) {
                    console.error("Failed to load face-api models", error);
                    setStatusMessage('Model loading failed.');
                    setDetectionStatus('error');
                    onCaptureError('Could not load face recognition models.');
                }
            }
        };
        initFaceApi();
    }, [onCaptureError, initialImage, modelsLoaded]);
    
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    useEffect(() => {
        const startStream = async () => {
            if (isCaptureModalOpen) {
                try {
                    stopCamera(); // Ensure previous stream is stopped
                    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                    }
                    streamRef.current = stream;
                } catch (error) {
                    console.error("Error accessing camera:", error);
                    alert("Could not access the camera. Please check permissions.");
                    setIsCaptureModalOpen(false); // Close modal on error
                }
            }
        };
        startStream();

        return () => {
            stopCamera();
        };
    }, [isCaptureModalOpen, stopCamera]);


    const processImageForDescriptor = async (imageSrc: string) => {
        onCaptureError('');
        setStatusMessage('Detecting face...');
        setDetectionStatus('detecting');
        
        const img = document.createElement('img');
        img.src = imageSrc;
        await new Promise(resolve => { img.onload = resolve });

        const detections = await window.faceapi.detectAllFaces(img, new window.faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptors();

        if (detections.length === 0) {
            setStatusMessage('No face detected. Try again.');
            setDetectionStatus('error');
            setImage(null); // Clear the bad image
            onCaptureError('No face detected. Please ensure the face is clear and well-lit.');
            return;
        }
        if (detections.length > 1) {
            setStatusMessage('Multiple faces detected.');
            setDetectionStatus('error');
            setImage(null); // Clear the bad image
            onCaptureError('Multiple faces detected. Please capture only one student at a time.');
            return;
        }

        setStatusMessage('Face registered successfully!');
        setDetectionStatus('detected');
        onPhotoCaptured({
            photo: imageSrc,
            descriptor: Array.from(detections[0].descriptor)
        });
    };

    const handleOpenCamera = () => {
        onCaptureError('');
        setDetectionStatus('idle');
        setIsCaptureModalOpen(true);
    };

    const capturePhotoAndClose = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                // Flip the image horizontally to correct the mirror effect from the preview
                context.translate(canvas.width, 0);
                context.scale(-1, 1);
                context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            }
            const dataUrl = canvas.toDataURL('image/jpeg');
            setImage(dataUrl);
            setIsCaptureModalOpen(false); // This triggers stopCamera via useEffect cleanup
            processImageForDescriptor(dataUrl);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setIsCaptureModalOpen(false); // Ensure camera modal is closed
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                setImage(dataUrl);
                processImageForDescriptor(dataUrl);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };
    
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Photo</label>
             <div className="w-full h-48 bg-gray-200 rounded-md flex items-center justify-center overflow-hidden relative">
                {image ? (
                    <img src={image} alt="Student" className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="mt-2 block text-sm font-medium">{!modelsLoaded ? 'Loading models...' : 'No Photo'}</span>
                    </div>
                )}
                
                {detectionStatus !== 'idle' && image && (
                     <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                         <p className={`text-xs px-2 py-1 rounded ${
                            detectionStatus === 'detected' ? 'bg-green-100 text-green-800' : 
                            'bg-red-100 text-red-800'
                         }`}>
                             {statusMessage}
                         </p>
                     </div>
                 )}

            </div>
            <div className="flex space-x-2 mt-2">
                <Button type="button" size="sm" onClick={handleOpenCamera} disabled={!modelsLoaded}>
                    {image ? 'Retake using Camera' : 'Open Camera'}
                </Button>
                <Button type="button" size="sm" variant="secondary" className="cursor-pointer" onClick={handleUploadClick} disabled={!modelsLoaded}>
                    Upload File
                </Button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </div>

            <Modal isOpen={isCaptureModalOpen} onClose={() => setIsCaptureModalOpen(false)} title="Capture Student Photo">
                <div className="space-y-4">
                    <div className="w-full bg-black rounded-md overflow-hidden aspect-[4/3] relative">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover -scale-x-100" />
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white text-sm px-3 py-1 rounded">
                            Position face in the frame
                        </div>
                    </div>
                    <div className="flex justify-center">
                         <Button type="button" onClick={capturePhotoAndClose} size="lg">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                             </svg>
                             Capture Photo
                         </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default StudentPhotoCapture;
