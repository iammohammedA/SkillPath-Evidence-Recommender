import React, { useState } from 'react';
import {
  StudentRecord,
  OfflineFieldRecord,
  ProficiencyLevel,
  CareerRole,
  RecommendationWeights,
} from '../types';
import { evaluateStudentForRoles } from '../utils/recommendationEngine';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2, Database, Layers } from 'lucide-react';

interface OfflineFieldAndSyncProps {
  students: StudentRecord[];
  roles: CareerRole[];
  weights: RecommendationWeights;
  isOfflineMode: boolean;
  onToggleOfflineMode: () => void;
  offlineQueue: OfflineFieldRecord[];
  onSaveOfflineFieldEntry: (record: OfflineFieldRecord) => Promise<void>;
  onSyncAllPending: () => Promise<void>;
  onResolveConflict: (
    recordId: string,
    resolution: 'LOCAL' | 'SERVER' | 'MERGE',
    mergedSkills?: string[]
  ) => Promise<void>;
  onSimulateConflict: () => Promise<void>;
}

const WORKFLOW_STEPS = [
  { step: 1, title: 'Open Field Mode', desc: 'Instructor switches to low-bandwidth IndexedDB mode' },
  { step: 2, title: 'Select Student', desc: 'Load cached candidate profile offline' },
  { step: 3, title: 'Record Practical Activity', desc: 'Log workshop lab or project benchmark' },
  { step: 4, title: 'Select Competency', desc: 'Bind activity to vocational competency standard' },
  { step: 5, title: 'Assign Proficiency', desc: 'Grade demonstrated level (1-5 scale)' },
  { step: 6, title: 'Add Observation', desc: 'Capture behavioural & diagnostic notes' },
  { step: 7, title: 'Add Project/Evidence', desc: 'Attach demonstrated technical skills & tools' },
  { step: 8, title: 'Save Locally', desc: 'Persist transaction in browser IndexedDB' },
  { step: 9, title: 'System Validates', desc: 'Verify schema & evidence completeness' },
  { step: 10, title: 'Update Skill Profile', desc: 'Recalculate offline career compatibility' },
  { step: 11, title: 'Enter Sync Queue', desc: 'Stage record for upstream replication' },
  { step: 12, title: 'Synchronize', desc: 'Push queued records when connectivity returns' },
  { step: 13, title: 'Evaluator Review', desc: 'Lead assessor inspects updated recommendation' },
  { step: 14, title: 'Approve / Override', desc: 'Human validation finalized' },
  { step: 15, title: 'Audit Record Created', desc: 'Immutable log committed' },
];

export const OfflineFieldModeView: React.FC<OfflineFieldAndSyncProps> = ({
  students,
  roles,
  weights,
  isOfflineMode,
  onToggleOfflineMode,
  offlineQueue,
  onSaveOfflineFieldEntry,
  onSyncAllPending,
}) => {
  const [studentId, setStudentId] = useState(students[0]?.id || 'STU-101');
  const [evaluatorName, setEvaluatorName] = useState('H. Lindqvist (Field Tablet #04)');
  const [activityType, setActivityType] = useState<OfflineFieldRecord['activityType']>('Practical Assessment');
  const [title, setTitle] = useState('Three-Phase Motor Fault Isolation & Thermal Overload Test');
  const [description, setDescription] = useState(
    'Student isolated phase-to-ground fault using digital multimeter, replaced thermal overload relay, and verified LOTO compliance.'
  );
  const [competencyName, setCompetencyName] = useState('Electrical Fault Diagnostics');
  const [proficiency, setProficiency] = useState<ProficiencyLevel>(5);
  const [skillsInput, setSkillsInput] = useState(
    'Multimeter Diagnostics, Three-Phase Wiring, Motor Controls, Safety Lockout/Tagout'
  );
  const [projectType, setProjectType] = useState('Electrical Wiring');
  const [portfolioCategory, setPortfolioCategory] = useState('Wiring Schematic');
  const [observationNotes, setObservationNotes] = useState(
    'Demonstrated calm, methodical fault isolation under timed workshop conditions.'
  );
  const [activeWorkflowStep, setActiveWorkflowStep] = useState<number>(8);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const targetStudent = students.find(s => s.id === studentId) || students[0];

  // Calculate live offline recommendation preview including the staged skills
  const stagedSkills = skillsInput
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const previewStudent: StudentRecord = {
    ...targetStudent,
    demonstratedTechnicalSkills: Array.from(
      new Set([...targetStudent.demonstratedTechnicalSkills, ...stagedSkills])
    ),
    practicalAssessments: [
      ...targetStudent.practicalAssessments,
      {
        id: 'OFFLINE-PREVIEW',
        title,
        competency: competencyName,
        proficiency,
        score: proficiency * 20,
        evaluatorId: 'EVAL-FIELD',
        evaluatorName,
        timestamp: 'Now (Offline Preview)',
        observation: observationNotes,
      },
    ],
  };

  const offlinePreviewRecs = evaluateStudentForRoles(previewStudent, roles, weights);

  const handleSaveToIndexedDB = async (e: React.FormEvent) => {
    e.preventDefault();
    const newRecord: OfflineFieldRecord = {
      id: `FLD-${Math.floor(1000 + Math.random() * 9000)}`,
      studentId: targetStudent.id,
      studentName: targetStudent.name,
      evaluatorName,
      activityType,
      title,
      description,
      competencyName,
      proficiency,
      demonstratedSkills: stagedSkills,
      projectType,
      portfolioCategory,
      observationNotes,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      syncStatus: 'Pending Sync',
      localVersion: {
        id: targetStudent.id,
        name: targetStudent.name,
        evidenceConfidence: Math.min(98, targetStudent.evidenceConfidence + 8),
        demonstratedTechnicalSkills: previewStudent.demonstratedTechnicalSkills,
        evaluatorIdentity: evaluatorName,
        lastUpdated: `${new Date().toISOString().slice(0, 19)} (Local IndexedDB)`,
      },
    };

    await onSaveOfflineFieldEntry(newRecord);
    setActiveWorkflowStep(11);
    setSavedFeedback(
      `Saved ${newRecord.id} to browser IndexedDB. Offline recommendation engine recalculated ${targetStudent.name}'s top match as ${offlinePreviewRecs[0]?.roleTitle} (${offlinePreviewRecs[0]?.overallCompatibilityScore}%).`
    );
  };

  const pendingCount = offlineQueue.filter(r => r.syncStatus === 'Pending Sync').length;
  const conflictCount = offlineQueue.filter(r => r.syncStatus === 'Conflict Detected').length;

  return (
    <div className="space-y-6">
      {/* Top Connectivity & IndexedDB Status Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-900">IndexedDB Field Persistence Engine</span>
            <span>·</span>
            <span className={isOfflineMode ? 'text-amber-700 font-semibold' : 'text-emerald-700 font-semibold'}>
              {isOfflineMode ? 'OFFLINE WORKSHOP MODE ACTIVE' : 'ONLINE — CONNECTED TO MAIN REGISTRY'}
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-0.5">
            Offline / Low-Bandwidth Field Data Collection
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Designed for vocational instructors assessing practical lab work in shielded workshops or remote field sites
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onToggleOfflineMode}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md flex items-center gap-2 transition-colors ${
              isOfflineMode
                ? 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
            }`}
          >
            {isOfflineMode ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            {isOfflineMode ? 'Simulate Reconnect (Go Online)' : 'Simulate Field Disconnect (Go Offline)'}
          </button>
          <button
            onClick={onSyncAllPending}
            disabled={isOfflineMode || pendingCount === 0}
            className="px-3.5 py-2 text-xs font-semibold bg-teal-700 text-white rounded-md hover:bg-teal-800 disabled:bg-slate-300 disabled:text-slate-500 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Queue ({pendingCount} Pending)
          </button>
        </div>
      </div>

      {savedFeedback && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg p-3.5 text-xs font-medium">
          ✓ {savedFeedback}
        </div>
      )}

      {/* 15-Step Visual Field-Workflow Map (Requirement Section 12) */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">
            15-Stage Vocational Field-to-Audit Workflow Map
          </h2>
          <span className="text-xs text-slate-500 font-mono">
            Click any stage to inspect protocol · Active Stage: #{activeWorkflowStep}
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {WORKFLOW_STEPS.map(s => {
            const isDone = s.step <= activeWorkflowStep;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => setActiveWorkflowStep(s.step)}
                className={`text-left p-2.5 rounded border text-xs transition-colors ${
                  isDone
                    ? 'border-teal-600 bg-teal-50/50 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <div className="font-mono font-semibold text-[11px] text-teal-800">
                  Step {String(s.step).padStart(2, '0')}
                </div>
                <div className="font-semibold text-slate-900 mt-0.5 truncate">{s.title}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{s.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Entry Form + Offline Recommendation Engine Calculation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <form
          onSubmit={handleSaveToIndexedDB}
          className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <h2 className="text-base font-semibold text-slate-900">
            Record Practical Field Evidence (Persisted Locally in IndexedDB)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Step 2: Select Student
              </label>
              <select
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-xs bg-white text-slate-900"
              >
                {students.slice(0, 20).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.id} — {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Field Instructor / Device Identity
              </label>
              <input
                type="text"
                value={evaluatorName}
                onChange={e => setEvaluatorName(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-xs bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Step 3: Practical Activity Type
              </label>
              <select
                value={activityType}
                onChange={e => setActivityType(e.target.value as any)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-xs bg-white text-slate-900"
              >
                <option value="Practical Assessment">Practical Assessment</option>
                <option value="Project Artifact">Project Artifact</option>
                <option value="Portfolio Evidence">Portfolio Metadata</option>
                <option value="Behaviour Observation">Behaviour Observation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Step 4: Demonstrated Competency
              </label>
              <select
                value={competencyName}
                onChange={e => setCompetencyName(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-xs bg-white text-slate-900"
              >
                <option value="Electrical Fault Diagnostics">Electrical Fault Diagnostics</option>
                <option value="Three-Phase Power Wiring">Three-Phase Power Wiring</option>
                <option value="PLC Ladder Logic Programming">PLC Ladder Logic Programming</option>
                <option value="Linux System Administration">Linux System Administration</option>
                <option value="Network Traffic Analysis">Network Traffic Analysis</option>
                <option value="3D Parametric CAD Modeling">3D Parametric CAD Modeling</option>
                <option value="Edge Sensor Telemetry Integration">Edge Sensor Telemetry Integration</option>
                <option value="Full-Stack Web Development">Full-Stack Web Development</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Step 5: Proficiency Level (1–5)
              </label>
              <select
                value={proficiency}
                onChange={e => setProficiency(Number(e.target.value) as ProficiencyLevel)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-xs bg-white text-slate-900"
              >
                <option value={1}>1 — Novice</option>
                <option value={2}>2 — Beginner</option>
                <option value={3}>3 — Competent</option>
                <option value={4}>4 — Proficient</option>
                <option value={5}>5 — Advanced Mastery</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Activity / Project Artifact Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-xs bg-white text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Step 7: Demonstrated Technical Skills (Comma-separated)
            </label>
            <input
              type="text"
              value={skillsInput}
              onChange={e => setSkillsInput(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-xs bg-white text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Step 6: Instructor Observation & Practical Notes
            </label>
            <textarea
              rows={2}
              value={observationNotes}
              onChange={e => setObservationNotes(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-xs bg-white text-slate-900"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500">
              Storage Engine: Browser <code className="font-mono">IndexedDB (SkillEvidenceFieldDB)</code>
            </span>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-teal-700 text-white rounded-md hover:bg-teal-800 transition-colors"
            >
              Step 8: Save Locally to IndexedDB Queue
            </button>
          </div>
        </form>

        {/* Step 10: Real-Time Offline Recommendation Calculation Preview */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-500">Step 10: Local Client-Side Calculation</div>
            <h2 className="text-base font-semibold text-slate-900 mt-0.5">
              Offline Skill Profile & Role Recalculation
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Runs deterministic scoring directly in the browser without requiring cloud connectivity:
            </p>

            <div className="mt-4 divide-y divide-slate-200 border border-slate-200 rounded-md">
              {offlinePreviewRecs.slice(0, 4).map((r, i) => (
                <div key={r.roleId} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      0{i + 1}. {r.roleTitle}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Skills: {r.skillMatchScore}% · Comp: {r.competencyMatchScore}%
                    </div>
                  </div>
                  <div className="text-sm font-mono tabular-nums font-semibold text-teal-800">
                    {r.overallCompatibilityScore}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 text-xs space-y-1 text-slate-600">
            <div className="font-semibold text-slate-900">IndexedDB Queue Summary:</div>
            <div>Pending Sync Records: <span className="font-mono font-semibold">{pendingCount}</span></div>
            <div>Conflicts Requiring Resolution: <span className="font-mono font-semibold text-amber-700">{conflictCount}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const SyncAndConflictResolutionView: React.FC<OfflineFieldAndSyncProps> = ({
  isOfflineMode,
  onToggleOfflineMode,
  offlineQueue,
  onSyncAllPending,
  onResolveConflict,
  onSimulateConflict,
}) => {
  const [customMergedSkills, setCustomMergedSkills] = useState<Record<string, string>>({});
  const [resolutionBanner, setResolutionBanner] = useState<string | null>(null);

  const conflicts = offlineQueue.filter(r => r.syncStatus === 'Conflict Detected');

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">Field-to-Registry Replication & Conflict Arbitration</div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-0.5">
            Synchronization Queue & Conflict Resolution
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onSimulateConflict}
            className="px-3 py-2 text-xs font-medium border border-slate-300 bg-white text-slate-800 rounded-md hover:bg-slate-50 transition-colors"
          >
            + Simulate Concurrent Evaluator Conflict
          </button>
          <button
            onClick={async () => {
              await onSyncAllPending();
              setResolutionBanner('Synchronized all non-conflicting pending field records with main registry.');
            }}
            disabled={isOfflineMode}
            className="px-3.5 py-2 text-xs font-semibold bg-teal-700 text-white rounded-md hover:bg-teal-800 disabled:bg-slate-300 transition-colors"
          >
            Synchronize All Pending Records
          </button>
        </div>
      </div>

      {isOfflineMode && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 flex items-center justify-between">
          <div className="text-xs text-amber-900">
            <span className="font-semibold">Offline Mode Active: </span>
            Records are safely persisted in IndexedDB. Reconnect to synchronize with the central registry.
          </div>
          <button
            onClick={onToggleOfflineMode}
            className="px-3 py-1.5 text-xs font-semibold bg-amber-700 text-white rounded hover:bg-amber-800"
          >
            Go Online Now
          </button>
        </div>
      )}

      {resolutionBanner && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg p-3.5 text-xs font-medium">
          ✓ {resolutionBanner}
        </div>
      )}

      {/* Active Version Conflicts Interface */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-slate-900">
          Active Concurrent Modification Conflicts ({conflicts.length})
        </h2>

        {conflicts.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-xs text-slate-500">
            No active synchronization conflicts. All field records are clean or resolved. Click "+ Simulate Concurrent Evaluator Conflict" to test 3-way resolution.
          </div>
        ) : (
          conflicts.map(conf => {
            const localSkills = conf.localVersion.demonstratedTechnicalSkills || conf.demonstratedSkills;
            const serverSkills = conf.serverConflictVersion?.demonstratedTechnicalSkills || [];
            const defaultUnion = Array.from(new Set([...localSkills, ...serverSkills])).join(', ');
            const mergeInputVal =
              customMergedSkills[conf.id] !== undefined ? customMergedSkills[conf.id] : defaultUnion;

            return (
              <div key={conf.id} className="bg-white border border-amber-300 rounded-lg p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-xs font-mono font-semibold text-amber-800">
                      CONFLICT [{conf.id}] · Student {conf.studentId} ({conf.studentName})
                    </span>
                    <p className="text-xs text-slate-600 mt-0.5">{conf.conflictReason}</p>
                  </div>
                  <span className="text-xs font-semibold text-amber-800">Requires Human Resolution</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Local Version Card */}
                  <div className="border border-slate-200 rounded-md p-4 bg-slate-50/60">
                    <div className="text-xs font-semibold text-slate-900">
                      Local Version (IndexedDB Field Device)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Evaluator: {conf.localVersion.evaluatorIdentity} · {conf.localVersion.lastUpdated}
                    </div>
                    <div className="text-xs text-slate-800 mt-2">
                      <span className="font-medium">Activity:</span> {conf.title} ({conf.competencyName} — {conf.proficiency}/5)
                    </div>
                    <div className="text-xs text-slate-800 mt-1">
                      <span className="font-medium">Demonstrated Skills:</span> {localSkills.join(', ')}
                    </div>
                    <div className="text-xs font-mono text-teal-800 mt-1">
                      Evidence Confidence: {conf.localVersion.evidenceConfidence}%
                    </div>
                  </div>

                  {/* Server Version Card */}
                  <div className="border border-slate-200 rounded-md p-4 bg-slate-50/60">
                    <div className="text-xs font-semibold text-slate-900">
                      Server Version (Main Institute Registry)
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Evaluator: {conf.serverConflictVersion?.evaluatorIdentity} · {conf.serverConflictVersion?.lastUpdated}
                    </div>
                    <div className="text-xs text-slate-800 mt-2">
                      <span className="font-medium">Activity:</span> Prior baseline assessment on main server
                    </div>
                    <div className="text-xs text-slate-800 mt-1">
                      <span className="font-medium">Demonstrated Skills:</span> {serverSkills.join(', ')}
                    </div>
                    <div className="text-xs font-mono text-slate-700 mt-1">
                      Evidence Confidence: {conf.serverConflictVersion?.evidenceConfidence}%
                    </div>
                  </div>
                </div>

                {/* Manual Merge Editor & 3 Resolution Buttons */}
                <div className="pt-2 border-t border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Manual Merge Skill Set (Used when clicking "Merge Manually"):
                    </label>
                    <input
                      type="text"
                      value={mergeInputVal}
                      onChange={e =>
                        setCustomMergedSkills(prev => ({ ...prev, [conf.id]: e.target.value }))
                      }
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs bg-white text-slate-900"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        await onResolveConflict(conf.id, 'LOCAL');
                        setResolutionBanner(
                          `Resolved conflict ${conf.id} for ${conf.studentName} using Local Field Version.`
                        );
                      }}
                      className="px-3.5 py-2 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
                    >
                      Choose Local Version
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await onResolveConflict(conf.id, 'SERVER');
                        setResolutionBanner(
                          `Resolved conflict ${conf.id} for ${conf.studentName} by retaining Server Version.`
                        );
                      }}
                      className="px-3.5 py-2 text-xs font-semibold border border-slate-300 bg-white text-slate-800 rounded hover:bg-slate-50 transition-colors"
                    >
                      Choose Server Version
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const skills = mergeInputVal
                          .split(',')
                          .map(s => s.trim())
                          .filter(Boolean);
                        await onResolveConflict(conf.id, 'MERGE', skills);
                        setResolutionBanner(
                          `Merged Local + Server versions for ${conf.studentName} (${skills.length} combined skills) and logged audit record.`
                        );
                      }}
                      className="px-3.5 py-2 text-xs font-semibold bg-teal-700 text-white rounded hover:bg-teal-800 transition-colors"
                    >
                      Merge Manually (Union Both)
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Complete IndexedDB Sync Queue Table */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          IndexedDB Field Persistence Log ({offlineQueue.length} Total Records)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-3">Record ID</th>
                <th className="py-2 px-3">Student</th>
                <th className="py-2 px-3">Activity & Competency</th>
                <th className="py-2 px-3">Demonstrated Skills</th>
                <th className="py-2 px-3">Field Evaluator</th>
                <th className="py-2 pl-3 text-right">Sync Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {offlineQueue.map(rec => (
                <tr key={rec.id}>
                  <td className="py-2.5 pr-3 font-mono font-semibold text-slate-900">
                    {rec.id}
                    <div className="text-[11px] font-normal text-slate-500">{rec.createdAt}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900">{rec.studentName}</div>
                    <div className="font-mono text-[11px] text-slate-500">{rec.studentId}</div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-slate-900">{rec.title}</div>
                    <div className="text-[11px] text-slate-500">
                      {rec.competencyName} (Level {rec.proficiency}/5)
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{rec.demonstratedSkills.join(', ')}</td>
                  <td className="py-2.5 px-3 text-slate-600">{rec.evaluatorName}</td>
                  <td className="py-2.5 pl-3 text-right font-mono font-semibold">
                    <span
                      className={
                        rec.syncStatus === 'Synced'
                          ? 'text-emerald-700'
                          : rec.syncStatus === 'Conflict Detected'
                          ? 'text-amber-700'
                          : 'text-teal-700'
                      }
                    >
                      {rec.syncStatus}
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
};
