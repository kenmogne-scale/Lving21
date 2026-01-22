import { useState } from 'react';
import { Layout } from './components/Layout';
import { DashboardView } from './components/views/DashboardView';
import { BookingsView } from './components/views/BookingsView';
import { CalendarView } from './components/views/CalendarView';
import { CustomersView } from './components/views/CustomersView';
import { InvoicesView } from './components/views/InvoicesView';
import { PortfolioView } from './components/views/PortfolioView';
import { AdminSettingsView } from './components/views/AdminSettingsView';
import { Location, Booking, CompanySettings, Invoice, Customer } from './types';
import { mockLocations, mockCustomers } from './data/mockData';
import { createInvoiceFromBooking } from './utils/invoiceUtils';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'calendar' | 'customers' | 'invoices' | 'portfolio' | 'admin'>('dashboard');
  const [locations, setLocations] = useState<Location[]>(mockLocations);
  const [bookings, setBookings] = useState<Booking[]>([]); // Start empty - no mock bookings
  const [customers, setCustomers] = useState<Customer[]>(mockCustomers);
  const [invoices, setInvoices] = useState<Invoice[]>([]); // Start empty - no mock invoices

  // Default Company Settings
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    name: 'Living 21 GmbH',
    address: 'Rotberger Str. 3b',
    zipCity: '12529 Schönefeld',
    phone: '+49 33793 418021',
    email: 'buchung@living-21.com',
    website: 'living-21.com',
    ceo: 'Max Mustermann',
    hrb: 'HRB 12345',
    court: 'Amtsgericht Berlin',
    vatId: 'DE123456789',
    taxId: '12/345/67890',
    bankName: 'Berliner Volksbank',
    iban: 'DE00 1234 5678 9000 0000 00',
    bic: 'GENODEF1BVB'
  });

  // ============================================
  // INTELLIGENT DATA LINKING HANDLERS
  // ============================================

  /**
   * Creates a booking AND automatically generates a draft invoice
   */
  const handleBookingCreated = (booking: Booking) => {
    // Find the customer
    const customer = customers.find(c =>
      c.id === booking.customerId ||
      c.customerNumber === booking.customerNumber ||
      c.company === booking.customerName ||
      c.name === booking.customerName
    );

    // Create invoice from booking
    const invoice = createInvoiceFromBooking(booking, customer, locations, 'draft');

    // Link booking to invoice
    const linkedBooking: Booking = {
      ...booking,
      invoiceId: invoice.id,
      customerId: customer?.id
    };

    // Update both states
    setBookings(prev => [...prev, linkedBooking]);
    setInvoices(prev => [...prev, invoice]);
  };

  /**
   * Updates booking status and syncs with invoice
   */
  const handleBookingStatusChange = (bookingId: string, status: 'reserved' | 'confirmed' | 'cancelled') => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        return { ...b, status };
      }
      return b;
    }));

    // Sync invoice status
    const booking = bookings.find(b => b.id === bookingId);
    if (booking?.invoiceId) {
      setInvoices(prev => prev.map(inv => {
        if (inv.id === booking.invoiceId) {
          // If booking cancelled, cancel invoice
          if (status === 'cancelled') {
            return { ...inv, status: 'cancelled' };
          }
          // If booking confirmed, set invoice to sent
          if (status === 'confirmed' && inv.status === 'draft') {
            return { ...inv, status: 'sent' };
          }
        }
        return inv;
      }));
    }
  };

  /**
   * Cancels a booking and its linked invoice
   */
  const handleCancelBooking = (bookingId: string) => {
    if (window.confirm('Möchten Sie diese Buchung wirklich stornieren? Die zugehörige Rechnung wird ebenfalls storniert.')) {
      handleBookingStatusChange(bookingId, 'cancelled');
    }
  };

  /**
   * Updates an invoice (e.g., mark as paid)
   */
  const handleUpdateInvoice = (updatedInvoice: Invoice) => {
    setInvoices(prev => prev.map(inv =>
      inv.id === updatedInvoice.id ? updatedInvoice : inv
    ));

    // If invoice marked as paid, update linked booking
    if (updatedInvoice.status === 'paid' && updatedInvoice.bookingId) {
      setBookings(prev => prev.map(b => {
        if (b.id === updatedInvoice.bookingId && b.status === 'reserved') {
          return { ...b, status: 'confirmed' };
        }
        return b;
      }));
    }
  };

  /**
   * Saves or updates a customer
   */
  const handleSaveCustomer = (updatedCustomer: Customer) => {
    setCustomers(prev => {
      const exists = prev.find(c => c.id === updatedCustomer.id);
      if (exists) {
        return prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c);
      }
      return [...prev, updatedCustomer];
    });
  };

  /**
   * Deletes a customer
   */
  const handleDeleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
  };

  /**
   * Updates locations
   */
  const handleUpdateLocations = (updatedLocations: Location[]) => {
    setLocations(updatedLocations);
  };

  // ============================================
  // RENDER
  // ============================================

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            locations={locations}
            bookings={bookings.filter(b => b.status !== 'cancelled')}
            invoices={invoices}
          />
        );
      case 'bookings':
        return (
          <BookingsView
            locations={locations}
            bookings={bookings}
            customers={customers}
            companySettings={companySettings}
            onBookingCreated={handleBookingCreated}
            onBookingStatusChange={handleBookingStatusChange}
            onCancelBooking={handleCancelBooking}
            onSaveCustomer={handleSaveCustomer}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            locations={locations}
            bookings={bookings}
            customers={customers}
            onBookingCreated={handleBookingCreated}
          />
        );
      case 'customers':
        return (
          <CustomersView
            bookings={bookings}
            customers={customers}
            locations={locations}
            onSaveCustomer={handleSaveCustomer}
            onDeleteCustomer={handleDeleteCustomer}
            onBookingStatusChange={handleBookingStatusChange}
            onCancelBooking={handleCancelBooking}
          />
        );
      case 'invoices':
        return (
          <InvoicesView
            invoices={invoices}
            bookings={bookings}
            onUpdateInvoice={handleUpdateInvoice}
          />
        );
      case 'portfolio':
        return (
          <PortfolioView
            locations={locations}
            bookings={bookings}
            onUpdateLocations={handleUpdateLocations}
          />
        );
      case 'admin':
        return <AdminSettingsView settings={companySettings} onSave={setCompanySettings} />;
      default:
        return null;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;
