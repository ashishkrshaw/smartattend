
import React, { useState } from 'react';
import Header from '../layout/Header';
import ManageTeachers from './ManageTeachers';
import ManageClasses from '../teacher/ManageClasses'; // Note: This component is repurposed for the principal
import HolidayCalendar from './HolidayCalendar';
import Reports from '../shared/Reports';
import { useAuth } from '../../hooks/useAuth';

type PrincipalView = 'dashboard' | 'teachers' | 'classes' | 'holidays' | 'reports';

const PrincipalDashboard: React.FC = () => {
    const [view, setView] = useState<PrincipalView>('dashboard');
    const { user } = useAuth();
    if(!user) return null;

    const renderView = () => {
        switch (view) {
            case 'teachers':
                return <ManageTeachers />;
            case 'classes':
                return <ManageClasses />;
            case 'holidays':
                return <HolidayCalendar />;
            case 'reports':
                return <Reports />;
            case 'dashboard':
            default:
                return <DashboardHome setView={setView} />;
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Header />
            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {view !== 'dashboard' && (
                    <button onClick={() => setView('dashboard')} className="mb-4 text-sm font-medium text-primary-600 hover:text-primary-800">
                        &larr; Back to Dashboard
                    </button>
                )}
                {renderView()}
            </main>
        </div>
    );
};

const DashboardHome: React.FC<{setView: (view: PrincipalView) => void}> = ({setView}) => {
    const { user } = useAuth();
    return (
        <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Welcome, {user?.name}!</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DashboardCard title="Manage Teachers" description="Add, view, and manage teacher accounts for your school." onClick={() => setView('teachers')} />
                <DashboardCard title="Manage Classes" description="Create classes and assign them to teachers." onClick={() => setView('classes')} />
                <DashboardCard title="Set Holidays" description="Mark school-wide holidays on the calendar. Attendance cannot be taken on these days." onClick={() => setView('holidays')} />
                <DashboardCard title="View Reports" description="Generate and export attendance reports for classes and students." onClick={() => setView('reports')} />
            </div>
        </div>
    );
};

const DashboardCard: React.FC<{title: string; description: string; onClick: () => void}> = ({title, description, onClick}) => (
    <div onClick={onClick} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer">
        <h3 className="text-lg font-semibold text-primary-700">{title}</h3>
        <p className="mt-2 text-gray-600">{description}</p>
    </div>
);

export default PrincipalDashboard;
