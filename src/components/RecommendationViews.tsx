import React, { useState } from 'react';
import {
  StudentRecord,
  RoleRecommendationResult,
  BaselineRecommendationResult,
  RecommendationWeights,
  CareerRole,
} from '../types';
import { Check, AlertTriangle, ArrowRight, Sparkles, Scale, ShieldCheck } from 'lucide-react';

interface RecommendationViewsProps {
  selectedStudent: StudentRecord;
  students: StudentRecord[];
  onSelectStudent: (id: string) => void;
  recommendations: RoleRecommendationResult[];
  baselineRecommendations: BaselineRecommendationResult[];
  weights: RecommendationWeights;
  roles: CareerRole[];
  onNavigate: (page: any) => void;
  onApproveOrOverride: (
    studentId: string,
    decision: 'Approved' | 'Modified / Overridden' | 'Rejected' | 'More Evidence Requested',
    finalRoleId: string,
    evaluatorName: string,
    reason: string,
    comments: string
  ) => void;
}

export const RecommendationsComparisonView: React.FC<RecommendationViewsProps> = ({
  selectedStudent,
  students,
  onSelectStudent,
  recommendations,
  baselineRecommendations,
  weights,
  onNavigate,
}) => {
  const [selectedRoleIdx, setSelectedRoleIdx] = useState(0);
  const activeRec = recommendations[selectedRoleIdx] || recommendations[0];

  return (
    <div className="space-y-6">
      {/* Header & Student Selector */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">
            <span>Deterministic Multi-Factor Scoring</span>
            <span className="mx-1.5">·</span>
            <span>Academic Marks Capped at {weights.academicSupplementaryCap}%</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-0.5">
            Career Recommendations: {selectedStudent.name}
          </h1>
          {selectedStudent.demoLabel && (
            <p className="text-xs text-teal-800 font-medium mt-1">{selectedStudent.demoLabel}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedStudent.id}
            onChange={e => {
              onSelectStudent(e.target.value);
              setSelectedRoleIdx(0);
            }}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white text-slate-900"
          >
            {students.slice(0, 30).map(s => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.name} ({s.academicMarks}% Marks)
              </option>
            ))}
          </select>
          <button
            onClick={() => onNavigate('evidence-explanation')}
            className="px-3.5 py-2 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            Inspect Traceable Evidence
          </button>
          <button
            onClick={() => onNavigate('human-review')}
            className="px-3.5 py-2 text-xs font-medium bg-teal-700 text-white rounded-md hover:bg-teal-800 transition-colors whitespace-nowrap"
          >
            Send to Evaluator Review
          </button>
        </div>
      </div>

      {/* Side-by-Side Proposed vs Marks-Only Baseline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Skill-Evidence Recommender Ranking (All {recommendations.length} Career Roles)
              </h2>
              <p className="text-xs text-slate-500">
                Weights: Skills {weights.technicalSkills}% · Competencies {weights.assessedCompetencies}% · Projects {weights.projectEvidence}% · Portfolio {weights.portfolioEvidence}% · Interests {weights.interests}% · Behaviour {weights.behaviourSoftSkills}%
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium">
                  <th className="py-2.5 pr-3">Rank & Career Role</th>
                  <th className="py-2.5 px-2 text-right">Overall</th>
                  <th className="py-2.5 px-2 text-right">Skills</th>
                  <th className="py-2.5 px-2 text-right">Comp.</th>
                  <th className="py-2.5 px-2 text-right">Projects</th>
                  <th className="py-2.5 px-2 text-right">Portfolio</th>
                  <th className="py-2.5 px-2 text-right">Interest</th>
                  <th className="py-2.5 pl-2 text-right">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-mono tabular-nums">
                {recommendations.map((rec, idx) => {
                  const isSelected = idx === selectedRoleIdx;
                  return (
                    <tr
                      key={rec.roleId}
                      onClick={() => setSelectedRoleIdx(idx)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-teal-50/70' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 pr-3 font-sans">
                        <div className="font-semibold text-slate-900">
                          0{idx + 1}. {rec.roleTitle}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {rec.matchedEvidence.length} evidence links · {rec.missingSkills.length} gaps
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold text-teal-800">
                        {rec.overallCompatibilityScore}%
                      </td>
                      <td className="py-2.5 px-2 text-right text-slate-700">{rec.skillMatchScore}%</td>
                      <td className="py-2.5 px-2 text-right text-slate-700">{rec.competencyMatchScore}%</td>
                      <td className="py-2.5 px-2 text-right text-slate-700">{rec.projectEvidenceScore}%</td>
                      <td className="py-2.5 px-2 text-right text-slate-700">{rec.portfolioEvidenceScore}%</td>
                      <td className="py-2.5 px-2 text-right text-slate-700">{rec.interestAlignmentScore}%</td>
                      <td className="py-2.5 pl-2 text-right">
                        <span
                          className={
                            rec.confidenceLevel >= 75
                              ? 'text-emerald-700 font-semibold'
                              : rec.confidenceLevel >= 50
                              ? 'text-amber-700 font-semibold'
                              : 'text-red-700 font-semibold'
                          }
                        >
                          {rec.confidenceLevel}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Marks + Interests Baseline Comparison Panel */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="text-xs text-slate-500">Conventional Baseline Model</div>
            <h2 className="text-base font-semibold text-slate-900 mt-0.5">
              Marks (55%) + Self-Reported Interests (45%)
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              Demonstrates what happens when workshop projects, assessed competencies, and portfolios are ignored:
            </p>

            <div className="mt-4 divide-y divide-slate-200 border border-slate-200 rounded-md">
              {baselineRecommendations.slice(0, 4).map((base, idx) => (
                <div key={base.roleId} className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-800">
                      0{idx + 1}. {base.roleTitle}
                    </span>
                    <span className="text-xs font-mono tabular-nums font-semibold text-slate-700">
                      {base.baselineScore}%
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">{base.reasoning}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-700">
            <div className="font-semibold text-slate-900">Why Evidence-Based Wins for {selectedStudent.name}:</div>
            <p className="mt-1 text-slate-600">
              {selectedStudent.academicMarks >= 88 && selectedStudent.projects.length <= 1
                ? `Baseline recommends ${baselineRecommendations[0]?.roleTitle} (${baselineRecommendations[0]?.baselineScore}%) purely due to ${selectedStudent.academicMarks}% exam marks, masking severe practical workshop gaps.`
                : selectedStudent.academicMarks <= 68 && selectedStudent.projects.length >= 2
                ? `Baseline penalizes ${selectedStudent.name} for ${selectedStudent.academicMarks}% written theory marks, whereas Skill-Evidence recognizes ${recommendations[0]?.overallCompatibilityScore}% hands-on mastery in ${recommendations[0]?.roleTitle}.`
                : `Skill-Evidence verifies every recommendation against ${recommendations[0]?.matchedEvidence.length} concrete lab & project artifacts rather than unverified interest checkboxes.`}
            </p>
          </div>
        </div>
      </div>

      {/* Selected Role Factor Breakdown */}
      {activeRec && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="text-xs text-slate-500">Selected Role Diagnostic</span>
              <h3 className="text-lg font-semibold text-slate-900">
                {activeRec.roleTitle} — {activeRec.overallCompatibilityScore}% Compatibility
              </h3>
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-700">
              Status: <span className="font-semibold">{activeRec.confidenceStatus}</span> (Confidence: {activeRec.confidenceLevel}%)
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-900 mb-2">
                Demonstrated Evidence ({activeRec.matchedEvidence.length} Verified Items)
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {activeRec.matchedEvidence.map((ev, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-700 font-bold">✓</span>
                    <span>
                      {ev.label} <span className="font-mono text-slate-500">[{ev.sourceId}]</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-900 mb-2">
                Missing Skills & Evidence Gaps
              </h4>
              {activeRec.missingSkills.length === 0 && activeRec.evidenceGaps.length === 0 ? (
                <p className="text-xs text-emerald-700">All required skills and competencies demonstrated.</p>
              ) : (
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {activeRec.missingSkills.map((ms, i) => (
                    <li key={`ms-${i}`} className="flex items-start gap-2">
                      <span className="text-amber-700 font-bold">⚠</span>
                      <span>Missing skill: {ms}</span>
                    </li>
                  ))}
                  {activeRec.evidenceGaps.map((gap, i) => (
                    <li key={`gap-${i}`} className="flex items-start gap-2">
                      <span className="text-amber-700 font-bold">⚠</span>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-900 mb-2">
                Recommended Workshop Development Plan
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {activeRec.suggestedActivities.map((act, i) => (
                  <li key={i}>• {act}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const EvidenceExplanationView: React.FC<RecommendationViewsProps> = ({
  selectedStudent,
  students,
  onSelectStudent,
  recommendations,
  onNavigate,
}) => {
  const [aiExplanation, setAiExplanation] = useState<{
    narrative: string;
    suggestedActivities: string[];
    source: string;
  } | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const topRec = recommendations[0];

  const handleGenerateAiSynthesis = async () => {
    if (!topRec) return;
    setLoadingAi(true);
    try {
      const response = await fetch('/api/ai/explain-recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: selectedStudent.name,
          roleTitle: topRec.roleTitle,
          matchedEvidence: topRec.matchedEvidence.map(e => `${e.label} (${e.sourceId})`),
          missingSkills: topRec.missingSkills,
          evaluatorObservations: selectedStudent.observations.map(o => o.behaviourNotes),
        }),
      });
      const data = await response.json();
      setAiExplanation(data);
    } catch {
      setAiExplanation({
        source: 'local-deterministic-fallback',
        narrative: `${selectedStudent.name}'s recommendation for ${topRec.roleTitle} (${topRec.overallCompatibilityScore}%) is directly traceable to ${topRec.matchedEvidence.length} verified workshop records.`,
        suggestedActivities: topRec.suggestedActivities,
      });
    } finally {
      setLoadingAi(false);
    }
  };

  // Extract unique source artifact IDs used
  const uniqueSources = Array.from(new Set(topRec?.matchedEvidence.map(e => e.sourceId) || []));

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">Explainable Recommendation Traceability</div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-0.5">
            Evidence Behind Recommendation — {selectedStudent.name}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedStudent.id}
            onChange={e => {
              onSelectStudent(e.target.value);
              setAiExplanation(null);
            }}
            className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white text-slate-900"
          >
            {students.slice(0, 30).map(s => (
              <option key={s.id} value={s.id}>
                {s.id} — {s.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleGenerateAiSynthesis}
            disabled={loadingAi}
            className="px-3.5 py-2 text-xs font-medium bg-slate-900 text-white rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            {loadingAi ? 'Synthesizing Advisory Note...' : 'Generate Assistive Advisory Summary'}
          </button>
        </div>
      </div>

      {/* Top 3 Traceable Cards matching Section 5 specification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {recommendations.slice(0, 3).map((rec, index) => {
          const sources = Array.from(new Set(rec.matchedEvidence.map(e => e.sourceId)));
          return (
            <div
              key={rec.roleId}
              className={`bg-white border rounded-lg p-5 flex flex-col justify-between ${
                index === 0 ? 'border-teal-700' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Rank #0{index + 1} Recommendation</span>
                  <span className="font-mono tabular-nums">Confidence: {rec.confidenceLevel}%</span>
                </div>
                <h2 className="text-lg font-semibold text-slate-900 mt-1">Career: {rec.roleTitle}</h2>
                <div className="text-base font-mono tabular-nums font-semibold text-teal-800 mt-0.5">
                  Compatibility: {rec.overallCompatibilityScore}%
                </div>

                {/* Evidence Checkmarks */}
                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-900 mb-1.5">Evidence:</div>
                  {rec.matchedEvidence.length === 0 ? (
                    <div className="text-xs text-amber-700">No verified workshop evidence linked.</div>
                  ) : (
                    <ul className="space-y-1 text-xs text-slate-800">
                      {rec.matchedEvidence.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-700 font-bold">✓</span>
                          <span>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Missing Skills & Gaps */}
                <div className="mt-4">
                  <div className="text-xs font-semibold text-slate-900 mb-1.5">Missing:</div>
                  {rec.missingSkills.length === 0 && rec.evidenceGaps.length === 0 ? (
                    <div className="text-xs text-emerald-700">✓ All core role requirements verified</div>
                  ) : (
                    <ul className="space-y-1 text-xs text-slate-700">
                      {rec.missingSkills.map((m, idx) => (
                        <li key={`m-${idx}`} className="flex items-start gap-1.5">
                          <span className="text-amber-600 font-bold">⚠</span>
                          <span>{m} experience</span>
                        </li>
                      ))}
                      {rec.evidenceGaps.slice(0, 2).map((g, idx) => (
                        <li key={`g-${idx}`} className="flex items-start gap-1.5">
                          <span className="text-amber-600 font-bold">⚠</span>
                          <span>{g}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Traceable Evidence IDs Used */}
              <div className="mt-5 pt-3 border-t border-slate-200">
                <div className="text-xs font-semibold text-slate-900 mb-1">Evidence used:</div>
                <ul className="space-y-0.5 text-xs font-mono text-slate-600">
                  {sources.map((src, idx) => (
                    <li key={idx}>• {src}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Optional AI Assistive Narrative Box */}
      {aiExplanation && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <div className="text-xs text-slate-500">
            Assistive Synthesis ({aiExplanation.source}) · Non-Decisional Summary
          </div>
          <p className="text-sm text-slate-800 mt-1">{aiExplanation.narrative}</p>
          <div className="mt-3 text-xs text-slate-700">
            <span className="font-semibold">Suggested Action Items: </span>
            {aiExplanation.suggestedActivities.join(' · ')}
          </div>
        </div>
      )}

      {/* Full Traceability Matrix Table */}
      {topRec && (
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <h3 className="text-base font-semibold text-slate-900 mb-1">
            Artifact-to-Requirement Traceability Matrix ({topRec.roleTitle})
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Every compatibility point is linked to a verifiable student record ID ({uniqueSources.join(', ')})
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-3">Evidence Category</th>
                  <th className="py-2 px-3">Matched Requirement / Claim</th>
                  <th className="py-2 px-3">Traceable Source ID</th>
                  <th className="py-2 pl-3">Verification Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {topRec.matchedEvidence.map((ev, idx) => (
                  <tr key={idx}>
                    <td className="py-2 pr-3 font-medium text-slate-700">{ev.type}</td>
                    <td className="py-2 px-3 text-slate-900 font-semibold">✓ {ev.label}</td>
                    <td className="py-2 px-3 font-mono text-teal-800">{ev.sourceId}</td>
                    <td className="py-2 pl-3 text-slate-600">{ev.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
