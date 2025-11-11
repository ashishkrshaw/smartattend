import React from 'react';
import { Student, AttendanceRecord, Holiday } from '../../types';
import Card from '../ui/Card';
import PieChart from '../ui/PieChart';

interface InsightsProps {
    students: Student[];
    attendanceData: AttendanceRecord[];
    holidays: Holiday[];
    dateRange: { start: string, end: string };
    reportType: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

const AttendanceInsights: React.FC<InsightsProps> = ({ students, attendanceData, holidays, dateRange, reportType }) => {

    const getDatesInRange = (startDate: string, endDate: string) => {
        const dates: Date[] = [];
        let currentDate = new Date(startDate + 'T00:00:00Z');
        const lastDate = new Date(endDate + 'T00:00:00Z');
        while (currentDate <= lastDate) {
            dates.push(new Date(currentDate));
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
        return dates;
    };

    const dates = getDatesInRange(dateRange.start, dateRange.end);
    
    const workingDays = dates.filter(date => {
        const isSunday = date.getUTCDay() === 0;
        const isHoliday = holidays.some(h => h.date === date.toISOString().slice(0, 10));
        return !isSunday && !isHoliday;
    });

    const totalStudents = students.length;
    const totalWorkingDays = workingDays.length;
    const totalPossibleAttendances = totalStudents * totalWorkingDays;
    const totalPresent = attendanceData.filter(rec => rec.status === 'Present').length;
    const totalAbsent = totalPossibleAttendances - totalPresent;
    const attendancePercentage = totalPossibleAttendances > 0 ? (totalPresent / totalPossibleAttendances) * 100 : 0;
    
    const pieChartData = [
        { label: 'Present', value: totalPresent, color: '#22c55e' }, // green-500
        { label: 'Absent', value: totalAbsent, color: '#ef4444' } // red-500
    ];

    const getDailyTrendData = () => {
        return workingDays.map(date => {
            const dateStr = date.toISOString().slice(0, 10);
            const presentCount = attendanceData.filter(rec => rec.date === dateStr && rec.status === 'Present').length;
            return {
                label: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
                value: presentCount
            };
        });
    };
    const dailyTrendData = (reportType === 'weekly' || reportType === 'monthly') ? getDailyTrendData() : [];
    const maxDailyPresent = totalStudents;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard title="Total Students" value={totalStudents} />
                <StatCard title="Working Days" value={totalWorkingDays} />
                <StatCard title="Total Present" value={totalPresent} />
                <StatCard title="Total Absent" value={totalAbsent} />
            </div>

            <Card title="Overall Attendance">
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 p-4">
                     <PieChart data={pieChartData} size={180} />
                     <div className="text-center md:text-left">
                        <h3 className="text-4xl font-bold text-gray-800 dark:text-gray-100">{attendancePercentage.toFixed(1)}%</h3>
                        <p className="text-gray-500 dark:text-gray-400">Attendance Rate</p>
                    </div>
                </div>
            </Card>
            
            {(reportType === 'weekly' || reportType === 'monthly') && dailyTrendData.length > 0 && (
                <Card title="Daily Attendance Trend">
                    <div className="p-4">
                        <div className="flex justify-between items-end h-48 space-x-2">
                             {dailyTrendData.map(day => (
                                 <div key={day.label} className="flex-1 flex flex-col items-center justify-end">
                                     <div 
                                         className="w-full bg-primary-500 hover:bg-primary-600 rounded-t-md transition-all"
                                         style={{ height: `${maxDailyPresent > 0 ? (day.value / maxDailyPresent) * 100 : 0}%` }}
                                         title={`${day.value} Present`}
                                     >
                                        <div className="text-xs text-white text-center pt-1 font-bold">{day.value}</div>
                                     </div>
                                     <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{day.label.split(' ')[1]}</span>
                                 </div>
                             ))}
                        </div>
                         <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
                             Attendance count per day (Max: {maxDailyPresent})
                         </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

const StatCard: React.FC<{ title: string, value: string | number }> = ({ title, value }) => (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-center shadow-sm border border-gray-200 dark:border-gray-700">
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">{value}</p>
    </div>
);


export default AttendanceInsights;