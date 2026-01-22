import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, DollarSign, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { Booking, Location } from '../types';
import {
  calculateDailyCashflows,
  calculateCashflowSummary,
} from '../utils/cashflow';
import { startOfMonth, endOfMonth, addMonths, subMonths, format, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { de } from 'date-fns/locale';

interface CashflowAnalysisProps {
  bookings: Booking[];
  locations: Location[];
}

type ViewMode = 'daily' | 'monthly';

export const CashflowAnalysis: React.FC<CashflowAnalysisProps> = ({ bookings, locations }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('daily');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);


  // Erweitere den Zeitraum für bessere Visualisierung (3 Monate) für Daily View
  const viewStart = subMonths(monthStart, 1);
  const viewEnd = addMonths(monthEnd, 1);

  const dailyCashflows = useMemo(() => {
    return calculateDailyCashflows(bookings, viewStart, viewEnd);
  }, [bookings, viewStart, viewEnd]);

  const summary = useMemo(() => {
    return calculateCashflowSummary(bookings, monthStart, monthEnd);
  }, [bookings, monthStart, monthEnd]);

  // Filtere nur den aktuellen Monat für die tägliche Ansicht
  const currentMonthCashflows = useMemo(() => {
    return dailyCashflows.filter(cf =>
      cf.date >= monthStart && cf.date <= monthEnd
    );
  }, [dailyCashflows, monthStart, monthEnd]);

  const maxRevenue = Math.max(...dailyCashflows.map(cf => cf.revenue), 1);

  // --- LOCATION BASED MONTHLY LOGIC ---
  const locationStats = useMemo(() => {
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const numDaysInMonth = daysInMonth.length;

    return locations.map(location => {
      // Filter bookings for this location and current month
      const locationBookings = bookings.filter(b => {
        // Check explicit location match or property->location match
        const matchesLocation = b.locationId === location.id; // Simplify first, assume locationId is populated

        if (!matchesLocation) return false;

        const bookingStart = b.startDate;
        const bookingEnd = b.endDate;
        return (
          (bookingStart <= monthEnd) && (bookingEnd >= monthStart)
        );
      });

      let totalRevenue = 0;
      let totalBedNights = 0;
      let totalBedNightPriceSum = 0; // for weighted average price

      locationBookings.forEach(booking => {
        // Calculate overlap days
        const start = booking.startDate > monthStart ? booking.startDate : monthStart;
        const end = booking.endDate < monthEnd ? booking.endDate : monthEnd;

        if (start <= end) {
          // Let's use exact day intersection for precision consistent with daily view

          daysInMonth.forEach(day => {
            if (isWithinInterval(day, { start: booking.startDate, end: booking.endDate })) {
              const dailyRev = booking.bedCount * booking.pricePerBedPerNight;
              totalRevenue += dailyRev;
              totalBedNights += booking.bedCount;
              totalBedNightPriceSum += dailyRev; // this is basically revenue, so avg price = totalRevenue / totalBedNights
            }
          });
        }
      });

      const averageBedsOccupied = numDaysInMonth > 0 ? totalBedNights / numDaysInMonth : 0;
      const averagePricePerBed = totalBedNights > 0 ? totalBedNightPriceSum / totalBedNights : 0;

      return {
        location,
        totalRevenue,
        averageBedsOccupied,
        averagePricePerBed,
        totalBedNights
      };
    }).sort((a, b) => b.totalRevenue - a.totalRevenue); // Sort by highest revenue
  }, [bookings, locations, monthStart, monthEnd]);




  const getBarColor = (revenue: number): string => {
    if (revenue === 0) return 'bg-gray-100';
    const percentage = (revenue / maxRevenue) * 100;
    if (percentage < 25) return 'bg-blue-200';
    if (percentage < 50) return 'bg-blue-400';
    if (percentage < 75) return 'bg-blue-600';
    return 'bg-blue-800';
  };

  const formatCurrency = (amount: number): string => {
    return amount.toLocaleString('de-DE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Cashflow-Analyse</CardTitle>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="rounded-md p-1 hover:bg-gray-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="min-w-[200px] text-center font-semibold">
              {format(currentMonth, 'MMMM yyyy', { locale: de })}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="rounded-md p-1 hover:bg-gray-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setViewMode('daily')}
            className={`px-3 py-1 rounded text-sm font-medium ${viewMode === 'daily'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Täglich
          </button>
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-3 py-1 rounded text-sm font-medium ${viewMode === 'monthly'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Standorte (Monat)
          </button>
        </div>
      </CardHeader>
      <CardContent>
        {/* KPI-Karten */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Gesamteinnahmen</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.total)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Ø Tageseinnahmen</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.average)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Minimum</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.min)}</p>
                </div>
                <TrendingDown className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Maximum</p>
                  <p className="text-2xl font-bold">{formatCurrency(summary.max)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Visualisierung */}
        {viewMode === 'daily' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Tägliche Einnahmen</h3>
            <div className="overflow-x-auto">
              <div className="flex items-end gap-1 h-64 min-w-full">
                {currentMonthCashflows.map((cf, index) => (
                  <div
                    key={index}
                    className="flex-1 flex flex-col items-center group relative"
                    title={`${format(cf.date, 'dd.MM.yyyy')}: ${formatCurrency(cf.revenue)}`}
                  >
                    <div
                      className={`w-full rounded-t transition-all hover:opacity-80 ${getBarColor(
                        cf.revenue
                      )}`}
                      style={{
                        height: `${Math.max(5, (cf.revenue / maxRevenue) * 100)}%`,
                        minHeight: cf.revenue > 0 ? '4px' : '0',
                      }}
                    />
                    <span className="text-[9px] text-gray-600 mt-1 transform -rotate-45 origin-top-left whitespace-nowrap">
                      {format(cf.date, 'dd')}
                    </span>
                    {cf.revenue > 0 && (
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded px-2 py-1 z-10 whitespace-nowrap">
                        {formatCurrency(cf.revenue)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {viewMode === 'monthly' && (() => {
          // Calculate totals for the footer
          const totalRevenue = locationStats.reduce((sum, stat) => sum + stat.totalRevenue, 0);
          const totalBedNights = locationStats.reduce((sum, stat) => sum + stat.totalBedNights, 0);

          // Average Beds Occupied across all locations = sum of all bed nights / days in month
          // Note: stat.averageBedsOccupied = stat.totalBedNights / daysInMonth
          // So sum(averageBedsOccupied) is correct for the total average occupancy
          const totalAvgBedsOccupied = locationStats.reduce((sum, stat) => sum + stat.averageBedsOccupied, 0);

          // Weighted Average Price for the total = Total Revenue / Total Bed Nights
          const totalAvgPrice = totalBedNights > 0 ? totalRevenue / totalBedNights : 0;

          return (
            <div>
              <h3 className="text-lg font-semibold mb-4">
                Einnahmen nach Standorten ({format(currentMonth, 'MMMM yyyy', { locale: de })})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-700 font-semibold border-b border-gray-200">
                    <tr>
                      <th className="p-3 rounded-tl-lg">Standort</th>
                      <th className="p-3 text-right">Ges. Betten<br /><span className="text-xs font-normal text-gray-500">(Nächte)</span></th>
                      <th className="p-3 text-right">Ø Betten/Tag</th>
                      <th className="p-3 text-right">Ø Preis/Bett</th>
                      <th className="p-3 text-right rounded-tr-lg">Umsatz</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {locationStats.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-500">
                          Keine Standorte gefunden.
                        </td>
                      </tr>
                    ) : (
                      locationStats.map((stat) => (
                        <tr key={stat.location.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 font-medium text-gray-900 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {stat.location.name}
                          </td>
                          <td className="p-3 text-right font-medium text-gray-600">
                            {stat.totalBedNights}
                          </td>
                          <td className="p-3 text-right font-medium text-gray-600">
                            {stat.averageBedsOccupied.toFixed(1)}
                          </td>
                          <td className="p-3 text-right font-medium text-gray-600">
                            {formatCurrency(stat.averagePricePerBed)}
                          </td>
                          <td className="p-3 text-right font-bold text-blue-700">
                            {formatCurrency(stat.totalRevenue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-gray-100 font-bold border-t-2 border-gray-200">
                    <tr>
                      <td className="p-3">Gesamt</td>
                      <td className="p-3 text-right">{totalBedNights}</td>
                      <td className="p-3 text-right">{totalAvgBedsOccupied.toFixed(1)}</td>
                      <td className="p-3 text-right">{formatCurrency(totalAvgPrice)}</td>
                      <td className="p-3 text-right text-blue-800">{formatCurrency(totalRevenue)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Tabelle mit Details */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Buchungsdetails</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left p-3 rounded-tl-lg">Kunde</th>
                  <th className="text-left p-3">Standort / Projekt</th>
                  <th className="text-right p-3">Betten</th>
                  <th className="text-right p-3">Preis/Bett</th>
                  <th className="text-right p-3">Zeitraum</th>
                  <th className="text-right p-3 rounded-tr-lg">Gesamt</th>
                </tr>
              </thead>
              <tbody>
                {bookings
                  .filter(b => {
                    const bookingEnd = b.endDate;
                    const bookingStart = b.startDate;
                    return (
                      (bookingStart >= monthStart && bookingStart <= monthEnd) ||
                      (bookingEnd >= monthStart && bookingEnd <= monthEnd) ||
                      (bookingStart <= monthStart && bookingEnd >= monthEnd)
                    );
                  })
                  .map(booking => {
                    const nights = Math.ceil(
                      (booking.endDate.getTime() - booking.startDate.getTime()) /
                      (1000 * 60 * 60 * 24)
                    );
                    const total = booking.bedCount * booking.pricePerBedPerNight * nights;

                    const locationName = locations.find(l => l.id === booking.locationId)?.name || 'Unbekannt';

                    return (
                      <tr key={booking.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="p-3 font-medium text-gray-900">{booking.customerName}</td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-800">{locationName}</span>
                            <span className="text-xs text-gray-500">{booking.projectName}</span>
                          </div>
                        </td>
                        <td className="text-right p-3">{booking.bedCount}</td>
                        <td className="text-right p-3">
                          {formatCurrency(booking.pricePerBedPerNight)}
                        </td>
                        <td className="text-right p-3">
                          {format(booking.startDate, 'dd.MM.yyyy')} -{' '}
                          {format(booking.endDate, 'dd.MM.yyyy')}
                          <span className="text-gray-400 ml-1">({nights} T.)</span>
                        </td>
                        <td className="text-right p-3 font-semibold text-blue-700">
                          {formatCurrency(total)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

