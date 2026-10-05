import React, { useState } from 'react';
import {
  StudentRecord,
  RoleRecommendationResult,
  CareerRole,
  AuditLogEntry,
} from '../types';
import { CheckCircle2, AlertTriangle, ShieldAlert, UserCheck, Filter } from 'lucide-react';

interface HumanReviewAuditProps {
  selectedStudent: StudentRecord;
  students: StudentRecord[];
  onSelectStudent: (id: string) => void;
  recommendations: RoleRecommendationResult[];
  roles: CareerRole[];
  auditLogs: AuditLogEntry[];
  onApproveOrOverride: (
    studentId: string,
    decision: 'Approved' | 'Modified / Overridden' | 'Rejected' | 'More Evidence Requested',
    finalRoleId: string,
    evaluatorName: string,
    reason: string,
    comments: string
  ) => void;
}

export const HumanReviewView: React.FC<HumanReviewAuditProps> = ({
  selectedStudent,
  students,
  onSelectStudent,
  recommendations,
  roles,
  auditLogs,
  onApproveOrOverride,
}) => {
  const topRec = recommendations[0];
  const [decision, setDecision] = useState<
    'Approved' | 'Modified / Overridden' | 'Rejected' | 'More Evidence Requested'
  >('Approved');
  const [finalRoleId, setFinalRoleId] = useState<string>(topRec?.roleId || roles[0].id);
  const [evaluatorName, setEvaluatorName] = useState<string>('M. Kowalski (Senior Assessor)');
  const [reason, setReason] = useState<string>(
    'Verified workshop project and lab competency artifacts match role requirements.'
  );
  const [comments, setComments] = useState<string>(
    'Student demonstrated strong practical diagnostic capability in lab conditions.'
  );
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  const handleSubmitDecision = (e: React.FormEvent) => {
    e.preventDefault();
    const targetRoleId = decision === 'Approved' ? topRec.roleId : finalRoleId;
    onApproveOrOverride(selectedStudent.id, decision, targetRoleId, evaluatorName, reason, comments);
    const chosenRoleTitle = roles.find(r => r.id === targetRoleId)?.title || targetRoleId;
    setStatusBanner(
      `Recorded human validation decision (${decision} -> ${chosenRoleTitle}) for ${selectedStudent.name} and appended immutable entry to Audit Trail.`
    );
  };

  // Compute Evaluator Dashboard queues across the first 25 students
  const activeCohort = students.slice(0, 25);
  const awaitingReview = activeCohort.filter(s => !s.humanValidation);
  const lowConfidenceList = activeCohort.filter(s => s.evidenceConfidence < 55 || s.projects.length === 0);
  const overriddenList = activeCohort.filter(
    s => s.humanValidation && s.humanValidation.status === 'Modified / Overridden'
  );

  return (
    <div className="space-y-6">
      {/* Responsible AI Banner */}
      <div className="bg-slate-900 text-white rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="text-xs">
          <span className="font-semibold text-teal-300">Mandatory Human-in-the-Loop Governance: </span>
          AI recommendations are decision-support outputs and must be validated by an authorized evaluator before finalizing student career pathways.
        </div>
        <div className="text-xs font-mono tabular-nums text-slate-300">
          Awaiting Review: {awaitingReview.length} · Low Confidence Flagged: {lowConfidenceList.length} · Overrides: {overriddenList.length}
        </div>
      </div>

      {statusBanner && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg p-3.5 text-xs font-medium">
          ✓ {statusBanner}
        </div>
      )}

      {/* Evaluator Triage Queue & Active Decision Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Evaluator Dashboard Triage Queue */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Evaluator Review Queue</h2>
            <p className="text-xs text-slate-500">
              Select a candidate to inspect evidence, approve, override, or request additional workshop artifacts
            </p>
          </div>

          <div className="divide-y divide-slate-200 border border-slate-200 rounded-md max-h-[460px] overflow-y-auto">
            {students.slice(0, 12).map(stu => {
              const isSelected = stu.id === selectedStudent.id;
              return (
                <button
                  key={stu.id}
                  onClick={() => {
                    onSelectStudent(stu.id);
                    setStatusBanner(null);
                  }}
                  className={`w-full text-left p-3 transition-colors block ${
                    isSelected ? 'bg-teal-50/80' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">
                      {stu.id} — {stu.name}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-slate-600">
                      Conf: {stu.evidenceConfidence}%
                    </span>
                  </div>
                  {stu.demoLabel && (
                    <div className="text-[11px] text-teal-800 mt-0.5 truncate">{stu.demoLabel}</div>
                  )}
                  <div className="text-[11px] text-slate-500 mt-1">
                    Status:{' '}
                    <span className="font-medium text-slate-800">
                      {stu.humanValidation ? stu.humanValidation.status : 'Pending Human Review'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 2 columns: Human Review & Override Form */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 space-y-5">
          <div className="border-b border-slate-200 pb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-slate-500">
                Candidate Under Evaluation · <span className="font-mono">{selectedStudent.id}</span>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mt-0.5">{selectedStudent.name}</h2>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">System Recommendation</div>
              <div className="text-base font-semibold text-teal-800 font-mono tabular-nums">
                {topRec?.roleTitle} — {topRec?.overallCompatibilityScore}%
              </div>
            </div>
          </div>

          {/* Diagnostic flags if present */}
          {topRec && topRec.flags.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-md p-3.5 text-xs text-amber-900">
              <div className="font-semibold mb-1">Automated Quality & Conflict Flags Requiring Human Judgment:</div>
              <ul className="space-y-1">
                {topRec.flags.map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Preset Scenarios for Evaluator Override */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Quick Evaluator Presets:</span>
            <button
              type="button"
              onClick={() => {
                setDecision('Approved');
                setFinalRoleId(topRec?.roleId || roles[0].id);
                setReason('Demonstrated project and lab evidence strongly substantiates top recommendation.');
                setComments('Approved for industry placement track.');
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded transition-colors"
            >
              Approve Top Recommendation
            </button>
            <button
              type="button"
              onClick={() => {
                setDecision('Modified / Overridden');
                setFinalRoleId('ROLE-NET');
                setReason(
                  'Student has stronger demonstrated networking competency and lacks cybersecurity incident-response project evidence.'
                );
                setComments('Overridden from Cybersecurity Analyst to Network Technician pending SIEM lab completion.');
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded transition-colors"
            >
              Demo Override → Network Technician
            </button>
            <button
              type="button"
              onClick={() => {
                setDecision('More Evidence Requested');
                setFinalRoleId(topRec?.roleId || roles[0].id);
                setReason('Insufficient practical workshop and portfolio artifacts to finalize high-impact career track.');
                setComments('Hold recommendation until student completes 2 supervised workshop assessments.');
              }}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded transition-colors"
            >
              Request More Evidence
            </button>
          </div>

          <form onSubmit={handleSubmitDecision} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Evaluator Action / Decision
                </label>
                <select
                  value={decision}
                  onChange={e => setDecision(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-slate-900"
                >
                  <option value="Approved">Approve AI Recommendation</option>
                  <option value="Modified / Overridden">Modify / Override Career Role</option>
                  <option value="More Evidence Requested">Request More Workshop Evidence</option>
                  <option value="Rejected">Reject Recommendation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Final Evaluator Career Role Selection
                </label>
                <select
                  value={decision === 'Approved' ? topRec?.roleId : finalRoleId}
                  disabled={decision === 'Approved'}
                  onChange={e => setFinalRoleId(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-slate-900 disabled:bg-slate-100"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.category})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Authorized Evaluator Identity
              </label>
              <input
                type="text"
                value={evaluatorName}
                onChange={e => setEvaluatorName(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Justification / Override Reason (Required for Audit Trail)
              </label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Evaluator Comments & Advising Notes
              </label>
              <textarea
                rows={2}
                value={comments}
                onChange={e => setComments(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-slate-900"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-semibold bg-teal-700 text-white rounded-md hover:bg-teal-800 transition-colors"
              >
                Commit Evaluator Decision to Audit Log
              </button>
            </div>
          </form>

          {/* Current recorded human validation if exists */}
          {selectedStudent.humanValidation && (
            <div className="mt-4 pt-4 border-t border-slate-200 text-xs space-y-1 bg-slate-50 p-4 rounded-md">
              <div className="font-semibold text-slate-900">Latest Recorded Human Validation on File:</div>
              <div>
                AI Recommendation: <span className="font-medium">{selectedStudent.humanValidation.originalRoleTitle} — {selectedStudent.humanValidation.originalScore}%</span>
              </div>
              <div>
                Evaluator Decision: <span className="font-semibold text-teal-800">{selectedStudent.humanValidation.finalRoleTitle} ({selectedStudent.humanValidation.status})</span>
              </div>
              <div>
                Override / Decision Reason: <span className="italic">"{selectedStudent.humanValidation.reason}"</span>
              </div>
              <div className="text-slate-500 font-mono">
                Signed by {selectedStudent.humanValidation.evaluatorName} at {selectedStudent.humanValidation.timestamp}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AuditTrailView: React.FC<{ auditLogs: AuditLogEntry[] }> = ({ auditLogs }) => {
  const [studentFilter, setStudentFilter] = useState('');
  const [evaluatorFilter, setEvaluatorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const filteredLogs = auditLogs.filter(entry => {
    const matchesStudent =
      !studentFilter ||
      (entry.studentId && entry.studentId.toLowerCase().includes(studentFilter.toLowerCase())) ||
      (entry.studentName && entry.studentName.toLowerCase().includes(studentFilter.toLowerCase()));
    const matchesEval =
      !evaluatorFilter || entry.actorName.toLowerCase().includes(evaluatorFilter.toLowerCase());
    const matchesAction = actionFilter === 'ALL' || entry.actionType === actionFilter;
    return matchesStudent && matchesEval && matchesAction;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">Immutable Governance & Decision Traceability</div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-0.5">
            System & Evaluator Audit Trail ({filteredLogs.length} Events)
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Filter by Student ID or Name..."
            value={studentFilter}
            onChange={e => setStudentFilter(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-xs bg-white text-slate-900"
          />
          <input
            type="text"
            placeholder="Filter by Evaluator..."
            value={evaluatorFilter}
            onChange={e => setEvaluatorFilter(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-xs bg-white text-slate-900"
          />
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-xs bg-white text-slate-900"
          >
            <option value="ALL">All Action Types</option>
            <option value="RECOMMENDATION_GENERATED">Recommendation Generated</option>
            <option value="HUMAN_APPROVAL">Human Approval</option>
            <option value="HUMAN_OVERRIDE">Human Override</option>
            <option value="EVIDENCE_REQUESTED">Evidence Requested</option>
            <option value="FIELD_ENTRY_CREATED">Offline Field Entry</option>
            <option value="FIELD_SYNC_COMPLETED">Field Sync Completed</option>
            <option value="CONFLICT_RESOLVED">Conflict Resolved</option>
            <option value="ROLE_REQUIREMENT_MODIFIED">Role Requirement Modified</option>
            <option value="WEIGHTS_MODIFIED">Weights Modified</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <th className="py-3 px-4">Audit ID & Timestamp</th>
                <th className="py-3 px-3">Actor / Evaluator</th>
                <th className="py-3 px-3">Action Event</th>
                <th className="py-3 px-3">Student</th>
                <th className="py-3 px-3">Original vs. Final Decision</th>
                <th className="py-3 px-3">Traceable Evidence Used</th>
                <th className="py-3 px-4">Justification / Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono tabular-nums">
                    <div className="font-semibold text-slate-900">{log.id}</div>
                    <div className="text-[11px] text-slate-500">{log.timestamp}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-slate-900">{log.actorName}</div>
                    <div className="text-[11px] text-slate-500">{log.actorRole}</div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] font-semibold text-teal-800">
                    {log.actionType}
                  </td>
                  <td className="py-3 px-3">
                    {log.studentId ? (
                      <>
                        <div className="font-semibold text-slate-900">{log.studentName}</div>
                        <div className="font-mono text-[11px] text-slate-500">{log.studentId}</div>
                      </>
                    ) : (
                      <span className="text-slate-400">System-wide</span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {log.originalRecommendation && (
                      <div className="text-slate-600">
                        AI: {log.originalRecommendation} {log.score ? `(${log.score}%)` : ''}
                      </div>
                    )}
                    {log.finalRecommendation && (
                      <div className="font-semibold text-slate-900">
                        Final: {log.finalRecommendation}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                    {log.evidenceUsed.join(', ') || '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-700 max-w-xs">{log.reasonOrNotes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
