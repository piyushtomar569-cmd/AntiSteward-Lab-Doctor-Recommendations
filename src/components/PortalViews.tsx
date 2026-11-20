import React, { useState, useEffect, useRef } from 'react';
import type {
  Page,
  Patient,
  PatientAppointment,
  PatientNotification,
  Prescription,
  Profile,
  StewardshipReport,
} from '@/lib/types';
import {
  calculateCrCl,
  hospitalAntibiogram,
} from '@/lib/clinical';
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  FileCheck,
  FilePlus2,
  Filter,
  Heart,
  Info,
  MapPin,
  Pill,
  Printer,
  Search,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';

/* =========================================================================
   GUIDELINES MODAL (Accessible Dialog with Focus Trap & Esc Listener)
   ========================================================================= */

export function GuidelinesModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    modalRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guidelines-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        <div className="modal-header">
          <div>
            <h2 id="guidelines-title">Clinical Stewardship Guidelines (2026)</h2>
            <p>Evidence-based institutional policies for safe antimicrobial usage</p>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close clinical guidelines"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gap: '16px', fontSize: '12px', color: '#446072' }}>
          <div style={{ background: '#f5fafb', padding: '14px', borderRadius: '8px', border: '1px solid #dceff2' }}>
            <strong style={{ color: '#0f727c', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} /> 1. Preauthorization & Restricted Formulary
            </strong>
            <p style={{ margin: '6px 0 0', lineHeight: '1.5' }}>
              Restricted agents (Meropenem, Vancomycin, Ceftazidime-Avibactam) require pre-authorization or approval within 24 hours by the Infectious Disease consult service or clinical stewardship lead.
            </p>
          </div>

          <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2edf2' }}>
            <strong style={{ color: '#2a4c61', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock3 size={16} /> 2. 48-Hour De-escalation & "Antibiotic Timeout"
            </strong>
            <p style={{ margin: '6px 0 0', lineHeight: '1.5' }}>
              Re-evaluate all empirical therapy at 48 to 72 hours with microbiology AST reports. Whenever cultures identify susceptible organisms, de-escalate to narrow-spectrum Access agents (e.g. Ceftriaxone, Cefazolin, Ampicillin).
            </p>
          </div>

          <div style={{ background: '#fff9f4', padding: '14px', borderRadius: '8px', border: '1px solid #f9e2cf' }}>
            <strong style={{ color: '#b56122', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertTriangle size={16} /> 3. Renal Clearance & Therapeutic Drug Monitoring (TDM)
            </strong>
            <p style={{ margin: '6px 0 0', lineHeight: '1.5' }}>
              Calculate Cockcroft-Gault estimated CrCl for every patient with acute kidney injury or creatinine &gt; 1.2 mg/dL. Adjust carbapenems and cephalosporins to prevent neurotoxicity, and order steady-state Vancomycin serum trough levels targeting 15–20 mcg/mL for severe infections.
            </p>
          </div>

          <div style={{ background: '#f6fbf8', padding: '14px', borderRadius: '8px', border: '1px solid #d3ebd9' }}>
            <strong style={{ color: '#257a4a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CheckCircle2 size={16} /> 4. WHO AWaRe Framework Compliance
            </strong>
            <p style={{ margin: '6px 0 0', lineHeight: '1.5' }}>
              At least 60% of total hospital antimicrobial consumption must come from the <strong>Access</strong> category. <strong>Watch</strong> agents must be monitored for resistance selection pressure, and <strong>Reserve</strong> agents must be held strictly as last-resort options.
            </p>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: '20px' }}>
          <button className="primary-button" onClick={onClose}>
            Understood & Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   DOCTOR PORTAL VIEWS
   ========================================================================= */

export function AntibiogramView() {
  const [filterOrganism, setFilterOrganism] = useState<string>('all');
  const [copiedNotice, setCopiedNotice] = useState<boolean>(false);

  const entries = filterOrganism === 'all'
    ? hospitalAntibiogram
    : hospitalAntibiogram.filter((e) => e.organism.toLowerCase().includes(filterOrganism.toLowerCase()));

  const handleExportCSV = () => {
    const rows = ['Organism,Gram Stain,Antibiotic,Susceptibility Rate (%),WHO AWaRe'];
    hospitalAntibiogram.forEach((org) => {
      org.susceptibilities.forEach((s) => {
        rows.push(`"${org.organism}","${org.gramStain}","${s.antibiotic}",${s.susceptibleRate},"${s.awareCategory}"`);
      });
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hospital_antibiogram_2026.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="eyebrow">MICROBIOLOGY & SURVEILLANCE</div>
          <h1>Hospital Antibiogram & Pathogen Susceptibility</h1>
          <p>Local institutional cumulative antimicrobial susceptibility testing (AST) report</p>
        </div>
        <div style={{ display: 'flex', gap: '9px' }}>
          <button className="secondary-button" onClick={handleExportCSV}>
            <Download size={15} /> Export Antibiogram CSV
          </button>
          <button className="primary-button" onClick={() => window.print()}>
            <Printer size={15} /> Print Matrix
          </button>
        </div>
      </div>

      {copiedNotice && (
        <div className="auth-alert success" style={{ marginBottom: '16px' }}>
          <CheckCircle2 size={16} /> Antibiogram CSV successfully exported to your device.
        </div>
      )}

      <div className="portal-card" style={{ marginBottom: '18px' }}>
        <div className="portal-card-header">
          <div>
            <h3>Cumulative AST Surveillance (CLSI M39 Guidelines)</h3>
            <p>1,095 non-duplicate clinical isolates analyzed over the trailing 12 months</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Filter size={15} style={{ color: '#8ca0ae' }} aria-hidden="true" />
            <select
              aria-label="Filter antibiogram by organism"
              value={filterOrganism}
              onChange={(e) => setFilterOrganism(e.target.value)}
              style={{ border: '1px solid #dce8ee', borderRadius: '6px', padding: '6px 10px', fontSize: '11.5px' }}
            >
              <option value="all">All Organisms ({hospitalAntibiogram.length})</option>
              <option value="coli">Escherichia coli</option>
              <option value="klebsiella">Klebsiella pneumoniae</option>
              <option value="pseudomonas">Pseudomonas aeruginosa</option>
              <option value="staph">Staphylococcus aureus</option>
            </select>
          </div>
        </div>

        <div className="antibiogram-table-wrapper">
          <table className="antibiogram-table" aria-label="Hospital Cumulative Antimicrobial Susceptibility Testing Table">
            <caption className="sr-only">Local Institutional Antimicrobial Susceptibility Testing (AST) Table</caption>
            <thead>
              <tr>
                <th scope="col">Pathogen Organism</th>
                <th scope="col">Gram Stain</th>
                <th scope="col">Antimicrobial Agent</th>
                <th scope="col">WHO AWaRe</th>
                <th scope="col">Susceptibility Rate</th>
                <th scope="col">Clinical Interpretation</th>
              </tr>
            </thead>
            <tbody>
              {entries.flatMap((org) =>
                org.susceptibilities.map((s, idx) => {
                  const tone = s.susceptibleRate >= 90 ? 'high' : s.susceptibleRate >= 75 ? 'medium' : 'low';
                  return (
                    <tr key={`${org.id}-${s.antibiotic}`}>
                      {idx === 0 ? (
                        <td rowSpan={org.susceptibilities.length} style={{ verticalAlign: 'top', borderRight: '1px solid #edf2f6', background: '#fafcfd' }}>
                          <strong style={{ color: '#274457', fontSize: '12px' }}>{org.organism}</strong>
                          <div style={{ fontSize: '10px', color: '#889baa', marginTop: '4px' }}>
                            {org.isolateCount} clinical isolates
                          </div>
                        </td>
                      ) : null}
                      {idx === 0 ? (
                        <td rowSpan={org.susceptibilities.length} style={{ verticalAlign: 'top', borderRight: '1px solid #edf2f6', background: '#fafcfd' }}>
                          <span style={{ fontSize: '10px', fontWeight: 600, color: org.gramStain === 'Gram-Negative' ? '#b85f36' : '#456bb8' }}>
                            {org.gramStain}
                          </span>
                        </td>
                      ) : null}
                      <td>
                        <strong>{s.antibiotic}</strong>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            s.awareCategory === 'Access'
                              ? 'success'
                              : s.awareCategory === 'Watch'
                              ? 'high'
                              : 'critical'
                          }`}
                        >
                          {s.awareCategory}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className={`susceptibility-pill ${tone}`}>
                            {s.susceptibleRate}% Sensitive
                          </span>
                          <div style={{ flex: 1, height: '5px', background: '#eef3f6', borderRadius: '4px', overflow: 'hidden', minWidth: '60px' }}>
                            <div
                              style={{
                                width: `${s.susceptibleRate}%`,
                                height: '100%',
                                background: s.susceptibleRate >= 90 ? '#22c55e' : s.susceptibleRate >= 75 ? '#f59e0b' : '#ef4444',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: '11px', color: '#687f8e' }}>
                          {s.susceptibleRate >= 90
                            ? 'Recommended empirical first-line'
                            : s.susceptibleRate >= 75
                            ? 'Usable based on documented culture AST'
                            : 'Avoid empirical use; high local resistance'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function PatientsView({
  patients,
  onNewPrescription,
}: {
  patients: Patient[];
  onNewPrescription: (patientId: string) => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.mrn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="eyebrow">INPATIENT CENSUS & RENAL CLEARANCE</div>
          <h1>Patient Clinical Records</h1>
          <p>Active inpatients under antimicrobial stewardship surveillance</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <Search size={16} aria-hidden="true" />
          <input
            type="text"
            aria-label="Search patient census by name, MRN, or clinical diagnosis"
            placeholder="Search by patient name, MRN, or diagnosis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-panel">
        <div className="table-scroll">
          <table aria-label="Active Inpatient Census and Renal Calculator Table">
            <caption className="sr-only">Inpatient Census with Cockcroft-Gault Creatinine Clearance</caption>
            <thead>
              <tr>
                <th scope="col">Patient Details</th>
                <th scope="col">Ward & Location</th>
                <th scope="col">Creatinine & CrCl</th>
                <th scope="col">Known Allergies</th>
                <th scope="col">Clinical Diagnosis</th>
                <th scope="col">Stewardship Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((patient) => {
                const isFemale = patient.sex === 'F';
                const crcl = calculateCrCl(patient.age, patient.weight_kg, patient.creatinine_mg_dl, isFemale);
                return (
                  <tr key={patient.id}>
                    <td>
                      <div className="patient-cell">
                        <div className="patient-avatar">
                          {patient.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <strong>{patient.name}</strong>
                          <span>
                            {patient.mrn} · {patient.age}y {patient.sex} · {patient.weight_kg} kg
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#31495c' }}>{patient.ward}</span>
                    </td>
                    <td>
                      <div>
                        <strong>Cr: {patient.creatinine_mg_dl} mg/dL</strong>
                        <div style={{ fontSize: '10px', color: crcl.isImpaired ? '#c8503e' : '#27814b', marginTop: '2px' }}>
                          Est. CrCl: {crcl.crCl} mL/min ({crcl.staging})
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ color: patient.allergy_notes.toLowerCase().includes('no known') ? '#60798a' : '#c8503e', fontWeight: patient.allergy_notes.toLowerCase().includes('no known') ? 400 : 700 }}>
                        {patient.allergy_notes}
                      </span>
                    </td>
                    <td>
                      <span className="indication">{patient.diagnosis}</span>
                    </td>
                    <td>
                      <button
                        className="primary-button compact"
                        onClick={() => onNewPrescription(patient.id)}
                        title="Prescribe antibiotic for patient"
                      >
                        <FilePlus2 size={13} /> Prescribe
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function DoctorProfileView({ profile }: { profile: Profile }) {
  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="eyebrow">PHYSICIAN PROFILE & CREDENTIALS</div>
          <h1>{profile.full_name}</h1>
          <p>{profile.specialty} · Clinical Antimicrobial Stewardship Committee</p>
        </div>
      </div>

      <div className="portal-rx-grid" style={{ marginBottom: '22px' }}>
        <div className="portal-card">
          <div className="portal-card-header">
            <h3>Clinical Credentials</h3>
            <span className="badge success">Active Hospital Privileges</span>
          </div>
          <div className="rx-detail-row">
            <span>Specialty Certification</span>
            <strong>Infectious Diseases & Clinical Microbiology</strong>
          </div>
          <div className="rx-detail-row">
            <span>Affiliation</span>
            <strong>IDSA / SHEA Fellow (2026)</strong>
          </div>
          <div className="rx-detail-row">
            <span>Clinical Email</span>
            <strong>{profile.email}</strong>
          </div>
          <div className="rx-detail-row">
            <span>Department</span>
            <strong>Department of Medicine & ICU Consultation</strong>
          </div>
        </div>

        <div className="portal-card">
          <div className="portal-card-header">
            <h3>Stewardship Performance</h3>
            <span className="badge info">Top 5% Clinician</span>
          </div>
          <div className="rx-detail-row">
            <span>Stewardship Merit Score</span>
            <strong style={{ color: '#0ea5a6', fontSize: '15px' }}>{profile.points} Points</strong>
          </div>
          <div className="rx-detail-row">
            <span>Antibiogram Adherence</span>
            <strong style={{ color: '#16a34a' }}>98.2% Protocol Compliance</strong>
          </div>
          <div className="rx-detail-row">
            <span>De-escalation Timeout Velocity</span>
            <strong>1.6 Hours Average Review Time</strong>
          </div>
          <div className="rx-detail-row">
            <span>Active Inpatients Monitored</span>
            <strong>5 Patients Assigned</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   PATIENT PORTAL VIEWS
   ========================================================================= */

export function PatientDashboardView({
  patient,
  prescriptions,
  appointments,
  notifications,
  onNavigate,
}: {
  patient: Patient;
  prescriptions: Prescription[];
  appointments: PatientAppointment[];
  notifications: PatientNotification[];
  onNavigate: (page: Page) => void;
}) {
  const activeRx = prescriptions.filter((p) => p.status === 'active');
  const unreadNotifs = notifications.filter((n) => !n.read);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="eyebrow">PATIENT & FAMILY CARE PORTAL</div>
          <h1>Welcome, {patient.name}</h1>
          <p>
            MRN: {patient.mrn} · Inpatient Care: {patient.ward} · Attending ID: Dr. Sarah Chen
          </p>
        </div>
        <button className="primary-button" onClick={() => onNavigate('patient-appointments')}>
          <Calendar size={16} /> View Appointments
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon blue">
            <Pill size={20} />
          </div>
          <div className="stat-content">
            <span>Active Antibiotics</span>
            <strong>{activeRx.length}</strong>
            <small>Direct physician supervision</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <Clock3 size={20} />
          </div>
          <div className="stat-content">
            <span>Next Scheduled Dose</span>
            <strong style={{ fontSize: '16px', marginTop: '7px' }}>2:00 PM</strong>
            <small>IV Infusion via Pump</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon teal">
            <Calendar size={20} />
          </div>
          <div className="stat-content">
            <span>Upcoming Appointments</span>
            <strong>{appointments.length}</strong>
            <small>Next: Tomorrow 10:30 AM</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">
            <ShieldCheck size={20} />
          </div>
          <div className="stat-content">
            <span>Kidney Safety Staging</span>
            <strong style={{ fontSize: '16px', marginTop: '7px' }}>Normal (Cr 0.9)</strong>
            <small>Renal clearance confirmed</small>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="portal-card">
          <div className="portal-card-header">
            <div>
              <h3>My Current Medications</h3>
              <p>Prescribed antimicrobial therapies active in your treatment plan</p>
            </div>
            <button className="text-button" onClick={() => onNavigate('patient-prescriptions')}>
              View All <ArrowUpRight size={13} />
            </button>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {activeRx.map((rx) => (
              <div key={rx.id} className="patient-rx-card">
                <div className="patient-rx-header">
                  <div>
                    <strong>{rx.drug_name}</strong>
                    <div style={{ fontSize: '11px', color: '#6a8292', marginTop: '2px' }}>
                      {rx.dose} · {rx.route} {rx.frequency}
                    </div>
                  </div>
                  <span className="badge success">Active Regimen</span>
                </div>
                <div className="rx-instruction-box">
                  <strong>Indication:</strong> {rx.indication}. Administered through IV line. Your nurse monitors temperature and hydration during infusion.
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="portal-card">
          <div className="portal-card-header">
            <div>
              <h3>Recent Notifications</h3>
              <p>{unreadNotifs.length} unread updates from your care team</p>
            </div>
            <button className="text-button" onClick={() => onNavigate('patient-notifications')}>
              View All <ArrowUpRight size={13} />
            </button>
          </div>

          <div>
            {notifications.slice(0, 3).map((n) => (
              <div key={n.id} className={`notification-item ${n.read ? '' : 'unread'}`}>
                <Info size={17} style={{ color: '#0ea5a6', marginTop: '2px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong style={{ fontSize: '12px', color: '#273f51' }}>{n.title}</strong>
                  <p style={{ margin: '3px 0', fontSize: '11px', color: '#687e8e', lineHeight: '1.4' }}>
                    {n.message}
                  </p>
                  <span style={{ fontSize: '10px', color: '#97a6b0' }}>{n.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PatientPrescriptionsView({
  prescriptions,
}: {
  prescriptions: Prescription[];
}) {
  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="eyebrow">MEDICATION SCHEDULE & GUIDANCE</div>
          <h1>My Antibiotic Prescriptions</h1>
          <p>Detailed instructions, daily dosing timetable, and treatment duration</p>
        </div>
      </div>

      <div className="portal-rx-grid">
        {prescriptions.map((rx) => (
          <div key={rx.id} className="patient-rx-card">
            <div className="patient-rx-header">
              <div>
                <strong>{rx.drug_name}</strong>
                <div style={{ fontSize: '11.5px', color: '#0b7c84', fontWeight: 600, marginTop: '3px' }}>
                  {rx.dose} · {rx.route} ({rx.frequency})
                </div>
              </div>
              <span className={`badge ${rx.status === 'active' ? 'success' : 'neutral'}`}>
                {rx.status.toUpperCase()}
              </span>
            </div>

            <div className="rx-detail-row">
              <span>Prescribing Physician</span>
              <strong>Dr. Sarah Chen, MD</strong>
            </div>

            <div className="rx-detail-row">
              <span>Course Duration</span>
              <strong>{rx.duration_days} Days Scheduled</strong>
            </div>

            <div className="rx-detail-row">
              <span>Treatment Purpose</span>
              <strong>{rx.indication}</strong>
            </div>

            <div className="rx-instruction-box">
              <strong style={{ display: 'block', color: '#244558', marginBottom: '4px' }}>
                Patient Instructions:
              </strong>
              {rx.route === 'IV'
                ? 'Administered via intravenous infusion. Please report any burning, pain at the IV site, or new skin rashes to your bedside nurse immediately.'
                : 'Take by mouth with a full glass of water. Continue taking until the full prescribed course is completed even if symptoms resolve.'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PatientAppointmentsView({
  appointments,
  onBookAppointment,
}: {
  appointments: PatientAppointment[];
  onBookAppointment: (newApt: PatientAppointment) => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [doctorName, setDoctorName] = useState('Dr. Sarah Chen');
  const [specialty, setSpecialty] = useState('Infectious Disease Specialist');
  const [dateTime, setDateTime] = useState('Next Monday, 11:00 AM');
  const [purpose, setPurpose] = useState('Follow-up blood culture review & oral step-down check');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newApt: PatientAppointment = {
      id: `apt-${Date.now()}`,
      patient_id: '11111111-1111-1111-1111-111111111111',
      doctor_name: doctorName,
      specialty,
      date_time: dateTime,
      location: 'Main Hospital · Clinical Consultation Center',
      purpose,
      status: 'Scheduled',
    };
    onBookAppointment(newApt);
    setShowModal(false);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="eyebrow">CARE CONTINUITY</div>
          <h1>Follow-up Appointments</h1>
          <p>Scheduled consultations with your infectious disease specialists</p>
        </div>
        <button className="primary-button" onClick={() => setShowModal(true)}>
          <Calendar size={15} /> Request Appointment
        </button>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h3>Upcoming Clinical Visits</h3>
          <span className="badge info">{appointments.length} Visits Scheduled</span>
        </div>

        <div>
          {appointments.map((apt) => (
            <div key={apt.id} className="appointment-item">
              <div>
                <strong style={{ fontSize: '13px', color: '#274254' }}>{apt.doctor_name}</strong>
                <div style={{ fontSize: '11px', color: '#6c8494', marginTop: '2px' }}>
                  {apt.specialty}
                </div>
                <div style={{ fontSize: '11px', color: '#244558', marginTop: '6px' }}>
                  <strong>Purpose:</strong> {apt.purpose}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge success">{apt.status}</span>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#314e60', marginTop: '6px' }}>
                  {apt.date_time}
                </div>
                <div style={{ fontSize: '10px', color: '#8fa0ad', marginTop: '2px' }}>
                  <MapPin size={11} style={{ display: 'inline', marginRight: '3px' }} />
                  {apt.location}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop fade-in" onClick={() => setShowModal(false)} role="presentation">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="apt-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 id="apt-modal-title">Schedule Follow-up Consultation</h2>
                <p>Request an infectious disease or pharmacy stewardship follow-up</p>
              </div>
              <button className="close-button" onClick={() => setShowModal(false)} aria-label="Close modal">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>
                Consulting Physician
                <select
                  value={doctorName}
                  onChange={(e) => {
                    const doc = e.target.value;
                    setDoctorName(doc);
                    if (doc.includes('Pharmacist')) {
                      setSpecialty('Clinical Pharmacy Specialist');
                    } else if (doc.includes('Thompson')) {
                      setSpecialty('Stewardship Director');
                    } else {
                      setSpecialty('Infectious Disease Specialist');
                    }
                  }}
                >
                  <option value="Dr. Sarah Chen">Dr. Sarah Chen (Infectious Disease)</option>
                  <option value="Dr. Robert Thompson">Dr. Robert Thompson (Stewardship Director)</option>
                  <option value="Clinical Pharmacist Consultation">Clinical Pharmacist TDM Consultation</option>
                </select>
              </label>

              <label>
                Preferred Time
                <input
                  type="text"
                  required
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                />
              </label>

              <label>
                Reason for Visit
                <input
                  type="text"
                  required
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </label>

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function PatientRecommendationsView() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="eyebrow">HEALTH EDUCATION & SAFETY</div>
          <h1>Antibiotic Stewardship Guidance</h1>
          <p>Important guidelines to ensure your recovery and protect antibiotic effectiveness</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        <div className="portal-card">
          <div className="portal-card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} style={{ color: '#0ea5a6' }} /> Complete Your Treatment Course
            </h3>
          </div>
          <p style={{ fontSize: '11.5px', lineHeight: '1.6', color: '#567182' }}>
            Even if you start feeling completely better after 2–3 days, stopping antibiotics prematurely allows the hardiest bacteria to survive, mutate, and cause recurring, resistant infections.
          </p>
        </div>

        <div className="portal-card">
          <div className="portal-card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Heart size={18} style={{ color: '#10b981' }} /> Hydration & Kidney Health
            </h3>
          </div>
          <p style={{ fontSize: '11.5px', lineHeight: '1.6', color: '#567182' }}>
            Drink plenty of fluids as recommended by your physician. Adequate hydration helps your kidneys flush medication metabolites efficiently and protects renal function.
          </p>
        </div>

        <div className="portal-card">
          <div className="portal-card-header">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} style={{ color: '#f59e0b' }} /> Report Any Side Effects Promptly
            </h3>
          </div>
          <p style={{ fontSize: '11.5px', lineHeight: '1.6', color: '#567182' }}>
            Notify your nurse or doctor immediately if you develop skin hives, severe watery diarrhea, or breathing difficulty. These may indicate hypersensitivity or intestinal flora imbalance.
          </p>
        </div>
      </div>
    </div>
  );
}

export function PatientRecordsView({ patient }: { patient: Patient }) {
  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="eyebrow">ELECTRONIC HEALTH RECORD</div>
          <h1>My Medical Records</h1>
          <p>Official diagnostic laboratory records and microbial culture summaries</p>
        </div>
      </div>

      <div className="portal-card" style={{ marginBottom: '18px' }}>
        <div className="portal-card-header">
          <h3>Patient Clinical Summary</h3>
          <span className="badge success">Verified Record</span>
        </div>
        <div className="rx-detail-row">
          <span>Medical Record Number (MRN)</span>
          <strong>{patient.mrn}</strong>
        </div>
        <div className="rx-detail-row">
          <span>Current Ward Location</span>
          <strong>{patient.ward}</strong>
        </div>
        <div className="rx-detail-row">
          <span>Primary Admission Diagnosis</span>
          <strong>{patient.diagnosis}</strong>
        </div>
        <div className="rx-detail-row">
          <span>Serum Creatinine & Clearance</span>
          <strong>{patient.creatinine_mg_dl} mg/dL (Normal Range 0.6–1.1 mg/dL)</strong>
        </div>
        <div className="rx-detail-row">
          <span>Allergies Documented</span>
          <strong>{patient.allergy_notes}</strong>
        </div>
      </div>
    </div>
  );
}

export function PatientNotificationsView({
  notifications,
  onMarkAsRead,
}: {
  notifications: PatientNotification[];
  onMarkAsRead: (id: string) => void;
}) {
  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="eyebrow">COMMUNICATION & ALERTS</div>
          <h1>My Care Notifications</h1>
          <p>Direct updates from the clinical care team and laboratory</p>
        </div>
      </div>

      <div className="portal-card">
        {notifications.map((n) => (
          <div key={n.id} className={`notification-item ${n.read ? '' : 'unread'}`}>
            <Info size={17} style={{ color: '#0ea5a6', marginTop: '2px', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong style={{ fontSize: '12.5px', color: '#20394c' }}>{n.title}</strong>
                <span style={{ fontSize: '10px', color: '#889baa' }}>{n.time}</span>
              </div>
              <p style={{ margin: '4px 0 8px', fontSize: '11.5px', color: '#566e7e' }}>
                {n.message}
              </p>
              {!n.read && (
                <button
                  className="secondary-button compact"
                  onClick={() => onMarkAsRead(n.id)}
                  style={{ fontSize: '10px', padding: '4px 8px' }}
                >
                  <Check size={11} /> Mark as read
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PatientProfileView({ patient }: { patient: Patient }) {
  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="eyebrow">DEMOGRAPHICS & ACCOUNT</div>
          <h1>Patient Profile: {patient.name}</h1>
          <p>Personal medical record information and emergency contact data</p>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h3>Demographic Summary</h3>
          <span className="badge success">Verified Identity</span>
        </div>
        <div className="rx-detail-row">
          <span>Full Name</span>
          <strong>{patient.name}</strong>
        </div>
        <div className="rx-detail-row">
          <span>MRN</span>
          <strong>{patient.mrn}</strong>
        </div>
        <div className="rx-detail-row">
          <span>Age & Sex</span>
          <strong>{patient.age} Years · {patient.sex === 'F' ? 'Female' : 'Male'}</strong>
        </div>
        <div className="rx-detail-row">
          <span>Weight</span>
          <strong>{patient.weight_kg} kg</strong>
        </div>
        <div className="rx-detail-row">
          <span>Hospital Ward</span>
          <strong>{patient.ward}</strong>
        </div>
        <div className="rx-detail-row">
          <span>Designated Primary Pharmacy</span>
          <strong>Main Hospital Outpatient Pharmacy (Discharge Pickup)</strong>
        </div>
      </div>
    </div>
  );
}

/* =========================================================================
   ADMIN PORTAL VIEWS
   ========================================================================= */

export function AdminDashboardView({
  reports,
  prescriptions,
  patients,
  onNavigate,
}: {
  reports: StewardshipReport[];
  prescriptions: Prescription[];
  patients: Patient[];
  onNavigate: (page: Page) => void;
}) {
  const restrictedRx = prescriptions.filter((p) => p.is_restricted);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="eyebrow">HOSPITAL STEWARDSHIP EXECUTIVE DASHBOARD</div>
          <h1>Stewardship Committee Overview</h1>
          <p>Institutional oversight, CDC Core Elements tracking, and formulary control</p>
        </div>
        <button className="primary-button" onClick={() => onNavigate('admin-reports')}>
          <Download size={15} /> Export CDC Audit
        </button>
      </div>

      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon teal">
            <ShieldCheck size={20} />
          </div>
          <div className="stat-content">
            <span>CDC Compliance Score</span>
            <strong>96.4%</strong>
            <small className="trend-up">↑ 4.2% over Q3 target</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">
            <Pill size={20} />
          </div>
          <div className="stat-content">
            <span>Restricted Antimicrobials</span>
            <strong>{restrictedRx.length}</strong>
            <small>Requires preauthorization</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon orange">
            <Users size={20} />
          </div>
          <div className="stat-content">
            <span>Total Census</span>
            <strong>{patients.length}</strong>
            <small>Active inpatient cohort</small>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">
            <FileCheck size={20} />
          </div>
          <div className="stat-content">
            <span>Stewardship Reports</span>
            <strong>{reports.length}</strong>
            <small>Certified and audit-ready</small>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="portal-card">
          <div className="portal-card-header">
            <div>
              <h3>Institutional Compliance Audits</h3>
              <p>Certified regulatory stewardship reports ready for export</p>
            </div>
            <button className="text-button" onClick={() => onNavigate('admin-reports')}>
              View All <ArrowUpRight size={13} />
            </button>
          </div>

          <div style={{ display: 'grid', gap: '10px' }}>
            {reports.slice(0, 3).map((rep) => (
              <div key={rep.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', border: '1px solid #eef3f6', borderRadius: '7px' }}>
                <div>
                  <strong style={{ fontSize: '12px', color: '#274457' }}>{rep.title}</strong>
                  <div style={{ fontSize: '10px', color: '#8297a5', marginTop: '2px' }}>
                    {rep.category} · Compliance Rate: {rep.compliance_rate}% · {rep.file_size}
                  </div>
                </div>
                <span className="badge success">{rep.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="portal-card">
          <div className="portal-card-header">
            <div>
              <h3>Formulary Pre-Authorization Status</h3>
              <p>Active restricted antibiotic approval queue</p>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '10px' }}>
            {restrictedRx.map((rx) => (
              <div key={rx.id} style={{ padding: '12px 14px', border: '1px solid #f0e6e2', background: '#fdfaf9', borderRadius: '7px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '12px', color: '#314a5d' }}>{rx.drug_name}</strong>
                  <span className="badge high">RESTRICTED</span>
                </div>
                <div style={{ fontSize: '10.5px', color: '#68808f', marginTop: '4px' }}>
                  {rx.restriction_reason}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminUsersView() {
  const [userList, setUserList] = useState([
    { id: 'usr-1', name: 'Dr. Sarah Chen', email: 'sarah.chen@hospital.org', role: 'doctor', status: 'Active', department: 'Infectious Disease' },
    { id: 'usr-2', name: 'Dr. Robert Thompson', email: 'admin@hospital.org', role: 'admin', status: 'Active', department: 'Stewardship Committee' },
    { id: 'usr-3', name: 'Sofia Martinez', email: 'sofia.martinez@patient.org', role: 'patient', status: 'Active', department: 'Inpatient Care' },
    { id: 'usr-4', name: 'Dr. Marcus Vance', email: 'marcus.vance@hospital.org', role: 'doctor', status: 'Active', department: 'Pulmonology' },
    { id: 'usr-5', name: 'Dr. Elena Rostova', email: 'elena.rostova@hospital.org', role: 'doctor', status: 'Pending Verification', department: 'Critical Care' },
  ]);

  const handleToggleStatus = (id: string) => {
    setUserList((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === 'Active' ? 'Suspended' : 'Active' } : u
      )
    );
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="eyebrow">IDENTITY & ACCESS CONTROL</div>
          <h1>System User Management</h1>
          <p>Authorized clinicians, patients, and stewardship committee personnel</p>
        </div>
      </div>

      <div className="table-panel">
        <div className="table-scroll">
          <table aria-label="System Users Directory">
            <caption className="sr-only">Authorized Clinical Staff and Users Directory</caption>
            <thead>
              <tr>
                <th scope="col">User Full Name</th>
                <th scope="col">Clinical Email</th>
                <th scope="col">System Role</th>
                <th scope="col">Department</th>
                <th scope="col">Status</th>
                <th scope="col">Access Action</th>
              </tr>
            </thead>
            <tbody>
              {userList.map((usr) => (
                <tr key={usr.id}>
                  <td>
                    <strong>{usr.name}</strong>
                  </td>
                  <td>{usr.email}</td>
                  <td>
                    <span
                      className={`badge ${
                        usr.role === 'admin' ? 'critical' : usr.role === 'doctor' ? 'info' : 'success'
                      }`}
                    >
                      {usr.role.toUpperCase()}
                    </span>
                  </td>
                  <td>{usr.department}</td>
                  <td>
                    <span className={`badge ${usr.status === 'Active' ? 'success' : 'neutral'}`}>
                      {usr.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="secondary-button compact"
                      onClick={() => handleToggleStatus(usr.id)}
                      aria-label={`${usr.status === 'Active' ? 'Suspend' : 'Reactivate'} access for ${usr.name}`}
                    >
                      {usr.status === 'Active' ? 'Suspend' : 'Reactivate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AdminDoctorsView() {
  const doctors = [
    { name: 'Dr. Sarah Chen', email: 'sarah.chen@hospital.org', specialty: 'Infectious Disease', prescriptions: 42, complianceScore: 98.4 },
    { name: 'Dr. Marcus Vance', email: 'marcus.vance@hospital.org', specialty: 'Critical Care (ICU)', prescriptions: 38, complianceScore: 94.1 },
    { name: 'Dr. Priya Patel', email: 'priya.patel@hospital.org', specialty: 'General Surgery', prescriptions: 29, complianceScore: 91.0 },
    { name: 'Dr. David Kim', email: 'david.kim@hospital.org', specialty: 'Pulmonology', prescriptions: 31, complianceScore: 95.8 },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="eyebrow">MEDICAL STAFF STEWARDSHIP</div>
          <h1>Doctor Management & Prescribing Adherence</h1>
          <p>Prescriber audit metrics, guidelines adherence, and peer benchmarks</p>
        </div>
      </div>

      <div className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Doctor</th>
                <th>Specialty</th>
                <th>Prescriptions Audited</th>
                <th>Adherence Score</th>
                <th>Audit Rating</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc) => (
                <tr key={doc.email}>
                  <td>
                    <strong>{doc.name}</strong>
                    <div style={{ fontSize: '10px', color: '#8ba0ae' }}>{doc.email}</div>
                  </td>
                  <td>{doc.specialty}</td>
                  <td>{doc.prescriptions} cases</td>
                  <td>
                    <strong style={{ color: doc.complianceScore >= 95 ? '#16a34a' : '#d97706' }}>
                      {doc.complianceScore}%
                    </strong>
                  </td>
                  <td>
                    <span className={`badge ${doc.complianceScore >= 95 ? 'success' : 'moderate'}`}>
                      {doc.complianceScore >= 95 ? 'EXEMPLARY' : 'COMPLIANT'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AdminReportsView({ reports }: { reports: StewardshipReport[] }) {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleDownloadReport = (rep: StewardshipReport) => {
    const reportText = `ANTISTEWARD ANTIMICROBIAL STEWARDSHIP REPORT\nTitle: ${rep.title}\nCategory: ${rep.category}\nPeriod: ${rep.period}\nCompliance Rate: ${rep.compliance_rate}%\nGenerated At: ${rep.generated_at}\n\nSummary:\n${rep.summary}\n`;
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rep.title.toLowerCase().replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadSuccess(`Downloaded "${rep.title}" successfully.`);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="eyebrow">REGULATORY & ACCREDITATION</div>
          <h1>Stewardship Audit Reports</h1>
          <p>CDC 7 Core Elements, Antibiogram matrices, and Formulary compliance documents</p>
        </div>
      </div>

      {downloadSuccess && (
        <div className="auth-alert success" style={{ marginBottom: '16px' }}>
          <CheckCircle2 size={16} /> {downloadSuccess}
        </div>
      )}

      <div style={{ display: 'grid', gap: '14px' }}>
        {reports.map((rep) => (
          <div key={rep.id} className="portal-card">
            <div className="portal-card-header">
              <div>
                <strong style={{ fontSize: '14px', color: '#274457' }}>{rep.title}</strong>
                <div style={{ fontSize: '11px', color: '#688292', marginTop: '3px' }}>
                  {rep.category} · Reporting Period: {rep.period} · File Size: {rep.file_size}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge success">{rep.status}</span>
                <button
                  className="primary-button compact"
                  onClick={() => handleDownloadReport(rep)}
                >
                  <Download size={13} /> Export Report
                </button>
              </div>
            </div>

            <p style={{ margin: '8px 0 0', fontSize: '11.5px', color: '#566e7d', lineHeight: '1.5' }}>
              {rep.summary}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminSettingsView() {
  const [autoAlerts, setAutoAlerts] = useState(true);
  const [preauthRequired, setPreauthRequired] = useState(true);
  const [timeoutHours, setTimeoutHours] = useState(48);
  const [renalThreshold, setRenalThreshold] = useState(50);
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSaveSettings = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="eyebrow">POLICY & ALGORITHM CONFIGURATION</div>
          <h1>Stewardship System Settings</h1>
          <p>Formulary restriction rules, alert sensitivity, and automated timeout thresholds</p>
        </div>
        <button className="primary-button" onClick={handleSaveSettings}>
          <Check size={16} /> Save Policy Changes
        </button>
      </div>

      {savedNotice && (
        <div className="auth-alert success" style={{ marginBottom: '16px' }}>
          <CheckCircle2 size={16} /> Stewardship system policies updated and committed to active runtime.
        </div>
      )}

      <div className="portal-card">
        <div className="settings-group">
          <div className="settings-row">
            <div>
              <strong>Automated Clinical Alerts</strong>
              <span>Trigger real-time notifications for renal dose mismatches and de-escalation opportunities.</span>
            </div>
            <button
              type="button"
              className={`toggle-switch ${autoAlerts ? 'on' : ''}`}
              onClick={() => setAutoAlerts(!autoAlerts)}
              aria-label="Toggle automated clinical alerts"
            >
              <div className="toggle-switch-handle" />
            </button>
          </div>

          <div className="settings-row">
            <div>
              <strong>Mandatory Preauthorization for Restricted Formulary</strong>
              <span>Enforce committee review for Carbapenems, Glycopeptides, and Lipopeptides.</span>
            </div>
            <button
              type="button"
              className={`toggle-switch ${preauthRequired ? 'on' : ''}`}
              onClick={() => setPreauthRequired(!preauthRequired)}
              aria-label="Toggle mandatory preauthorization"
            >
              <div className="toggle-switch-handle" />
            </button>
          </div>
        </div>

        <div className="settings-group">
          <div className="settings-row">
            <div>
              <strong>Empirical Antibiotic Timeout Interval</strong>
              <span>Scheduled clinical alert for culture results re-evaluation.</span>
            </div>
            <select
              value={timeoutHours}
              onChange={(e) => setTimeoutHours(Number(e.target.value))}
              style={{ border: '1px solid #dce8ee', borderRadius: '6px', padding: '6px 12px', fontSize: '11.5px' }}
            >
              <option value={24}>24 Hours</option>
              <option value={48}>48 Hours (CDC Standard)</option>
              <option value={72}>72 Hours</option>
            </select>
          </div>

          <div className="settings-row">
            <div>
              <strong>Strict Renal Clearance Alert Threshold (CrCl mL/min)</strong>
              <span>Threshold triggering automatic dose adjustment recommendations.</span>
            </div>
            <select
              value={renalThreshold}
              onChange={(e) => setRenalThreshold(Number(e.target.value))}
              style={{ border: '1px solid #dce8ee', borderRadius: '6px', padding: '6px 12px', fontSize: '11.5px' }}
            >
              <option value={30}>30 mL/min (Severe)</option>
              <option value={50}>50 mL/min (Moderate & Severe)</option>
              <option value={60}>60 mL/min (Mild, Moderate & Severe)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminProfileView({ profile }: { profile: Profile }) {
  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="eyebrow">ADMINISTRATIVE CREDENTIALS</div>
          <h1>{profile.full_name}</h1>
          <p>{profile.specialty} · Lead Administrator</p>
        </div>
      </div>

      <div className="portal-card">
        <div className="portal-card-header">
          <h3>Stewardship Director Profile</h3>
          <span className="badge critical">Full Admin Access</span>
        </div>
        <div className="rx-detail-row">
          <span>Name & Credentials</span>
          <strong>{profile.full_name}</strong>
        </div>
        <div className="rx-detail-row">
          <span>Hospital Email</span>
          <strong>{profile.email}</strong>
        </div>
        <div className="rx-detail-row">
          <span>Role Clearance</span>
          <strong>Institutional Antimicrobial Stewardship Director</strong>
        </div>
        <div className="rx-detail-row">
          <span>Security Audit Log Level</span>
          <strong>Level 3 Comprehensive Auditing Active</strong>
        </div>
      </div>
    </div>
  );
}
