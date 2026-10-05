import React from 'react';
import { StudentRecord, RoleRecommendationResult, BaselineRecommendationResult } from '../types';
import { CheckCircle2, AlertTriangle, ArrowRight, FileCheck2, ShieldAlert, Sparkles } from 'lucide-react';

interface StudentProfileViewsProps {
  selectedStudent: StudentRecord;
  students: StudentRecord[];
  onSelectStudent: (id: string) => void;
  recommendations: RoleRecommendationResult[];
  baselineRecommendations: BaselineRecommendationResult[];
  onNavigate: (page: any) => void;
  onAddEvidence: (
    studentId: string,
    payload: {
      activityType: 'Practical Assessment' | 'Project Artifact' | 'Portfolio Evidence';
      title: string;
      description: string;
      competency: string;
      proficiency: 1 | 2 | 3 | 4 | 5;
      skills: string[];
      evaluatorName: string;
      observation: string;
    }
  ) => void;
}

export const CompetencyRadarSVG: React.FC<{ student: StudentRecord; topRecommendation?: RoleRecommendationResult }> = ({
  student,
}) => {
  // Compute 6 core vocational axes (0-100)
  const techBreadth = Math.min(100, student.demonstratedTechnicalSkills.length * 14);
  const projectExecution =
    student.projects.length > 0
      ? Math.round(student.projects.reduce((a, b) => a + b.score, 0) / student.projects.length)
      : 15;
  const practicalCompetency =
    student.practicalAssessments.length > 0
      ? Math.round(
          (student.practicalAssessments.reduce((a, b) => a + b.proficiency, 0) /
            student.practicalAssessments.length /
            5) *
            100
        )
      : 15;
  const portfolioDepth = Math.min(100, student.portfolio.length * 45 + (student.certifications.length > 0 ? 15 : 0));
  const problemSolving =
    student.observations.length > 0 ? student.observations[0].problemSolving * 20 : 50;
  const academicMarks = student.academicMarks;

  const axes = [
    { label: 'Technical Skills', value: techBreadth },
    { label: 'Project Execution', value: projectExecution },
    { label: 'Lab Competency', value: practicalCompetency },
    { label: 'Portfolio Artifacts', value: portfolioDepth },
    { label: 'Problem Solving', value: problemSolving },
    { label: 'Academic Marks', value: academicMarks },
  ];

  const size = 250;
  const center = size / 2;
  const radius = 86;

  const getPoint = (index: number, val: number) => {
    const angle = (Math.PI * 2 * index) / axes.length - Math.PI / 2;
    const r = (val / 100) * radius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  const polygonPoints = axes
    .map((ax, idx) => {
      const pt = getPoint(idx, ax.value);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="overflow-visible">
        {[25, 50, 75, 100].map(ring => {
          const pts = axes
            .map((_, idx) => {
              const p = getPoint(idx, ring);
              return `${p.x},${p.y}`;
            })
            .join(' ');
          return (
            <polygon
              key={ring}
              points={pts}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth="1"
              strokeDasharray={ring === 100 ? 'none' : '2,2'}
            />
          );
        })}
        {axes.map((ax, idx) => {
          const end = getPoint(idx, 100);
          const labelPt = getPoint(idx, 124);
          return (
            <g key={ax.label}>
              <line x1={center} y1={center} x2={end.x} y2={end.y} stroke="#CBD5E1" strokeWidth="1" />
              <text
                x={labelPt.x}
                y={labelPt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-[10px] fill-slate-600 font-medium"
              >
                {ax.label} ({ax.value}%)
              </text>
            </g>
          );
        })}
        <polygon
          points={polygonPoints}
          fill="rgba(15, 118, 110, 0.18)"
          stroke="#0F766E"
          strokeWidth="2"
        />
        {axes.map((ax, idx) => {
          const pt = getPoint(idx, ax.value);
          return <circle key={idx} cx={pt.x} cy={pt.y} r="3.5" fill="#0F766E" />;
        })}
      </svg>
    </div>
  );
};

export const StudentProfileView: React.FC<StudentProfileViewsProps> = ({
  selectedStudent,
  students,
  onSelectStudent,
  recommendations,
  baselineRecommendations,
  onNavigate,
}) => {
  const topRec = recommendations[0];
  const topBase = baselineRecommendations[0];

  return (
    <div className="space-y-6">
      {/* Student Switcher Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">
            <span>Active Vocational Candidate</span>
            <span className="mx-1.5">·</span>
            <span className="font-mono">{selectedStudent.id}</span>
            <span className="mx-1.5">·</span>
            <span>{selectedStudent.cohort}</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-0.5">{selectedStudent.name}</h1>
          {selectedStudent.demoLabel && (
            <p className="text-xs text-teal-800 font-medium mt-1">
              Archetype: {selectedStudent.demoLabel}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs font-medium text-slate-600">Switch Student:</label>
          <select
            value={selectedStudent.id}
            onChange={e => onSelectStudent(e.target.value)}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white text-slate-900"
          >
            {students.slice(0, 30).map(s => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.name} ({s.academicMarks}% Marks)
              </option>
            ))}
          </select>
          <button
            onClick={() => onNavigate('human-review')}
            className="px-3.5 py-2 text-xs font-medium bg-teal-700 text-white rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap"
          >
            Human Review & Sign-Off
          </button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Top Evidence-Based Career Match</div>
          <div className="text-lg font-semibold text-slate-900 mt-1">{topRec?.roleTitle}</div>
          <div className="text-xs text-teal-700 font-mono tabular-nums mt-1">
            Compatibility: {topRec?.overallCompatibilityScore}% · Confidence: {topRec?.confidenceLevel}%
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Marks-Only Baseline Comparison</div>
          <div className="text-lg font-semibold text-slate-700 mt-1">{topBase?.roleTitle}</div>
          <div className="text-xs text-slate-500 font-mono tabular-nums mt-1">
            Baseline Score: {topBase?.baselineScore}% (Marks: {selectedStudent.academicMarks}%)
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Verified Practical Evidence</div>
          <div className="text-lg font-semibold text-slate-900 font-mono tabular-nums mt-1">
            {selectedStudent.projects.length} Projects · {selectedStudent.practicalAssessments.length} Labs · {selectedStudent.portfolio.length} Artifacts
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Attendance: <span className="font-mono tabular-nums">{selectedStudent.attendanceRate}%</span> · Env: {selectedStudent.preferredWorkEnvironment}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Human Validation Status</div>
          <div className="text-sm font-semibold text-slate-900 mt-1">
            {selectedStudent.humanValidation ? selectedStudent.humanValidation.status : 'Pending Evaluator Review'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {selectedStudent.humanValidation
              ? `Final: ${selectedStudent.humanValidation.finalRoleTitle} (${selectedStudent.humanValidation.evaluatorName})`
              : `Assigned Assessor: ${selectedStudent.evaluatorIdentity}`}
          </div>
        </div>
      </div>

      {/* Flags / Warnings if any */}
      {topRec && topRec.flags.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-amber-900">
                Diagnostic Governance Alert: {topRec.confidenceStatus}
              </h3>
              <ul className="mt-1 space-y-1 text-xs text-amber-800">
                {topRec.flags.map((f, idx) => (
                  <li key={idx}>• {f}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Radar + Demonstrated Skills & Interests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-1">6-Axis Competency Radar</h2>
          <p className="text-xs text-slate-500 mb-4">
            Contrasts hands-on workshop execution against written academic marks
          </p>
          <CompetencyRadarSVG student={selectedStudent} topRecommendation={topRec} />
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 lg:col-span-2 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Demonstrated Technical & Soft Skills</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Extracted from verified projects, practical assessments, and portfolio artifacts
            </p>
            <div className="mt-2 text-sm text-slate-800 leading-relaxed">
              {selectedStudent.demonstratedTechnicalSkills.length > 0 ? (
                selectedStudent.demonstratedTechnicalSkills.join(' · ')
              ) : (
                <span className="text-amber-700">No demonstrated technical skills verified yet.</span>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block">Self-Reported Interests</span>
              <span className="text-slate-900 font-medium mt-0.5 block">
                {selectedStudent.interests.join(' · ') || 'None specified'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Demonstrated Soft Skills</span>
              <span className="text-slate-900 font-medium mt-0.5 block">
                {selectedStudent.demonstratedSoftSkills.join(' · ') || 'None recorded'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Certifications</span>
              <span className="text-slate-900 font-medium mt-0.5 block">
                {selectedStudent.certifications.join(' · ') || 'No external certifications'}
              </span>
            </div>
          </div>

          {/* Top 3 Recommendations Summary */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900">Top 3 Evidence-Based Career Recommendations</h3>
              <button
                onClick={() => onNavigate('evidence-explanation')}
                className="text-xs font-medium text-teal-700 hover:underline flex items-center gap-1"
              >
                Open Traceable Evidence Breakdown <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-md">
              {recommendations.slice(0, 3).map((rec, idx) => (
                <div key={rec.roleId} className="p-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      0{idx + 1}. {rec.roleTitle}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Evidence items: {rec.matchedEvidence.length} · Missing skills:{' '}
                      {rec.missingSkills.slice(0, 3).join(', ') || 'None'}
                    </div>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-base font-semibold text-teal-700">{rec.overallCompatibilityScore}%</div>
                    <div className="text-[11px] text-slate-500">Conf: {rec.confidenceLevel}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Projects, Practical Assessments, Portfolio Evidence */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-base font-semibold text-slate-900 mb-3">
            Completed Practical Projects ({selectedStudent.projects.length})
          </h3>
          {selectedStudent.projects.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded">
              No completed projects recorded for this student.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {selectedStudent.projects.map(p => (
                <div key={p.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">
                      [{p.id}] {p.title}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-teal-700 font-semibold">
                      Score: {p.score}% · {p.complexity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{p.description}</p>
                  <div className="text-[11px] text-slate-500 mt-1.5">
                    Tools: {p.technologies.join(' · ')} — Verified by {p.verifiedBy} ({p.timestamp})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-base font-semibold text-slate-900 mb-3">
            Assessed Practical Competencies ({selectedStudent.practicalAssessments.length})
          </h3>
          {selectedStudent.practicalAssessments.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded">
              No practical assessments logged yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {selectedStudent.practicalAssessments.map(a => (
                <div key={a.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">
                      [{a.id}] {a.competency}
                    </span>
                    <span className="text-xs font-mono tabular-nums text-slate-800 font-semibold">
                      Proficiency: {a.proficiency}/5 ({a.score}%)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">"{a.observation}"</p>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Assessor: {a.evaluatorName} · {a.timestamp}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Portfolio & Instructor Behaviour Observations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-base font-semibold text-slate-900 mb-3">
            Portfolio Evidence Artifacts ({selectedStudent.portfolio.length})
          </h3>
          {selectedStudent.portfolio.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-200 rounded">
              Empty portfolio — no verified schematics, repositories, or lab captures uploaded.
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {selectedStudent.portfolio.map(pf => (
                <div key={pf.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">
                      [{pf.id}] {pf.title}
                    </span>
                    <span className="text-xs text-slate-500">{pf.category}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{pf.description}</p>
                  <div className="text-[11px] font-mono text-teal-700 mt-1">{pf.linkOrFile}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-base font-semibold text-slate-900 mb-3">
            Instructor Behavioural Observations & Suggested Development
          </h3>
          {selectedStudent.observations.map(obs => (
            <div key={obs.id} className="mb-4 pb-3 border-b border-slate-200">
              <div className="text-xs text-slate-500">
                [{obs.id}] Logged by {obs.evaluatorName} · {obs.timestamp}
              </div>
              <p className="text-xs text-slate-800 mt-1 italic">"{obs.behaviourNotes}"</p>
              <div className="mt-2 flex flex-wrap gap-4 text-xs font-mono tabular-nums text-slate-700">
                <span>Problem-Solving: {obs.problemSolving}/5</span>
                <span>Teamwork: {obs.teamwork}/5</span>
                <span>Communication: {obs.communication}/5</span>
                <span>Creativity: {obs.creativity}/5</span>
              </div>
            </div>
          ))}
          <div>
            <h4 className="text-xs font-semibold text-slate-900">
              Suggested Skill-Development Activities (For {topRec?.roleTitle}):
            </h4>
            <ul className="mt-1.5 space-y-1 text-xs text-slate-700">
              {topRec?.suggestedActivities.map((act, i) => (
                <li key={i}>• {act}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
