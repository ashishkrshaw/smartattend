import React from 'react';

interface PieChartData {
    label: string;
    value: number;
    color: string;
}

interface PieChartProps {
    data: PieChartData[];
    size?: number;
}

const PieChart: React.FC<PieChartProps> = ({ data, size = 150 }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) {
        return (
            <div className="flex flex-col items-center justify-center" style={{ width: size, height: size }}>
                 <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <circle
                        cx={size / 2}
                        cy={size / 2}
                        r={size / 2 - 10}
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="20"
                    />
                </svg>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">No data available</p>
            </div>
        );
    }

    let accumulated = 0;
    const radius = size / 2 - 10;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="flex items-center space-x-6">
            <div className="relative" style={{ width: size, height: size }}>
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                    {data.map((item, index) => {
                        const dasharray = (item.value / total) * circumference;
                        const dashoffset = (accumulated / total) * circumference;
                        accumulated += item.value;
                        return (
                            <circle
                                key={index}
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={item.color}
                                strokeWidth="20"
                                strokeDasharray={`${dasharray} ${circumference}`}
                                strokeDashoffset={-dashoffset}
                                className="transition-all duration-500 ease-out"
                            />
                        );
                    })}
                </svg>
            </div>
            <div className="space-y-2">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center text-sm">
                        <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: item.color }}></span>
                        <span className="text-gray-700 dark:text-gray-300 mr-2">{item.label}:</span>
                        <span className="font-semibold text-gray-800 dark:text-gray-100">{item.value} ({total > 0 ? (item.value / total * 100).toFixed(0) : 0}%)</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PieChart;