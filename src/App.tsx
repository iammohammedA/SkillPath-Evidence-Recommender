import React, { useState, useEffect, useMemo } from 'react';
import {
  AppPageId,
  StudentRecord,
  CareerRole,
  RecommendationWeights,
  AuditLogEntry,
  OfflineFieldRecord,
  StakeholderFeedbackEntry,
} from './types';
import {
  DEFAULT_WEIGHTS,
  INITIAL_CAREER_ROLES,
  INITIAL_DEMO_STUDENTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_STAKEHOLDER_FEEDBACK,
} from './data/initialData';
import {
  evaluateStudentForRoles,
  evaluateBaselineForRoles,
} from './utils/recommendationEngine';
import {
  generateSyntheticDataset,
  exportStudentsToCSV,
} from './utils/syntheticGenerator';
import {
  getAllOfflineFieldRecords,
  saveOfflineFieldRecord,
  seedInitialFieldConflictIfEmpty,
} from './utils/indexedDbService';
import { StudentProfileView, CompetencyRadarSVG } from './components/StudentProfileViews';
import {
  RecommendationsComparisonView,
  EvidenceExplanationView,
} from './components/RecommendationViews';
import { HumanReviewView, AuditTrailView } from './components/HumanReviewAndAudit';
import {
  OfflineFieldModeView,
  SyncAndConflictResolutionView,
} from './components/OfflineFieldAndSync';
import {
  ExperimentEvaluationView,
  FailureModeAnalysisView,
  RiskAnalysisView,
  StakeholderFeedbackView,
} from './components/ExperimentAndGovernance';
import {
  CareerRoleDatabaseView,
  EvidenceCollectionView,
  AdminSettingsView,
} from './components/RoleAndAdminViews';
import {
  Play,
  Wifi,
  WifiOff,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Search,
  Download,
  Plus,
} from 'lucide-react';

const NAV_GROUPS: {
  groupLabel: string;
  items: { id: AppPageId; label: string }[];
}[] = [
  {
    groupLabel: 'Core Workflow & Students',
    items: [
      { id: 'home', label: '01. Home / Overview' },
      { id: 'students', label: '02. Student Management' },
      { id: 'student-profile', label: '03. Student Profile' },
      { id: 'evidence-collection', label: '04. Evidence Collection' },
      { id: 'skill-profile', label: '05. Skill & Competency Profile' },
    ],
  },
  {
    groupLabel: 'Recommendations & Review',
    items: [
      { id: 'recommendations', label: '06. Career Recommendations' },
      { id: 'evidence-explanation', label: '07. Evidence Explanation' },
      { id: 'human-review', label: '08. Human Review & Evaluator' },
      { id: 'audit-trail', label: '09. Audit Trail' },
    ],
  },
  {
    groupLabel: 'Field Mode & Role Catalog',
    items: [
      { id: 'offline-field', label: '10. Offline Field Mode' },
      { id: 'sync-conflict', label: '11. Sync & Conflict Resolution' },
      { id: 'role-database', label: '12. Career Role Database' },
    ],
  },
  {
    groupLabel: 'Validation, Risks & Admin',
    items: [
      { id: 'experiment', label: '13. Experiment / Evaluation' },
      { id: 'failure-analysis', label: '14. Failure Mode Analysis' },
      { id: 'risk-analysis', label: '15. Risk Analysis' },
      { id: 'stakeholder-feedback', label: '16. Stakeholder Feedback' },
      { id: 'admin-settings', label: '17. Admin Settings' },
    ],
  },
];

const DEMO_WALKTHROUGH_STEPS: {
  step: number;
  title: string;
  page: AppPageId;
  studentId?: string;
  narration: string;
}[] = [
  {
    step: 1,
    title: 'Load Demo Student (Student C: Amina Vance)',
    page: 'student-profile',
    studentId: 'STU-101',
    narration: 'Loaded STU-101 (Amina Vance). Written theory marks are 74%, but she has completed 2 advanced network security projects and 3 verified lab assessments.',
  },
  {
    step: 2,
    title: 'Display Student Practical Evidence',
    page: 'evidence-collection',
    studentId: 'STU-101',
    narration: 'Inspecting raw workshop projects (P102, P108), practical assessments (A21, A24), and portfolio artifacts (PF44, PF49).',
  },
  {
    step: 3,
    title: 'Generate Skill & Competency Profile',
    page: 'skill-profile',
    studentId: 'STU-101',
    narration: 'Extracted 7 demonstrated technical skills (Linux, Python, Packet Analysis, Firewall Config) and mapped 6-axis competency radar.',
  },
  {
    step: 4,
    title: 'Compare Against 10 Vocational Career Roles',
    page: 'role-database',
    studentId: 'STU-101',
    narration: 'Comparing student skill profile against required skills, minimum competency proficiencies (1–5), and portfolio standards across 10 vocational roles.',
  },
  {
    step: 5,
    title: 'Show Top 3 Career Recommendations',
    page: 'recommendations',
    studentId: 'STU-101',
    narration: 'Top 3 generated: #1 Cybersecurity Analyst (91%), #2 Cloud Support Technician (79%), #3 Network Technician (74%).',
  },
  {
    step: 6,
    title: 'Show Traceable Evidence Behind Recommendation',
    page: 'evidence-explanation',
    studentId: 'STU-101',
    narration: 'Every recommendation point is linked to Project P102, Practical Assessment A21, Portfolio PF44, and Instructor Evaluation E17.',
  },
  {
    step: 7,
    title: 'Show Missing Skills & Compare vs. Marks Baseline',
    page: 'recommendations',
    studentId: 'STU-102',
    narration: 'Switched to Student A (Devon Sterling, 95% Marks, Weak Practical) to contrast Marks-Only Baseline (88%) vs. Skill-Evidence (34% Low Confidence).',
  },
  {
    step: 8,
    title: 'Evaluator Human-in-the-Loop Review & Override',
    page: 'human-review',
    studentId: 'STU-101',
    narration: 'Evaluator reviews AI recommendation, records human approval or override decision, and captures mandatory justification.',
  },
  {
    step: 9,
    title: 'Verify Immutable Audit Trail',
    page: 'audit-trail',
    narration: 'Every recommendation, evidence artifact ID, evaluator override, and reason is recorded in the searchable Audit Log.',
  },
  {
    step: 10,
    title: 'Demonstrate Offline IndexedDB Field Mode',
    page: 'offline-field',
    narration: 'Field instructor logs practical assessments offline inside browser IndexedDB and calculates local compatibility scores.',
  },
  {
    step: 11,
    title: 'Demonstrate Synchronization & Conflict Resolution',
    page: 'sync-conflict',
    narration: 'When connectivity returns, instructor resolves concurrent modification conflicts (Local vs. Server vs. Manual Union).',
  },
  {
    step: 12,
    title: 'Display 520-Student Benchmark Experiment Results',
    page: 'experiment',
    narration: 'Compared Experiment A (Marks + Interests Baseline) against Experiment B (Skill-Evidence) across 520 synthetic student records.',
  },
  {
    step: 13,
    title: 'Display Failure Mode & Risk Analysis',
    page: 'failure-analysis',
    narration: 'Verified system guardrails on Missing Evidence (STU-105), Conflicting Interests (STU-104), and Split Evaluator Bias (STU-106).',
  },
];

export default function App() {
  const [activePage, setActivePage] = useState<AppPageId>('home');
  const [students, setStudents] = useState<StudentRecord[]>(INITIAL_DEMO_STUDENTS);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('STU-101');
  const [roles, setRoles] = useState<CareerRole[]>(INITIAL_CAREER_ROLES);
  const [weights, setWeights] = useState<RecommendationWeights>(DEFAULT_WEIGHTS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [feedbackEntries, setFeedbackEntries] = useState<StakeholderFeedbackEntry[]>(
    INITIAL_STAKEHOLDER_FEEDBACK
  );
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [offlineQueue, setOfflineQueue] = useState<OfflineFieldRecord[]>([]);
  const [demoWalkthroughIdx, setDemoWalkthroughIdx] = useState<number | null>(null);
  const [studentSearch, setStudentSearch] = useState('');

  // Load IndexedDB queue on mount
  useEffect(() => {
    seedInitialFieldConflictIfEmpty()
      .then(records => setOfflineQueue(records))
      .catch(() => {});
  }, []);

  const selectedStudent = useMemo(
    () => students.find(s => s.id === selectedStudentId) || students[0],
    [students, selectedStudentId]
  );

  const activeRecommendations = useMemo(
    () => evaluateStudentForRoles(selectedStudent, roles, weights),
    [selectedStudent, roles, weights]
  );

  const activeBaselineRecommendations = useMemo(
    () => evaluateBaselineForRoles(selectedStudent, roles),
    [selectedStudent, roles]
  );

  const appendAudit = (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `AUD-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };
    setAuditLogs(prev => [newEntry, ...prev]);
  };

  const handleApproveOrOverride = (
    studentId: string,
    decision: 'Approved' | 'Modified / Overridden' | 'Rejected' | 'More Evidence Requested',
    finalRoleId: string,
    evaluatorName: string,
    reason: string,
    comments: string
  ) => {
    const targetStu = students.find(s => s.id === studentId);
    if (!targetStu) return;
    const stuRecs = evaluateStudentForRoles(targetStu, roles, weights);
    const topAi = stuRecs[0];
    const finalRole = roles.find(r => r.id === finalRoleId) || roles[0];

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const updatedStudent: StudentRecord = {
      ...targetStu,
      humanValidation: {
        status: decision,
        originalRoleId: topAi.roleId,
        originalRoleTitle: topAi.roleTitle,
        originalScore: topAi.overallCompatibilityScore,
        finalRoleId: finalRole.id,
        finalRoleTitle: finalRole.title,
        evaluatorId: 'EVAL-HUMAN',
        evaluatorName,
        reason,
        comments,
        timestamp,
      },
    };

    setStudents(prev => prev.map(s => (s.id === studentId ? updatedStudent : s)));

    appendAudit({
      actorName: evaluatorName,
      actorRole: 'Evaluator',
      actionType:
        decision === 'Approved'
          ? 'HUMAN_APPROVAL'
          : decision === 'Modified / Overridden'
          ? 'HUMAN_OVERRIDE'
          : decision === 'More Evidence Requested'
          ? 'EVIDENCE_REQUESTED'
          : 'HUMAN_REJECT',
      studentId: targetStu.id,
      studentName: targetStu.name,
      originalRecommendation: topAi.roleTitle,
      finalRecommendation: finalRole.title,
      score: topAi.overallCompatibilityScore,
      evidenceUsed: Array.from(new Set(topAi.matchedEvidence.map(e => e.sourceId))),
      reasonOrNotes: `${reason} — ${comments}`,
    });
  };

  const handleSaveOfflineFieldEntry = async (record: OfflineFieldRecord) => {
    await saveOfflineFieldRecord(record);
    const all = await getAllOfflineFieldRecords();
    setOfflineQueue(all);
    appendAudit({
      actorName: record.evaluatorName,
      actorRole: 'Field Instructor',
      actionType: 'FIELD_ENTRY_CREATED',
      studentId: record.studentId,
      studentName: record.studentName,
      evidenceUsed: [record.id, record.competencyName],
      reasonOrNotes: `Saved offline field activity "${record.title}" (${record.proficiency}/5) to IndexedDB queue.`,
    });
  };

  const handleSyncAllPending = async () => {
    const updatedQueue: OfflineFieldRecord[] = [];
    for (const item of offlineQueue) {
      if (item.syncStatus === 'Pending Sync') {
        const syncedItem: OfflineFieldRecord = { ...item, syncStatus: 'Synced' };
        await saveOfflineFieldRecord(syncedItem);
        updatedQueue.push(syncedItem);

        // Merge into main student state
        setStudents(prev =>
          prev.map(stu => {
            if (stu.id !== item.studentId) return stu;
            return {
              ...stu,
              demonstratedTechnicalSkills: Array.from(
                new Set([...stu.demonstratedTechnicalSkills, ...item.demonstratedSkills])
              ),
              practicalAssessments: [
                {
                  id: `A-${item.id}`,
                  title: item.title,
                  competency: item.competencyName,
                  proficiency: item.proficiency,
                  score: item.proficiency * 19,
                  evaluatorId: 'EVAL-FIELD',
                  evaluatorName: item.evaluatorName,
                  timestamp: item.createdAt.slice(0, 10),
                  observation: item.observationNotes,
                },
                ...stu.practicalAssessments,
              ],
              evidenceConfidence: Math.min(98, stu.evidenceConfidence + 6),
            };
          })
        );
      } else {
        updatedQueue.push(item);
      }
    }
    const refreshed = await getAllOfflineFieldRecords();
    setOfflineQueue(refreshed);
    appendAudit({
      actorName: 'Field Sync Daemon',
      actorRole: 'System Engine',
      actionType: 'FIELD_SYNC_COMPLETED',
      evidenceUsed: offlineQueue.filter(r => r.syncStatus === 'Pending Sync').map(r => r.id),
      reasonOrNotes: 'Synchronized pending IndexedDB field records with main application registry.',
    });
  };

  const handleResolveConflict = async (
    recordId: string,
    resolution: 'LOCAL' | 'SERVER' | 'MERGE',
    mergedSkills?: string[]
  ) => {
    const target = offlineQueue.find(r => r.id === recordId);
    if (!target) return;

    const resolvedRecord: OfflineFieldRecord = {
      ...target,
      syncStatus: 'Synced',
    };
    await saveOfflineFieldRecord(resolvedRecord);
    const refreshed = await getAllOfflineFieldRecords();
    setOfflineQueue(refreshed);

    setStudents(prev =>
      prev.map(stu => {
        if (stu.id !== target.studentId) return stu;
        const chosenSkills =
          resolution === 'LOCAL'
            ? target.localVersion.demonstratedTechnicalSkills || target.demonstratedSkills
            : resolution === 'SERVER'
            ? target.serverConflictVersion?.demonstratedTechnicalSkills || stu.demonstratedTechnicalSkills
            : mergedSkills || stu.demonstratedTechnicalSkills;

        return {
          ...stu,
          demonstratedTechnicalSkills: Array.from(new Set(chosenSkills)),
          lastUpdated: new Date().toISOString().slice(0, 10),
        };
      })
    );

    appendAudit({
      actorName: 'Lead Evaluator (Conflict Arbitration)',
      actorRole: 'Evaluator',
      actionType: 'CONFLICT_RESOLVED',
      studentId: target.studentId,
      studentName: target.studentName,
      evidenceUsed: [target.id],
      reasonOrNotes: `Resolved synchronization conflict using ${resolution} strategy.`,
    });
  };

  const handleSimulateConflict = async () => {
    const stu = students[0];
    const conflictRec: OfflineFieldRecord = {
      id: `FLD-${Math.floor(1000 + Math.random() * 8999)}`,
      studentId: stu.id,
      studentName: stu.name,
      evaluatorName: 'R. Chen (Mobile Field Unit)',
      activityType: 'Practical Assessment',
      title: 'Emergency Incident Response & Packet Containment Drill',
      description: 'Isolated compromised subnet and applied firewall drop rules.',
      competencyName: 'Security Incident Triage',
      proficiency: 5,
      demonstratedSkills: ['SIEM', 'Incident Response', 'Firewall Configuration', 'Linux'],
      projectType: 'Network Security',
      portfolioCategory: 'Incident Log',
      observationNotes: 'Offline evaluation conflicts with concurrent server update.',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      syncStatus: 'Conflict Detected',
      conflictReason: `Concurrent edit detected on ${stu.id}: Local offline tablet added SIEM & Incident Response skills while Server Registry modified assessment metadata.`,
      localVersion: {
        id: stu.id,
        name: stu.name,
        evidenceConfidence: 96,
        demonstratedTechnicalSkills: [...stu.demonstratedTechnicalSkills, 'SIEM', 'Incident Response'],
        evaluatorIdentity: 'R. Chen (Mobile Field Unit)',
        lastUpdated: 'Just Now (Local IndexedDB)',
      },
      serverConflictVersion: {
        id: stu.id,
        name: stu.name,
        evidenceConfidence: stu.evidenceConfidence,
        demonstratedTechnicalSkills: stu.demonstratedTechnicalSkills,
        evaluatorIdentity: stu.evaluatorIdentity,
        lastUpdated: stu.lastUpdated + ' (Server)',
      },
    };
    await saveOfflineFieldRecord(conflictRec);
    const refreshed = await getAllOfflineFieldRecords();
    setOfflineQueue(refreshed);
  };

  const startDemoScenario = () => {
    setDemoWalkthroughIdx(0);
    const first = DEMO_WALKTHROUGH_STEPS[0];
    if (first.studentId) setSelectedStudentId(first.studentId);
    setActivePage(first.page);
  };

  const stepDemoWalkthrough = (nextIdx: number) => {
    if (nextIdx < 0 || nextIdx >= DEMO_WALKTHROUGH_STEPS.length) {
      setDemoWalkthroughIdx(null);
      return;
    }
    setDemoWalkthroughIdx(nextIdx);
    const target = DEMO_WALKTHROUGH_STEPS[nextIdx];
    if (target.studentId) setSelectedStudentId(target.studentId);
    setActivePage(target.page);
  };

  const pendingSyncCount = offlineQueue.filter(r => r.syncStatus === 'Pending Sync').length;
  const conflictSyncCount = offlineQueue.filter(r => r.syncStatus === 'Conflict Detected').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* Top Bar Contract: Zone 1 Brand Wordmark | Zone 2 5 Primary Nav Links | Zone 3 2 Primary Actions */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <a
          href="#home"
          onClick={e => {
            e.preventDefault();
            setActivePage('home');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 font-display whitespace-nowrap"
        >
          SkillEvidence
        </a>

        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600">
          <button
            onClick={() => setActivePage('home')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
              activePage === 'home' ? 'text-teal-800 font-semibold underline underline-offset-4' : ''
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActivePage('student-profile')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
              activePage === 'student-profile'
                ? 'text-teal-800 font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Student Evidence
          </button>
          <button
            onClick={() => setActivePage('recommendations')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
              activePage === 'recommendations'
                ? 'text-teal-800 font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Recommendations
          </button>
          <button
            onClick={() => setActivePage('human-review')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
              activePage === 'human-review'
                ? 'text-teal-800 font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Human Review
          </button>
          <button
            onClick={() => setActivePage('experiment')}
            className={`hover:text-slate-900 transition-colors whitespace-nowrap ${
              activePage === 'experiment'
                ? 'text-teal-800 font-semibold underline underline-offset-4'
                : ''
            }`}
          >
            Experiments
          </button>
        </nav>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsOfflineMode(prev => !prev)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              isOfflineMode
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {isOfflineMode ? <WifiOff className="w-3.5 h-3.5 text-amber-700" /> : <Wifi className="w-3.5 h-3.5 text-emerald-700" />}
            {isOfflineMode ? 'Offline Field Mode' : 'Online'}
          </button>
          <button
            onClick={startDemoScenario}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap flex items-center gap-1.5"
          >
            <Play className="w-3.5 h-3.5" /> Demo Scenario
          </button>
        </div>
      </header>

      {/* Interactive End-to-End Demo Scenario Guided Bar (When Active) */}
      {demoWalkthroughIdx !== null && (
        <div className="bg-slate-900 text-white px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs">
            <span className="font-mono text-teal-400 font-semibold">
              END-TO-END DEMO SCENARIO [Step {demoWalkthroughIdx + 1} of {DEMO_WALKTHROUGH_STEPS.length}] —{' '}
              {DEMO_WALKTHROUGH_STEPS[demoWalkthroughIdx].title}:
            </span>{' '}
            <span className="text-slate-200 ml-1">
              {DEMO_WALKTHROUGH_STEPS[demoWalkthroughIdx].narration}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => stepDemoWalkthrough(demoWalkthroughIdx - 1)}
              disabled={demoWalkthroughIdx === 0}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded"
            >
              Previous Step
            </button>
            <button
              onClick={() => stepDemoWalkthrough(demoWalkthroughIdx + 1)}
              className="px-3 py-1 text-xs font-semibold bg-teal-600 hover:bg-teal-500 rounded"
            >
              {demoWalkthroughIdx + 1 < DEMO_WALKTHROUGH_STEPS.length
                ? 'Next Demo Step →'
                : 'Finish Walkthrough'}
            </button>
            <button
              onClick={() => setDemoWalkthroughIdx(null)}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Container: 260px Left Sidebar (All 17 Pages) + Main Viewport */}
      <div className="flex-1 flex">
        <aside className="w-64 shrink-0 bg-white border-r border-slate-200 p-4 hidden lg:flex flex-col justify-between">
          <div className="space-y-5">
            {NAV_GROUPS.map(group => (
              <div key={group.groupLabel}>
                <div className="text-[11px] font-semibold text-slate-400 px-2.5 mb-1.5">
                  {group.groupLabel}
                </div>
                <div className="space-y-0.5">
                  {group.items.map(item => {
                    const active = activePage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActivePage(item.id)}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between ${
                          active
                            ? 'bg-teal-50 text-teal-900 font-semibold'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {item.id === 'sync-conflict' && conflictSyncCount > 0 && (
                          <span className="font-mono text-[10px] text-amber-700 font-bold">
                            {conflictSyncCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Responsible AI Footer Notice inside Sidebar */}
          <div className="mt-6 pt-4 border-t border-slate-200 text-[11px] text-slate-500 leading-relaxed">
            <div className="font-semibold text-slate-700 mb-0.5">Responsible AI Notice</div>
            AI recommendations are decision-support outputs and must be validated by an authorized evaluator.
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
          {/* Mobile Page Selector */}
          <div className="lg:hidden bg-white border border-slate-200 rounded-md p-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Navigate Module (17 Pages):</span>
            <select
              value={activePage}
              onChange={e => setActivePage(e.target.value as AppPageId)}
              className="border border-slate-300 rounded px-2.5 py-1 text-xs bg-white text-slate-900"
            >
              {NAV_GROUPS.flatMap(g => g.items).map(it => (
                <option key={it.id} value={it.id}>
                  {it.label}
                </option>
              ))}
            </select>
          </div>

          {/* PAGE 1: HOME / OVERVIEW */}
          {activePage === 'home' && (
            <div className="space-y-6">
              {/* Responsible AI Decision-Support Notice */}
              <div className="bg-slate-900 text-white rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="text-xs text-teal-300 font-medium">
                    Vocational Competency & Traceable Career Recommendation System
                  </div>
                  <h1 className="text-2xl font-semibold mt-1">
                    SkillEvidence Career Recommender
                  </h1>
                  <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                    Recommends suitable vocational and technical career roles based primarily on demonstrated skills, workshop projects, practical assessments, and verified portfolios — never academic marks alone.
                  </p>
                  <div className="mt-2.5 text-[11px] text-amber-300 font-medium">
                    Notice: "AI recommendations are decision-support outputs and must be validated by an authorized evaluator."
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={startDemoScenario}
                    className="px-4 py-2.5 text-xs font-semibold bg-teal-600 hover:bg-teal-500 text-white rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" /> Run End-to-End Demo Scenario
                  </button>
                  <button
                    onClick={() => setActivePage('experiment')}
                    className="px-4 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors text-center"
                  >
                    View 520-Student Benchmark Experiment
                  </button>
                </div>
              </div>

              {/* Interactive End-to-End Pipeline Architecture Ribbon */}
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="text-xs font-semibold text-slate-900 mb-3">
                  Interactive End-to-End System Architecture (Click any stage to open module)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-9 gap-2 text-xs">
                  {[
                    { label: '1. Student Evidence', page: 'evidence-collection' as AppPageId },
                    { label: '2. Competency Extract', page: 'evidence-collection' as AppPageId },
                    { label: '3. Skill Profile', page: 'skill-profile' as AppPageId },
                    { label: '4. Role Matching', page: 'role-database' as AppPageId },
                    { label: '5. Explainable Rec', page: 'evidence-explanation' as AppPageId },
                    { label: '6. Human Validation', page: 'human-review' as AppPageId },
                    { label: '7. Audit Trail', page: 'audit-trail' as AppPageId },
                    { label: '8. Field Sync & Feedback', page: 'stakeholder-feedback' as AppPageId },
                    { label: '9. Evaluation', page: 'experiment' as AppPageId },
                  ].map((stage, i) => (
                    <button
                      key={i}
                      onClick={() => setActivePage(stage.page)}
                      className="p-2.5 border border-slate-200 rounded hover:border-teal-600 hover:bg-teal-50/40 text-left transition-colors"
                    >
                      <div className="font-semibold text-slate-900">{stage.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Required Demo Students Showcase (Students A, B, C, D, E + Edge Case F) */}
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">
                      Benchmark Demo Students — Why Demonstrated Evidence Beats Academic Marks
                    </h2>
                    <p className="text-xs text-slate-500">
                      Click any demo student to load their evidence, inspect top 3 career matches, and compare against the marks-only baseline
                    </p>
                  </div>
                  <button
                    onClick={() => setActivePage('students')}
                    className="text-xs font-semibold text-teal-700 hover:underline"
                  >
                    Open Full Student Directory ({students.length}) →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students.slice(0, 6).map(stu => {
                    const recs = evaluateStudentForRoles(stu, roles, weights);
                    const base = evaluateBaselineForRoles(stu, roles);
                    const topR = recs[0];
                    const topB = base[0];
                    return (
                      <div
                        key={stu.id}
                        className="border border-slate-200 rounded-lg p-4 flex flex-col justify-between hover:border-teal-600 transition-colors"
                      >
                        <div>
                          <div className="flex items-center justify-between text-xs text-slate-500 font-mono">
                            <span>{stu.id}</span>
                            <span>Marks: {stu.academicMarks}%</span>
                          </div>
                          <h3 className="text-base font-semibold text-slate-900 mt-1">{stu.name}</h3>
                          <p className="text-xs text-teal-800 font-medium mt-0.5">{stu.demoLabel}</p>

                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Skill-Evidence Top Match:</span>
                              <span className="font-semibold text-slate-900 font-mono">
                                {topR?.roleTitle} ({topR?.overallCompatibilityScore}%)
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Marks+Interest Baseline:</span>
                              <span className="text-slate-600 font-mono">
                                {topB?.roleTitle} ({topB?.baselineScore}%)
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Confidence Status:</span>
                              <span className="font-medium text-slate-800">{topR?.confidenceStatus}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                          <button
                            onClick={() => {
                              setSelectedStudentId(stu.id);
                              setActivePage('student-profile');
                            }}
                            className="text-xs font-semibold text-teal-700 hover:underline"
                          >
                            Inspect Profile
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStudentId(stu.id);
                              setActivePage('evidence-explanation');
                            }}
                            className="px-2.5 py-1 text-xs font-medium bg-slate-900 text-white rounded hover:bg-slate-800"
                          >
                            Evidence Breakdown
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* PAGE 2: STUDENT MANAGEMENT */}
          {activePage === 'students' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500">Institute Candidate Directory</div>
                  <h1 className="text-2xl font-semibold text-slate-900 mt-0.5">
                    Student Management ({students.length} Records)
                  </h1>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    placeholder="Search by name, ID, or skill..."
                    value={studentSearch}
                    onChange={e => setStudentSearch(e.target.value)}
                    className="border border-slate-300 rounded-md px-3 py-1.5 text-xs bg-white text-slate-900"
                  />
                  <button
                    onClick={() => {
                      const csv = exportStudentsToCSV(students);
                      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'skillevidence_students.csv';
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-3 py-1.5 text-xs font-semibold border border-slate-300 rounded-md hover:bg-slate-50 flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" /> Export CSV
                  </button>
                  <button
                    onClick={() => {
                      const batch = generateSyntheticDataset(10, roles, Date.now());
                      setStudents(prev => [...prev, ...batch]);
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-teal-700 text-white rounded-md hover:bg-teal-800"
                  >
                    + Generate 10 Synthetic Students
                  </button>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                        <th className="py-3 px-4">Student ID & Name</th>
                        <th className="py-3 px-3 text-right">Academic Marks</th>
                        <th className="py-3 px-3">Demonstrated Technical Skills</th>
                        <th className="py-3 px-3 text-right">Artifacts</th>
                        <th className="py-3 px-3">Top Evidence Match</th>
                        <th className="py-3 px-3">Human Validation</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {students
                        .filter(
                          s =>
                            !studentSearch ||
                            s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                            s.id.toLowerCase().includes(studentSearch.toLowerCase()) ||
                            s.demonstratedTechnicalSkills.some(sk =>
                              sk.toLowerCase().includes(studentSearch.toLowerCase())
                            )
                        )
                        .slice(0, 50)
                        .map(stu => {
                          const topRec = evaluateStudentForRoles(stu, roles, weights)[0];
                          return (
                            <tr key={stu.id} className="hover:bg-slate-50">
                              <td className="py-3 px-4">
                                <div className="font-semibold text-slate-900">
                                  {stu.id} — {stu.name}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {stu.demoLabel || stu.cohort}
                                </div>
                              </td>
                              <td className="py-3 px-3 text-right font-mono tabular-nums">
                                {stu.academicMarks}%
                              </td>
                              <td className="py-3 px-3 text-slate-700 max-w-xs truncate">
                                {stu.demonstratedTechnicalSkills.join(' · ') || 'None'}
                              </td>
                              <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-700">
                                {stu.projects.length}P / {stu.practicalAssessments.length}A / {stu.portfolio.length}PF
                              </td>
                              <td className="py-3 px-3 font-mono tabular-nums">
                                <span className="font-sans font-semibold text-teal-800">
                                  {topRec?.roleTitle}
                                </span>{' '}
                                ({topRec?.overallCompatibilityScore}%)
                              </td>
                              <td className="py-3 px-3">
                                {stu.humanValidation ? (
                                  <span className="font-semibold text-emerald-700">
                                    {stu.humanValidation.status}
                                  </span>
                                ) : (
                                  <span className="text-slate-500">Pending Review</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  onClick={() => {
                                    setSelectedStudentId(stu.id);
                                    setActivePage('student-profile');
                                  }}
                                  className="px-2.5 py-1 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-800"
                                >
                                  Open Profile
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
          )}

          {/* PAGE 3: STUDENT PROFILE */}
          {activePage === 'student-profile' && (
            <StudentProfileView
              selectedStudent={selectedStudent}
              students={students}
              onSelectStudent={setSelectedStudentId}
              recommendations={activeRecommendations}
              baselineRecommendations={activeBaselineRecommendations}
              onNavigate={setActivePage}
              onAddEvidence={() => {}}
            />
          )}

          {/* PAGE 4: EVIDENCE COLLECTION */}
          {activePage === 'evidence-collection' && (
            <EvidenceCollectionView
              selectedStudent={selectedStudent}
              students={students}
              onSelectStudent={setSelectedStudentId}
              onAddOrUpdateStudent={updated => {
                setStudents(prev => prev.map(s => (s.id === updated.id ? updated : s)));
                appendAudit({
                  actorName: 'M. Kowalski',
                  actorRole: 'Evaluator',
                  actionType: 'DATA_MODIFICATION',
                  studentId: updated.id,
                  studentName: updated.name,
                  evidenceUsed: updated.projects.map(p => p.id),
                  reasonOrNotes: 'Added verified workshop project and extracted technical competencies.',
                });
              }}
            />
          )}

          {/* PAGE 5: SKILL & COMPETENCY PROFILE */}
          {activePage === 'skill-profile' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500">Extracted Competency & Proficiency Matrix</div>
                  <h1 className="text-2xl font-semibold text-slate-900 mt-0.5">
                    Skill & Competency Profile — {selectedStudent.name}
                  </h1>
                </div>
                <select
                  value={selectedStudent.id}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white text-slate-900"
                >
                  {students.slice(0, 30).map(s => (
                    <option key={s.id} value={s.id}>
                      {s.id} — {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                  <h2 className="text-base font-semibold text-slate-900 mb-2">
                    Multi-Dimensional Competency Radar
                  </h2>
                  <CompetencyRadarSVG student={selectedStudent} />
                </div>

                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                  <h2 className="text-base font-semibold text-slate-900">
                    Assessed Competency Proficiency Matrix (1–5 Vocational Scale)
                  </h2>
                  {selectedStudent.practicalAssessments.length === 0 ? (
                    <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-4 rounded">
                      No practical assessments on file for {selectedStudent.name}. Confidence is automatically reduced.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
                      {selectedStudent.practicalAssessments.map(a => (
                        <div key={a.id} className="p-3.5 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-slate-900">
                              {a.competency} <span className="font-mono text-slate-500">[{a.id}]</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              {a.title} · Evaluated by {a.evaluatorName}
                            </div>
                          </div>
                          <div className="text-right font-mono tabular-nums">
                            <div className="text-sm font-semibold text-teal-800">
                              Level {a.proficiency} / 5
                            </div>
                            <div className="text-[11px] text-slate-500">Bench Score: {a.score}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-200">
                    <h3 className="text-xs font-semibold text-slate-900 mb-1.5">
                      Verified Technical Skills & Traceable Sources
                    </h3>
                    <div className="text-xs text-slate-700 leading-relaxed">
                      {selectedStudent.demonstratedTechnicalSkills.join(' · ') || 'No verified technical skills'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PAGE 6: CAREER RECOMMENDATIONS */}
          {activePage === 'recommendations' && (
            <RecommendationsComparisonView
              selectedStudent={selectedStudent}
              students={students}
              onSelectStudent={setSelectedStudentId}
              recommendations={activeRecommendations}
              baselineRecommendations={activeBaselineRecommendations}
              weights={weights}
              roles={roles}
              onNavigate={setActivePage}
              onApproveOrOverride={handleApproveOrOverride}
            />
          )}

          {/* PAGE 7: EVIDENCE EXPLANATION */}
          {activePage === 'evidence-explanation' && (
            <EvidenceExplanationView
              selectedStudent={selectedStudent}
              students={students}
              onSelectStudent={setSelectedStudentId}
              recommendations={activeRecommendations}
              baselineRecommendations={activeBaselineRecommendations}
              weights={weights}
              roles={roles}
              onNavigate={setActivePage}
              onApproveOrOverride={handleApproveOrOverride}
            />
          )}

          {/* PAGE 8: HUMAN REVIEW */}
          {activePage === 'human-review' && (
            <HumanReviewView
              selectedStudent={selectedStudent}
              students={students}
              onSelectStudent={setSelectedStudentId}
              recommendations={activeRecommendations}
              roles={roles}
              auditLogs={auditLogs}
              onApproveOrOverride={handleApproveOrOverride}
            />
          )}

          {/* PAGE 9: AUDIT TRAIL */}
          {activePage === 'audit-trail' && <AuditTrailView auditLogs={auditLogs} />}

          {/* PAGE 10: OFFLINE FIELD MODE */}
          {activePage === 'offline-field' && (
            <OfflineFieldModeView
              students={students}
              roles={roles}
              weights={weights}
              isOfflineMode={isOfflineMode}
              onToggleOfflineMode={() => setIsOfflineMode(prev => !prev)}
              offlineQueue={offlineQueue}
              onSaveOfflineFieldEntry={handleSaveOfflineFieldEntry}
              onSyncAllPending={handleSyncAllPending}
              onResolveConflict={handleResolveConflict}
              onSimulateConflict={handleSimulateConflict}
            />
          )}

          {/* PAGE 11: SYNC & CONFLICT RESOLUTION */}
          {activePage === 'sync-conflict' && (
            <SyncAndConflictResolutionView
              students={students}
              roles={roles}
              weights={weights}
              isOfflineMode={isOfflineMode}
              onToggleOfflineMode={() => setIsOfflineMode(prev => !prev)}
              offlineQueue={offlineQueue}
              onSaveOfflineFieldEntry={handleSaveOfflineFieldEntry}
              onSyncAllPending={handleSyncAllPending}
              onResolveConflict={handleResolveConflict}
              onSimulateConflict={handleSimulateConflict}
            />
          )}

          {/* PAGE 12: CAREER ROLE DATABASE */}
          {activePage === 'role-database' && (
            <CareerRoleDatabaseView
              roles={roles}
              onSaveRole={(roleObj, isNew) => {
                if (isNew) {
                  setRoles(prev => [roleObj, ...prev]);
                } else {
                  setRoles(prev => prev.map(r => (r.id === roleObj.id ? roleObj : r)));
                }
                appendAudit({
                  actorName: 'Administrator',
                  actorRole: 'Administrator',
                  actionType: 'ROLE_REQUIREMENT_MODIFIED',
                  evidenceUsed: roleObj.requiredSkills,
                  reasonOrNotes: `${isNew ? 'Added' : 'Modified'} career role "${roleObj.title}" (${roleObj.id}).`,
                });
              }}
            />
          )}

          {/* PAGE 13: EXPERIMENT / EVALUATION */}
          {activePage === 'experiment' && (
            <ExperimentEvaluationView
              roles={roles}
              weights={weights}
              students={students}
              onLoadSyntheticCohortIntoApp={newCohort => setStudents(newCohort)}
              onSelectStudentAndInspect={id => {
                setSelectedStudentId(id);
                setActivePage('student-profile');
              }}
              feedbackEntries={feedbackEntries}
              onAddFeedback={() => {}}
            />
          )}

          {/* PAGE 14: FAILURE MODE ANALYSIS */}
          {activePage === 'failure-analysis' && (
            <FailureModeAnalysisView
              onSelectStudentAndInspect={id => {
                setSelectedStudentId(id);
                setActivePage('student-profile');
              }}
            />
          )}

          {/* PAGE 15: RISK ANALYSIS */}
          {activePage === 'risk-analysis' && <RiskAnalysisView />}

          {/* PAGE 16: STAKEHOLDER FEEDBACK */}
          {activePage === 'stakeholder-feedback' && (
            <StakeholderFeedbackView
              feedbackEntries={feedbackEntries}
              onAddFeedback={newFb => {
                const entry: StakeholderFeedbackEntry = {
                  ...newFb,
                  id: `FB-0${feedbackEntries.length + 1}`,
                  timestamp: new Date().toISOString().slice(0, 10),
                  isDemoSample: false,
                };
                setFeedbackEntries(prev => [entry, ...prev]);
              }}
            />
          )}

          {/* PAGE 17: ADMIN SETTINGS */}
          {activePage === 'admin-settings' && (
            <AdminSettingsView
              weights={weights}
              onUpdateWeights={newW => {
                setWeights(newW);
                appendAudit({
                  actorName: 'Administrator',
                  actorRole: 'Administrator',
                  actionType: 'WEIGHTS_MODIFIED',
                  evidenceUsed: [
                    `Skills:${newW.technicalSkills}%`,
                    `Comp:${newW.assessedCompetencies}%`,
                    `Proj:${newW.projectEvidence}%`,
                  ],
                  reasonOrNotes: 'Modified multi-factor scoring weights in Admin Settings.',
                });
              }}
              onImportDataset={imported => {
                setStudents(prev => [...imported, ...prev]);
              }}
              onGenerateSyntheticCohort={count => {
                const syn = generateSyntheticDataset(count, roles, Date.now());
                setStudents(prev => [...prev, ...syn]);
              }}
              studentsCount={students.length}
            />
          )}
        </main>
      </div>
    </div>
  );
}
