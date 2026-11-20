import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthScreen } from '../components/AuthScreen';
import {
  GuidelinesModal,
  AntibiogramView,
  PatientsView,
  PatientDashboardView,
  PatientPrescriptionsView,
  AdminDashboardView,
  AdminSettingsView,
} from '../components/PortalViews';
import {
  initialPatients,
  initialPrescriptions,
  initialAppointments,
  initialNotifications,
  initialReports,
} from '../lib/initialData';

describe('Frontend Component: AuthScreen & Role Selection', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders sign-in form with hospital email and password inputs', () => {
    render(<AuthScreen onAuthenticated={vi.fn()} darkMode={false} />);
    expect(screen.getByText('AntiSteward AMS')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/sarah.chen@hospital.org/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter your account password/i)).toBeInTheDocument();
  });

  it('provides target portal selection for Doctor, Patient, and Admin', () => {
    render(<AuthScreen onAuthenticated={vi.fn()} darkMode={false} />);
    expect(screen.getByText('SELECT TARGET PORTAL')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select doctor portal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select patient portal/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select admin portal/i })).toBeInTheDocument();
  });

  it('switches email placeholder when selecting Patient target portal', () => {
    render(<AuthScreen onAuthenticated={vi.fn()} darkMode={false} />);
    const patientPortalBtn = screen.getByRole('button', { name: /select patient portal/i });
    fireEvent.click(patientPortalBtn);

    expect(screen.getByPlaceholderText('sofia.martinez@patient.org')).toBeInTheDocument();
  });

  it('authenticates directly using Quick Demo Logins for Dr. Sarah Chen (Doctor)', () => {
    const handleAuth = vi.fn();
    render(<AuthScreen onAuthenticated={handleAuth} darkMode={false} />);

    const doctorDemoBtn = screen.getByRole('button', {
      name: /demo login as dr\. sarah chen/i,
    });
    fireEvent.click(doctorDemoBtn);

    expect(handleAuth).toHaveBeenCalledTimes(1);
    expect(handleAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'Dr. Sarah Chen',
        role: 'doctor',
      })
    );
  });

  it('authenticates directly using Quick Demo Logins for Sofia Martinez (Patient)', () => {
    const handleAuth = vi.fn();
    render(<AuthScreen onAuthenticated={handleAuth} darkMode={false} />);

    const patientDemoBtn = screen.getByRole('button', {
      name: /demo login as sofia martinez/i,
    });
    fireEvent.click(patientDemoBtn);

    expect(handleAuth).toHaveBeenCalledTimes(1);
    expect(handleAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'Sofia Martinez',
        role: 'patient',
        mrn: 'MRN-88412',
      })
    );
  });

  it('authenticates directly using Quick Demo Logins for Dr. Robert Thompson (Admin)', () => {
    const handleAuth = vi.fn();
    render(<AuthScreen onAuthenticated={handleAuth} darkMode={false} />);

    const adminDemoBtn = screen.getByRole('button', {
      name: /demo login as dr\. robert thompson/i,
    });
    fireEvent.click(adminDemoBtn);

    expect(handleAuth).toHaveBeenCalledTimes(1);
    expect(handleAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        full_name: 'Dr. Robert Thompson',
        role: 'admin',
      })
    );
  });

  it('switches between Sign In and Register tabs', () => {
    render(<AuthScreen onAuthenticated={vi.fn()} darkMode={false} />);
    const registerTab = screen.getByRole('button', { name: /register account/i });
    fireEvent.click(registerTab);

    expect(screen.getByText(/full name/i)).toBeInTheDocument();
    expect(screen.getByText(/portal role/i)).toBeInTheDocument();
  });
});

describe('Frontend Component: GuidelinesModal Accessibility', () => {
  it('renders accessible dialog with role="dialog" and aria-modal="true"', () => {
    render(<GuidelinesModal isOpen={true} onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'guidelines-title');
    expect(screen.getByText(/clinical stewardship guidelines \(2026\)/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<GuidelinesModal isOpen={true} onClose={handleClose} />);

    const closeBtn = screen.getByRole('button', { name: /close clinical guidelines/i });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('dismisses modal on Escape key press', () => {
    const handleClose = vi.fn();
    render(<GuidelinesModal isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    render(<GuidelinesModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Frontend Component: Antibiogram & Pathogen Matrix View', () => {
  it('renders antibiogram table with organisms and susceptibilities', () => {
    render(<AntibiogramView />);
    expect(screen.getByText(/hospital antibiogram & pathogen susceptibility/i)).toBeInTheDocument();
    expect(screen.getAllByText(/escherichia coli/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/meropenem/i).length).toBeGreaterThan(0);
  });

  it('filters matrix when selecting specific organism', () => {
    render(<AntibiogramView />);
    const filterSelect = screen.getByRole('combobox');
    fireEvent.change(filterSelect, { target: { value: 'pseudomonas' } });

    expect(screen.getAllByText(/pseudomonas aeruginosa/i).length).toBeGreaterThan(0);
    expect(screen.queryByText('Escherichia coli (Urinary & Blood)')).not.toBeInTheDocument();
  });
});

describe('Frontend Component: Inpatient Census & Renal Calculator View', () => {
  it('renders patient records and calculates Cockcroft-Gault clearance', () => {
    render(<PatientsView patients={initialPatients} onNewPrescription={vi.fn()} />);
    expect(screen.getByText('Sofia Martinez')).toBeInTheDocument();
    expect(screen.getByText('John Miller')).toBeInTheDocument();
    expect(screen.getByText(/cr: 0\.9 mg\/dl/i)).toBeInTheDocument();
    expect(screen.getAllByText(/est\. crcl:/i).length).toBeGreaterThan(0);
  });

  it('triggers prescription callback when Prescribe button is clicked', () => {
    const handlePrescribe = vi.fn();
    render(<PatientsView patients={initialPatients} onNewPrescription={handlePrescribe} />);

    const prescribeBtns = screen.getAllByRole('button', { name: /prescribe/i });
    fireEvent.click(prescribeBtns[0]);

    expect(handlePrescribe).toHaveBeenCalledWith(initialPatients[0].id);
  });
});

describe('Frontend Component: Patient Portal Views', () => {
  it('renders patient dashboard with active medications and next dose info', () => {
    render(
      <PatientDashboardView
        patient={initialPatients[0]}
        prescriptions={initialPrescriptions}
        appointments={initialAppointments}
        notifications={initialNotifications}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByText(/welcome, sofia martinez/i)).toBeInTheDocument();
    expect(screen.getByText(/next scheduled dose/i)).toBeInTheDocument();
    expect(screen.getByText('Piperacillin-Tazobactam')).toBeInTheDocument();
  });

  it('renders patient prescription cards with plain-language instructions', () => {
    render(<PatientPrescriptionsView prescriptions={initialPrescriptions} />);
    expect(screen.getByText('My Antibiotic Prescriptions')).toBeInTheDocument();
    expect(screen.getByText('Piperacillin-Tazobactam')).toBeInTheDocument();
    expect(screen.getAllByText(/patient instructions:/i).length).toBeGreaterThan(0);
  });
});

describe('Frontend Component: Admin Portal Views', () => {
  it('renders hospital stewardship committee dashboard with CDC scores', () => {
    render(
      <AdminDashboardView
        reports={initialReports}
        prescriptions={initialPrescriptions}
        patients={initialPatients}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByText(/stewardship committee overview/i)).toBeInTheDocument();
    expect(screen.getByText('96.4%')).toBeInTheDocument();
    expect(screen.getByText(/cdc compliance score/i)).toBeInTheDocument();
  });

  it('renders stewardship settings and toggles policy switches', () => {
    render(<AdminSettingsView />);
    expect(screen.getByText(/stewardship system settings/i)).toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', {
      name: /toggle automated clinical alerts/i,
    });
    expect(toggleBtn).toBeInTheDocument();
    fireEvent.click(toggleBtn);
    expect(toggleBtn).not.toHaveClass('on');
  });
});
