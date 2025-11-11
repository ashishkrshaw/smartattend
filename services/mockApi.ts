import { User, ClassSection, Student, Holiday, AttendanceRecord, School, Role } from '../types';

const MOCK_DB_KEY = 'smartAttendanceDB_v3_teacher';

interface MockDB {
    schools: School[];
    users: User[];
    classes: ClassSection[];
    students: Student[];
    holidays: Holiday[];
    attendance: AttendanceRecord[];
}

const getDB = (): MockDB => {
    const db = localStorage.getItem(MOCK_DB_KEY);
    if (db) {
        try {
            const parsed = JSON.parse(db);
            return {
                schools: parsed.schools || [],
                users: parsed.users || [],
                classes: parsed.classes || [],
                students: parsed.students || [],
                holidays: parsed.holidays || [],
                attendance: parsed.attendance || []
            };
        } catch (e) {
            console.error("Could not parse DB from localStorage, resetting.", e);
        }
    }
    return { schools: [], users: [], classes: [], students: [], holidays: [], attendance: [] };
};

const saveDB = (db: MockDB) => {
    localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
};

const generateUniqueUsername = (fullName: string, existingUsers: User[]): string => {
    const baseName = fullName.toLowerCase().replace(/\s/g, '').slice(0, 4).padEnd(4, 'x');
    const existingUsernames = new Set(existingUsers.map(u => u.username).filter(Boolean));
    
    let username = '';
    let attempts = 0;
    do {
        const randomDigits = Math.floor(10 + Math.random() * 90); // 10-99
        username = `${baseName}${randomDigits}`;
        attempts++;
    } while (existingUsernames.has(username) && attempts < 100);

    // Fallback for extremely rare collision case
    if (existingUsernames.has(username)) {
        username = `${baseName}${Date.now() % 1000}`;
    }

    return username;
};


export const isDbInitialized = async (): Promise<boolean> => {
    return localStorage.getItem(MOCK_DB_KEY) !== null;
};

export const setupApp = async (teacherName: string, password_hash: string): Promise<User> => {
    const newDb: MockDB = { schools: [], users: [], classes: [], students: [], holidays: [], attendance: [] };
    
    const school: School = {
        id: 'school-1',
        name: 'My School',
        principalName: 'Admin',
        contactEmail: 'admin@school.com',
        contactPhone: '123-456-7890',
    };
    newDb.schools.push(school);

    const username = generateUniqueUsername(teacherName, newDb.users);
    
    const teacher: User = {
        id: `teacher-1`,
        name: teacherName,
        username: username,
        password_hash,
        role: Role.Teacher,
        schoolId: school.id,
    };
    newDb.users.push(teacher);

    const classSection: ClassSection = {
        id: `class-1`,
        name: `My Class`,
        schoolId: school.id,
        teacherId: teacher.id,
    };
    newDb.classes.push(classSection);
    
    saveDB(newDb);
    return teacher;
};


// --- User Management ---
export const loginUser = async (username: string, password_hash: string): Promise<User | null> => {
    const db = getDB();
    const user = db.users.find(u => u.username === username); // Allow any role to login
    if (user && user.password_hash === password_hash) {
        return user;
    }
    return null;
}

export const principalSignUp = async (data: { 
    name: string, 
    principalName: string, 
    contactEmail: string, 
    contactPhone: string, 
    password_hash: string 
}): Promise<{ school: School, principal: User }> => {
    const db = getDB();

    const newSchool: School = {
        id: `school-${Date.now()}`,
        name: data.name,
        principalName: data.principalName,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone
    };
    db.schools.push(newSchool);

    const username = generateUniqueUsername(data.principalName, db.users);

    const newPrincipal: User = {
        id: `user-${Date.now()}`,
        name: data.principalName,
        username: username,
        password_hash: data.password_hash,
        role: Role.Principal,
        schoolId: newSchool.id
    };
    db.users.push(newPrincipal);
    
    saveDB(db);
    return { school: newSchool, principal: newPrincipal };
};

export const createTeacher = async (data: { name: string, password_hash: string }, principal: User): Promise<User> => {
    const db = getDB();
    if (!principal.schoolId) {
        throw new Error("Principal is not associated with a school.");
    }
    
    const username = generateUniqueUsername(data.name, db.users);

    const newTeacher: User = {
        id: `teacher-${Date.now()}`,
        name: data.name,
        username: username,
        password_hash: data.password_hash,
        role: Role.Teacher,
        schoolId: principal.schoolId
    };
    db.users.push(newTeacher);
    saveDB(db);
    return newTeacher;
};

export const getTeachers = async (schoolId?: string): Promise<User[]> => {
    const db = getDB();
    const targetSchoolId = schoolId || db.schools[0]?.id;
    if (!targetSchoolId) return [];
    return db.users.filter(u => u.schoolId === targetSchoolId && u.role === Role.Teacher);
};

export const updateTeacherProfile = async (teacherId: string, data: { name: string }): Promise<User> => {
    const db = getDB();
    const userIndex = db.users.findIndex(u => u.id === teacherId);
    if (userIndex === -1) throw new Error("Teacher not found");
    
    db.users[userIndex] = { ...db.users[userIndex], ...data };
    saveDB(db);
    return db.users[userIndex];
};

export const updateTeacherCredentials = async (teacherId: string, data: { current_password_hash: string, new_username: string, new_password_hash: string }): Promise<User> => {
    const db = getDB();
    const userIndex = db.users.findIndex(u => u.id === teacherId);
    if (userIndex === -1) throw new Error("Teacher not found");

    const user = db.users[userIndex];

    if (user.password_hash !== data.current_password_hash) {
        throw new Error("Incorrect current password.");
    }
    
    if (data.new_username && data.new_username !== user.username) {
        if (db.users.some(u => u.username === data.new_username && u.id !== teacherId)) {
            throw new Error("New username is already taken.");
        }
        user.username = data.new_username;
    }

    if (data.new_password_hash) {
        user.password_hash = data.new_password_hash;
    }
    
    db.users[userIndex] = user;
    saveDB(db);
    return user;
};

// --- Class Management ---
export const getAssignedClass = async (teacherId: string): Promise<ClassSection | null> => {
    const db = getDB();
    return db.classes.find(c => c.teacherId === teacherId) || null;
};

export const getClassesBySchool = async (schoolId?: string): Promise<ClassSection[]> => {
    const db = getDB();
    const targetSchoolId = schoolId || db.schools[0]?.id;
    if (!targetSchoolId) return [];
    return db.classes.filter(c => c.schoolId === targetSchoolId);
};

export const getAllClasses = async (): Promise<ClassSection[]> => {
    const db = getDB();
    return db.classes;
};

export const createClass = async (data: { name: string, schoolId?: string }): Promise<ClassSection> => {
    const db = getDB();
    const schoolId = data.schoolId || db.schools[0]?.id;
    if (!schoolId) throw new Error("Could not determine school ID.");

    if (db.classes.some(c => c.name.toLowerCase() === data.name.toLowerCase() && c.schoolId === schoolId)) {
        throw new Error("A class with this name already exists in the school.");
    }

    const newClass: ClassSection = {
        id: `class-${Date.now()}`,
        name: data.name,
        schoolId: schoolId,
    };
    db.classes.push(newClass);
    saveDB(db);
    return newClass;
};

export const deleteClass = async (classId: string): Promise<void> => {
    const db = getDB();
    // Also delete students in that class
    db.students = db.students.filter(s => s.classId !== classId);
    db.classes = db.classes.filter(c => c.id !== classId);
    saveDB(db);
};


// --- Student Management ---
export const addStudent = async (data: Omit<Student, 'id'>): Promise<Student> => {
    const db = getDB();
    const newStudent: Student = { id: `student-${Date.now()}`, ...data };
    db.students.push(newStudent);
    saveDB(db);
    return newStudent;
};

export const getStudentsByClass = async (classId: string): Promise<Student[]> => {
    const db = getDB();
    return db.students.filter(s => s.classId === classId);
};

export const updateStudentDetails = async (studentId: string, data: Partial<Student>): Promise<Student> => {
    const db = getDB();
    const studentIndex = db.students.findIndex(s => s.id === studentId);
    if (studentIndex === -1) throw new Error("Student not found");
    db.students[studentIndex] = { ...db.students[studentIndex], ...data };
    saveDB(db);
    return db.students[studentIndex];
};

// --- Holiday Management ---
export const setHoliday = async (data: Omit<Holiday, 'id'>): Promise<Holiday> => {
    const db = getDB();
    const schoolId = data.schoolId || db.schools[0]?.id;
    if (!schoolId) throw new Error("Could not determine school ID.");

    const existing = db.holidays.find(h => h.date === data.date && h.schoolId === schoolId);
    if (existing) {
        existing.description = data.description;
        saveDB(db);
        return existing;
    }
    const newHoliday: Holiday = { id: `holiday-${Date.now()}`, schoolId, ...data };
    db.holidays.push(newHoliday);
    saveDB(db);
    return newHoliday;
};

export const removeHoliday = async (date: string, schoolId?: string): Promise<void> => {
    const db = getDB();
    const targetSchoolId = schoolId || db.schools[0]?.id;
    db.holidays = db.holidays.filter(h => !(h.date === date && h.schoolId === targetSchoolId));
    saveDB(db);
};

export const getHolidays = async (schoolId?: string): Promise<Holiday[]> => {
    const db = getDB();
    const targetSchoolId = schoolId || db.schools[0]?.id;
    if (!targetSchoolId) return [];
    return db.holidays.filter(h => h.schoolId === targetSchoolId);
};

// --- Attendance ---
export const saveAttendance = async (records: Omit<AttendanceRecord, 'id'>[]): Promise<void> => {
    const db = getDB();
    records.forEach(record => {
        const newRecord: AttendanceRecord = { id: `att-${Date.now()}-${Math.random()}`, ...record };
        db.attendance = db.attendance.filter(a => !(a.studentId === newRecord.studentId && a.date === newRecord.date));
        db.attendance.push(newRecord);
    });
    saveDB(db);
};

export const getAttendance = async (filters: { classId?: string; studentId?: string; date?: string; startDate?: string; endDate?: string }): Promise<AttendanceRecord[]> => {
    const db = getDB();
    let results = db.attendance;

    if (filters.classId) {
        const studentIdsInClass = db.students.filter(s => s.classId === filters.classId).map(s => s.id);
        results = results.filter(a => studentIdsInClass.includes(a.studentId));
    }
    if (filters.studentId) {
        results = results.filter(a => a.studentId === filters.studentId);
    }
    if (filters.date) {
        results = results.filter(a => a.date === filters.date);
    }
    if (filters.startDate && filters.endDate) {
        results = results.filter(a => a.date >= filters.startDate! && a.date <= filters.endDate!);
    }

    return results;
};