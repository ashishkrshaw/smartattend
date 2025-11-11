

import React, { useState, useEffect, useCallback } from 'react';
import Calendar from 'react-calendar';
import { useAuth } from '../../hooks/useAuth';
import * as api from '../../services/mockApi';
import { Holiday } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';

const HolidayCalendar: React.FC = () => {
    const { user } = useAuth();
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    const fetchHolidays = useCallback(async () => {
        if (user) {
            const data = await api.getHolidays(user.schoolId);
            setHolidays(data);
        }
    }, [user]);

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
        if (!selectedDate || !user) return;
        const dateStr = toYYYYMMDD(selectedDate);
        if (isHoliday(selectedDate)) {
            // FIX: Corrected argument order for removeHoliday
            await api.removeHoliday(dateStr, user.schoolId);
        } else {
            const description = prompt("Enter a description for this holiday:", "Public Holiday");
            if (description) {
                await api.setHoliday({ schoolId: user.schoolId, date: dateStr, description });
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
                        tileClassName={({ date, view }) => view === 'month' && isHoliday(date) ? 'bg-red-200 rounded-full' : null}
                    />
                </div>
                <div className="md:w-1/3">
                    <h4 className="font-semibold text-lg mb-2">Manage Holiday</h4>
                    <p className="text-gray-600 mb-4">
                        Selected Date: {selectedDate ? selectedDate.toLocaleDateString() : 'None'}
                    </p>
                    {selectedHoliday && (
                        <div className="bg-yellow-100 p-3 rounded-md mb-4">
                            <p className="font-semibold">{selectedHoliday.description}</p>
                            <p className="text-sm">This day is marked as a holiday.</p>
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