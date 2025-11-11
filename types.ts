export enum Role {
    Teacher = 'Teacher',
    Principal = 'Principal',
}

export interface School {
    id: string;
    name: string;
    principalName: string;
    contactEmail: string;
    contactPhone: string;
}

export interface User {
    id: string;
    name: string;
    username?: string;
    password_hash?: string;
    role?: Role;
    schoolId?: string;
}

export type Teacher = User;

export interface Student {
    id: string;
    classId: string;
    name: string;
    rollNo: string;
    fatherName: string;
    village: string;
    photo?: string; // base64 string
    faceDescriptor?: number[];
    consentGiven: boolean;
    schoolId?: string;
}

export interface ClassSection {
    id: string;
    name: string;
    schoolId?: string;
    teacherId?: string;
}

export interface AttendanceRecord {
    id: string;
    studentId: string;
    date: string; // YYYY-MM-DD
    status: 'Present' | 'Absent';
    method: 'Manual' | 'FaceScan';
    confidence?: number;
}

export interface Holiday {
    id: string;
    date: string; // YYYY-MM-DD
    description: string;
    schoolId?: string;
}