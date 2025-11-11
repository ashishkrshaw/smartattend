import React, { useState, useEffect, useCallback } from 'react';
import Calendar from 'react-calendar';
import * as api from '../../services/mockApi';
import { Holiday } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';

const HolidayCalendar: React.FC = () => {
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    const fetchHolidays = useCallback(async () => {
        const data = await api.getHolidays();
        setHolidays(data);
    }, []);

    useEffect(() => {
        fetchHolidays();
    }, [fetchHolidays]);

    const toYYYYMMDD = (date: Date) => date.toISOString().split('T')[0];

    const isHoliday = (date: Date): boolean => {
        return holidays.some(h => h.date === toYYYYMMDD(date));
    };

    const handleDateClick = (value: any) => {
        if (value instanceof Date) {
            setSelectedDate(value);
        }
    };

    const toggleHoliday = async () => {
        if (!selectedDate) return;
        const dateStr = toYYYYMMDD(selectedDate);
        if (isHoliday(selectedDate)) {
            await api.removeHoliday(dateStr);
        } else {
            const description = prompt("Enter a description for this holiday:", "Public Holiday");
            if (description) {
                await api.setHoliday({ date: dateStr, description });
            }
        }
        fetchHolidays();
    };

    const selectedHoliday = selectedDate ? holidays.find(h => h.date === toYYYYMMDD(selectedDate)) : null;

    return (
        <Card title="School Holidays">
            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-grow">
                    <Calendar
                        onChange={handleDateClick}
                        value={selectedDate}
                        tileClassName={({ date, view }) => view === 'month' && isHoliday(date) ? 'bg-red-200 dark:bg-red-900/50 rounded-full' : null}
                    />
                </div>
                <div className="md:w-1/3">
                    <h4 className="font-semibold text-lg mb-2 text-gray-800 dark:text-gray-200">Manage Holiday</h4>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Selected Date: {selectedDate ? selectedDate.toLocaleDateString() : 'None'}
                    </p>
                    {selectedHoliday && (
                        <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-md mb-4 border border-yellow-200 dark:border-yellow-900/50">
                            <p className="font-semibold text-yellow-800 dark:text-yellow-200">{selectedHoliday.description}</p>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300">This day is marked as a holiday.</p>
                        </div>
                    )}
                     <Button onClick={toggleHoliday} disabled={!selectedDate}>
                        {selectedDate && isHoliday(selectedDate) ? 'Remove Holiday' : 'Mark as Holiday'}
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default HolidayCalendar;