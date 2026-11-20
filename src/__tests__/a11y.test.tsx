import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import axe from 'axe-core';
import { AuthScreen } from '../components/AuthScreen';
import {
  GuidelinesModal,
  AntibiogramView,
  PatientsView,
  PatientDashboardView,
  AdminDashboardView,
} from '../components/PortalViews';
import {
  initialPatients,
  initialPrescriptions,
  initialAppointments,
  initialNotifications,
  initialReports,
} from '../lib/initialData';

const axeConfig: axe.RunOptions = {
  rules: {
    // Color contrast requires real browser layout rendering engine; disabled in JSDOM headless DOM
    'color-contrast': { enabled: false },
  },
};

describe('Automated Accessibility Testing with axe-core (WCAG 2.2 AA)', () => {
  it('AuthScreen contains 0 critical or serious axe-core violations', async () => {
    const { container } = render(<AuthScreen onAuthenticated={vi.fn()} darkMode={false} />);
    const results = await axe.run(container, axeConfig);
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });

  it('GuidelinesModal dialog contains 0 critical or serious axe-core violations', async () => {
    const { container } = render(<GuidelinesModal isOpen={true} onClose={vi.fn()} />);
    const results = await axe.run(container, axeConfig);
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });

  it('AntibiogramView pathogen matrix contains 0 critical or serious axe-core violations', async () => {
    const { container } = render(<AntibiogramView />);
    const results = await axe.run(container, axeConfig);
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });

  it('PatientsView inpatient census contains 0 critical or serious axe-core violations', async () => {
    const { container } = render(
      <PatientsView patients={initialPatients} onNewPrescription={vi.fn()} />
    );
    const results = await axe.run(container, axeConfig);
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });

  it('PatientDashboardView contains 0 critical or serious axe-core violations', async () => {
    const { container } = render(
      <PatientDashboardView
        patient={initialPatients[0]}
        prescriptions={initialPrescriptions}
        appointments={initialAppointments}
        notifications={initialNotifications}
        onNavigate={vi.fn()}
      />
    );
    const results = await axe.run(container, axeConfig);
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });

  it('AdminDashboardView committee overview contains 0 critical or serious axe-core violations', async () => {
    const { container } = render(
      <AdminDashboardView
        reports={initialReports}
        prescriptions={initialPrescriptions}
        patients={initialPatients}
        onNavigate={vi.fn()}
      />
    );
    const results = await axe.run(container, axeConfig);
    const criticalViolations = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });
});
