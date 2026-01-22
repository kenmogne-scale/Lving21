import React from 'react';
import { Location, Booking, Invoice } from '../../types';
import { Dashboard } from '../Dashboard';
import { CashflowAnalysis } from '../CashflowAnalysis';
import { DashboardStats } from '../DashboardStats';

interface DashboardViewProps {
    locations: Location[];
    bookings: Booking[];
    invoices?: Invoice[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({ locations, bookings }) => {
    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Übersicht</h2>

            {/* New KPI Cards */}
            <DashboardStats locations={locations} bookings={bookings} />

            <Dashboard
                locations={locations}
                bookings={bookings}
            />

            <div className="grid grid-cols-1 gap-6">
                <CashflowAnalysis bookings={bookings} locations={locations} />
            </div>
        </div>
    );
};
