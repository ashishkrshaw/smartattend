import React, { useState } from 'react';
import Header from '../layout/Header';
import ManageStudents from './ManageStudents';
import TakeAttendance from './TakeAttendance';
import Reports from '../shared/Reports';
import HolidayCalendar from './HolidayCalendar';
import { useAuth } from '../../hooks/useAuth';
import Settings from './Settings';

type TeacherView = 'dashboard' | 'students' | 'holidays' | 'attendance' | 'reports' | 'settings';

const TeacherDashboard: React.FC = () => {
    const [view, setView] = useState<TeacherView>('dashboard');
    const { user } = useAuth();
    if (!user) return null;

    const renderView = () => {
        switch (view) {
            case 'students':
                return <ManageStudents />;
            case 'holidays':
                return <HolidayCalendar />;
            case 'attendance':
                return <TakeAttendance />;
            case 'reports':
                return <Reports />;
            case 'settings':
                return <Settings />;
            case 'dashboard':
            default:
                return <DashboardHome setView={setView} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <Header />
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {view !== 'dashboard' && (
                    <button onClick={() => setView('dashboard')} className="mb-4 text-sm font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300">
                        &larr; Back to Dashboard
                    </button>
                )}
                {renderView()}
            </main>
        </div>
    );
};

const DashboardHome: React.FC<{ setView: (view: TeacherView) => void }> = ({ setView }) => {
    const { user } = useAuth();
    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Welcome, {user?.name}!</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <DashboardCard title="Take Attendance" description="Use face recognition to mark daily student attendance." onClick={() => setView('attendance')} />
                <DashboardCard title="Manage Students" description="Add, edit, and view students in your assigned class." onClick={() => setView('students')} />
                <DashboardCard title="Set Holidays" description="Mark school-wide holidays on the calendar." onClick={() => setView('holidays')} />
                <DashboardCard title="View Reports" description="Generate attendance reports for your class." onClick={() => setView('reports')} />
                <DashboardCard title="Settings" description="Update your profile and change your password." onClick={() => setView('settings')} />
            </div>
        </div>
    );
};

const DashboardCard: React.FC<{ title: string; description: string; onClick: () => void }> = ({ title, description, onClick }) => (
    <div onClick={onClick} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer border border-transparent dark:border-gray-700">
        <h3 className="text-lg font-semibold text-primary-700 dark:text-primary-400">{title}</h3>
        <p className="mt-2 text-gray-600 dark:text-gray-300">{description}</p>
    </div>
);

export default TeacherDashboard;