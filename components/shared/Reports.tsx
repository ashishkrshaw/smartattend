import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import * as api from '../../services/mockApi';
import { AttendanceRecord, ClassSection, Student, Holiday } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import AttendanceInsights from './AttendanceInsights';

type ReportType = 'daily' | 'weekly' | 'monthly' | 'yearly';
type ReportView = 'register' | 'insights';

// Helper to get week start (Monday) and end (Sunday) dates
const getWeekRange = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diffToMonday));
    const sunday = new Date(new Date(monday).setDate(monday.getDate() + 6));
    return {
        start: monday.toISOString().slice(0, 10),
        end: sunday.toISOString().slice(0, 10),
    };
};

const Reports: React.FC = () => {
    const { user } = useAuth();
    const [assignedClass, setAssignedClass] = useState<ClassSection | null>(null);
    const [classStudents, setClassStudents] = useState<Student[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    
    const [reportType, setReportType] = useState<ReportType>('daily');
    const [currentView, setCurrentView] = useState<ReportView>('register');
    const [filters, setFilters] = useState({ 
        date: new Date().toISOString().slice(0, 10),
        month: new Date().toISOString().slice(0, 7),
        year: new Date().getFullYear().toString(),
    });
    
    const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
    const [dateRange, setDateRange] = useState({ start: filters.date, end: filters.date });
    const [isLoading, setIsLoading] = useState(false);
    const [reportGenerated, setReportGenerated] = useState(false);

    useEffect(() => {
        const fetchInitialData = async () => {
            if (user) {
                setIsLoading(true);
                const classData = await api.getAssignedClass(user.id);
                setAssignedClass(classData);
                if (classData) {
                    const students = await api.getStudentsByClass(classData.id);
                    setClassStudents(students);
                }
                const holidaysData = await api.getHolidays();
                setHolidays(holidaysData);
                setIsLoading(false);
            }
        };
        fetchInitialData();
    }, [user]);

    const handleGenerateReport = useCallback(async () => {
        if (!assignedClass) return;
        setIsLoading(true);
        setReportGenerated(false);
        
        let startDate: string, endDate: string;

        switch(reportType) {
            case 'weekly':
                const weekRange = getWeekRange(new Date(filters.date));
                startDate = weekRange.start;
                endDate = weekRange.end;
                break;
            case 'monthly':
                startDate = `${filters.month}-01`;
                const [year, month] = filters.month.split('-').map(Number);
                const lastDay = new Date(year, month, 0).getDate();
                endDate = `${filters.month}-${String(lastDay).padStart(2, '0')}`;
                break;
            case 'yearly':
                startDate = `${filters.year}-01-01`;
                endDate = `${filters.year}-12-31`;
                break;
            case 'daily':
            default:
                 startDate = endDate = filters.date;
                 break;
        }

        setDateRange({ start: startDate, end: endDate });
        const data = await api.getAttendance({ startDate, endDate, classId: assignedClass.id });
        setAttendanceData(data);
        setIsLoading(false);
        setReportGenerated(true);

    }, [assignedClass, filters, reportType]);
    
    const exportData = (format: 'csv' | 'pdf') => {
        const { head, body } = generateExportData();
        
        if (format === 'csv') {
            let csvContent = "data:text/csv;charset=utf-8," + head.join(',') + '\n' 
                + body.map(row => row.join(',')).join('\n');
            const link = document.createElement("a");
            link.setAttribute("href", encodeURI(csvContent));
            link.setAttribute("download", `report_${reportType}_${filters.date}.csv`);
            link.click();
        } else { // pdf
            const doc = new jsPDF(reportType === 'monthly' || reportType === 'yearly' ? { orientation: 'landscape' } : { orientation: 'portrait' });
            const title = `Attendance Report: ${assignedClass?.name}`;
            const subtitle = `Period: ${dateRange.start} to ${dateRange.end}`;
            doc.text(title, 14, 15);
            doc.setFontSize(10);
            doc.text(subtitle, 14, 22);
             (doc as any).autoTable({
                head: [head],
                body,
                startY: 28,
                styles: { fontSize: reportType === 'monthly' || reportType === 'yearly' ? 6 : 8 },
                headStyles: { fillColor: [37, 99, 235] } // primary-600
            });
            doc.save(`report_${reportType}_${filters.date}.pdf`);
        }
    };

    const generateExportData = () => {
        switch(reportType) {
            case 'weekly': return generateWeeklyData(true);
            case 'monthly': return generateMonthlyData(true);
            case 'yearly': return generateYearlyData();
            case 'daily': 
            default: return generateDailyData();
        }
    };

    const generateDailyData = () => {
        const head = ['Student Name', 'Roll No', 'Status', 'Method'];
        const body = classStudents.map(student => {
            const record = attendanceData.find(rec => rec.studentId === student.id && rec.date === filters.date);
            return [student.name, student.rollNo, record?.status || 'Absent', record?.method || 'N/A'];
        });
        return { head, body };
    };
    
    const getDatesInRange = (startDate: string, endDate: string) => {
        const dates: Date[] = [];
        let currentDate = new Date(startDate + 'T00:00:00Z');
        const lastDate = new Date(endDate + 'T00:00:00Z');
        while (currentDate <= lastDate) {
            dates.push(new Date(currentDate));
            currentDate.setUTCDate(currentDate.getUTCDate() + 1);
        }
        return dates;
    }
    
    const generateWeeklyData = (forExport = false) => {
        const weekDates = getDatesInRange(dateRange.start, dateRange.end);
        
        const head = ['Student', 'Roll No', ...weekDates.map(d => d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }))];
        if (forExport) {
            head.push('Total Present', 'Percentage');
        }

        const body = classStudents.map(student => {
            const row: (string | number)[] = [student.name, student.rollNo];
            let presentCount = 0;
            let workingDays = 0;

            weekDates.forEach(date => {
                const dateStr = date.toISOString().slice(0, 10);
                const isSun = date.getUTCDay() === 0;
                const isHol = holidays.some(h => h.date === dateStr);

                if (isHol) {
                    row.push('H');
                } else if (isSun) {
                    row.push('S');
                } else {
                    workingDays++;
                    const record = attendanceData.find(rec => rec.studentId === student.id && rec.date === dateStr);
                    if(record?.status === 'Present') {
                        presentCount++;
                        row.push('P');
                    } else {
                        row.push('A');
                    }
                }
            });

            if (forExport) {
                row.push(presentCount);
                const percentage = workingDays > 0 ? `${((presentCount / workingDays) * 100).toFixed(0)}%` : 'N/A';
                row.push(percentage);
            }

            return row;
        });

        return { head, body, dates: weekDates.map(d => d.toISOString().slice(0, 10)) };
    };

    const generateMonthlyData = (forExport = false) => {
        const monthDates = getDatesInRange(dateRange.start, dateRange.end);
        // FIX: Convert date numbers to strings for type consistency. This was causing `head` to be `(string | number)[]`, which conflicts with components expecting `string[]`.
        const head = ['Student', 'Roll No', ...monthDates.map(d => String(d.getUTCDate()))];
        if (forExport) {
            head.push('Total Present', 'Percentage');
        }
        
        const body = classStudents.map(student => {
            const row: (string | number)[] = [student.name, student.rollNo];
            let presentCount = 0;
            let workingDays = 0;

            monthDates.forEach(date => {
                const dateStr = date.toISOString().slice(0, 10);
                const isSun = date.getUTCDay() === 0;
                const isHol = holidays.some(h => h.date === dateStr);

                if (isHol) {
                    row.push('H');
                } else if (isSun) {
                    row.push('S');
                } else {
                    workingDays++;
                    const record = attendanceData.find(rec => rec.studentId === student.id && rec.date === dateStr);
                     if(record?.status === 'Present') {
                        presentCount++;
                        row.push('P');
                    } else {
                        row.push('A');
                    }
                }
            });

            if (forExport) {
                row.push(presentCount);
                const percentage = workingDays > 0 ? `${((presentCount / workingDays) * 100).toFixed(0)}%` : 'N/A';
                row.push(percentage);
            }
            
            return row;
        });

        return { head, body, dates: monthDates.map(d => d.toISOString().slice(0, 10)) };
    };
    
    const generateYearlyData = () => {
        const head = ['Student', 'Roll No', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Total %'];
        const body = classStudents.map(student => {
            const row: (string | number)[] = [student.name, student.rollNo];
            let totalPresent = 0;
            let totalWorkingDays = 0;
            for(let month = 1; month <= 12; month++) {
                const monthStr = `${filters.year}-${String(month).padStart(2,'0')}`;
                const daysInMonth = new Date(parseInt(filters.year), month, 0).getDate();
                let presentCount = 0;
                let workingDays = 0;
                for(let day = 1; day <= daysInMonth; day++) {
                    const date = new Date(Date.UTC(parseInt(filters.year), month-1, day));
                    const dateStr = date.toISOString().slice(0,10);
                    if (date.getUTCDay() !== 0 && !holidays.some(h => h.date === dateStr)) { // Exclude sundays and holidays
                         workingDays++;
                         const record = attendanceData.find(rec => rec.studentId === student.id && rec.date === dateStr);
                         if(record?.status === 'Present') presentCount++;
                    }
                }
                row.push(workingDays > 0 ? `${((presentCount / workingDays) * 100).toFixed(0)}%` : 'N/A');
                totalPresent += presentCount;
                totalWorkingDays += workingDays;
            }
            row.push(totalWorkingDays > 0 ? `${((totalPresent / totalWorkingDays) * 100).toFixed(0)}%` : 'N/A');
            return row;
        });
        return { head, body };
    };

    const inputStyles = "mt-1 block w-full border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 focus:ring-primary-500 focus:border-primary-500";
    const labelStyles = "block text-sm font-medium text-gray-700 dark:text-gray-300";

    const renderFilters = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-4 border dark:border-gray-700 rounded-md items-end">
            <div>
                <label className={labelStyles}>Report Type</label>
                <select value={reportType} onChange={e => {setReportType(e.target.value as ReportType); setReportGenerated(false);}} className={inputStyles}>
                    <option value="daily">Daily List</option>
                    <option value="weekly">Weekly Register</option>
                    <option value="monthly">Monthly Register</option>
                    <option value="yearly">Yearly Summary</option>
                </select>
            </div>
            
            {reportType === 'daily' && <div><label className={labelStyles}>Date</label><input type="date" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})} className={inputStyles} /></div>}
            {reportType === 'weekly' && <div><label className={labelStyles}>Select any day of the week</label><input type="date" value={filters.date} onChange={e => setFilters({...filters, date: e.target.value})} className={inputStyles} /></div>}
            {reportType === 'monthly' && <div><label className={labelStyles}>Month</label><input type="month" value={filters.month} onChange={e => setFilters({...filters, month: e.target.value})} className={inputStyles} /></div>}
            {reportType === 'yearly' && <div><label className={labelStyles}>Year</label><input type="number" value={filters.year} onChange={e => setFilters({...filters, year: e.target.value})} className={inputStyles} placeholder="YYYY" /></div>}
            
            <div className="md:col-span-2">
                <Button onClick={handleGenerateReport} disabled={isLoading || !assignedClass} className="w-full">
                    {isLoading ? 'Generating...' : 'Generate Report'}
                </Button>
            </div>
        </div>
    );
    
    const renderReport = () => {
        if (isLoading) return <p className="text-center py-4">Loading report data...</p>;
        if (!reportGenerated) return <p className="text-center py-4 text-gray-500 dark:text-gray-400">Select filters and generate a report to view data.</p>;
        if (classStudents.length === 0) return <p className="text-center py-4 text-gray-500 dark:text-gray-400">No students in this class.</p>;

        const registerData = {
            daily: generateDailyData(),
            weekly: generateWeeklyData(),
            monthly: generateMonthlyData(),
            yearly: generateYearlyData(),
        }[reportType];

        return currentView === 'insights' ? (
             <AttendanceInsights students={classStudents} attendanceData={attendanceData} holidays={holidays} dateRange={dateRange} reportType={reportType}/>
        ) : (
            <>
                {reportType === 'daily' && <DailyListView data={registerData} />}
                {(reportType === 'weekly' || reportType === 'monthly') && <CommonRegisterView data={registerData} holidays={holidays} />}
                {reportType === 'yearly' && <YearlyListView data={registerData} />}
            </>
        );
    }

    return (
        <Card title={`Attendance Reports for ${assignedClass?.name || ''}`}>
            {renderFilters()}
            
            {reportGenerated && (
                <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-2">
                    <div className="p-1 bg-gray-200 dark:bg-gray-700 rounded-lg flex space-x-1">
                        <Button size="sm" variant={currentView === 'register' ? 'primary' : 'secondary'} onClick={() => setCurrentView('register')}>Register View</Button>
                        <Button size="sm" variant={currentView === 'insights' ? 'primary' : 'secondary'} onClick={() => setCurrentView('insights')}>Insights View</Button>
                    </div>
                    <div className="flex space-x-2">
                        <Button onClick={() => exportData('csv')} variant="secondary">Export CSV</Button>
                        <Button onClick={() => exportData('pdf')} variant="secondary">Export PDF</Button>
                    </div>
                </div>
            )}
            
            <div className="overflow-x-auto">{renderReport()}</div>
        </Card>
    );
};

const DailyListView = ({ data }: { data: { head: string[], body: (string|number)[][] }}) => (
    <table className="min-w-full bg-white dark:bg-gray-800">
        <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>{data.head.map(h => <th key={h} className="py-3 px-6 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.body.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-4 px-6 font-medium whitespace-nowrap">{row[0]}</td>
                    <td className="py-4 px-6">{row[1]}</td>
                    <td className="py-4 px-6">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${row[2] === 'Present' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>{row[2]}</span>
                    </td>
                    <td className="py-4 px-6">{row[3]}</td>
                </tr>
            ))}
        </tbody>
    </table>
);

const CommonRegisterView = ({ data, holidays }: { data: { head: (string|number)[], body: (string|number)[][], dates?: string[] }, holidays: Holiday[] }) => (
    <table className="min-w-full bg-white dark:bg-gray-800 border dark:border-gray-700 text-sm text-center">
        <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
                {data.head.map((h, i) => {
                    const dateStr = data.dates ? data.dates[i-2] : '';
                    const date = dateStr ? new Date(dateStr + 'T00:00:00Z') : null;
                    const isSun = date ? date.getUTCDay() === 0 : false;
                    const isHol = dateStr ? holidays.some(hol => hol.date === dateStr) : false;
                    const headerClass = isSun || isHol ? 'bg-red-100 dark:bg-red-900/40' : '';
                    
                    return (
                        <th key={`${h}-${i}`} className={`py-2 px-2 text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider ${i < 2 ? 'sticky z-10 left-0 bg-gray-50 dark:bg-gray-700 text-left' : ''} ${i === 0 ? 'w-40 md:w-48' : ''} ${i === 1 ? 'w-24 pl-4' : ''} ${headerClass}`}>
                            {i === 1 ? <div className='ml-2'>{h}</div> : h}
                        </th>
                    );
                })}
            </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.body.map((row, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    {row.map((cell, j) => (
                        <td key={`${cell}-${j}`} className={`py-2 px-2 whitespace-nowrap font-mono ${j < 2 ? 'sticky z-0 left-0 bg-white dark:bg-gray-800 text-left font-sans' : ''} ${j === 0 ? 'font-medium' : ''} ${j === 1 ? 'pl-4' : ''}`}>
                             <span className={cell === 'P' ? 'text-green-700 dark:text-green-400 font-bold' : cell === 'A' ? 'text-red-700 dark:text-red-400 font-bold' : cell === 'H' ? 'text-yellow-600 dark:text-yellow-400 font-bold' : cell === 'S' ? 'text-gray-400 dark:text-gray-500 font-bold' : ''}>{cell}</span>
                         </td>
                    ))}
                </tr>
            ))}
        </tbody>
    </table>
);

const YearlyListView = ({ data }: { data: { head: string[], body: (string|number)[][] }}) => (
    <CommonRegisterView data={data} holidays={[]} />
);

export default Reports;