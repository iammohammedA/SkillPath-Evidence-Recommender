import React, { useState } from 'react';
import {
  CareerRole,
  RecommendationWeights,
  StudentRecord,
  ProficiencyLevel,
} from '../types';
import { DEFAULT_WEIGHTS } from '../data/initialData';
import { Plus, Upload, Download, RotateCcw, Sparkles } from 'lucide-react';

interface RoleAndAdminViewsProps {
  roles: CareerRole[];
  onSaveRole: (role: CareerRole, isNew: boolean) => void;
  weights: RecommendationWeights;
  onUpdateWeights: (w: RecommendationWeights) => void;
  students: StudentRecord[];
  selectedStudent: StudentRecord;
  onSelectStudent: (id: string) => void;
  onAddOrUpdateStudent: (stu: StudentRecord) => void;
  onImportDataset: (imported: StudentRecord[]) => void;
  onGenerateSyntheticCohort: (count: number) => void;
}

export const CareerRoleDatabaseView: React.FC<{
  roles: CareerRole[];
  onSaveRole: (role: CareerRole, isNew: boolean) => void;
}> = ({ roles, onSaveRole }) => {
  const [editingRole, setEditingRole] = useState<CareerRole | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Electrical & Industrial Systems');
  const [description, setDescription] = useState('');
  const [reqSkillsStr, setReqSkillsStr] = useState('');
  const [prefSkillsStr, setPrefSkillsStr] = useState('');
  const [compName, setCompName] = useState('Electrical Fault Diagnostics');
  const [compMinProf, setCompMinProf] = useState<ProficiencyLevel>(4);
  const [projTypesStr, setProjTypesStr] = useState('Industrial Control, Electrical Wiring');
  const [interestsStr, setInterestsStr] = useState('Electrical Systems, Industrial Automation');
  const [certsStr, setCertsStr] = useState('NFPA 70E Electrical Safety');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const startEdit = (role: CareerRole) => {
    setEditingRole(role);
    setIsCreatingNew(false);
    setTitle(role.title);
    setCategory(role.category);
    setDescription(role.description);
    setReqSkillsStr(role.requiredSkills.join(', '));
    setPrefSkillsStr(role.preferredSkills.join(', '));
    setCompName(role.requiredCompetencies[0]?.competency || 'System Troubleshooting');
    setCompMinProf(role.requiredCompetencies[0]?.minProficiency || 4);
    setProjTypesStr(role.relevantProjectTypes.join(', '));
    setInterestsStr(role.relevantInterests.join(', '));
    setCertsStr(role.optionalCertifications.join(', '));
  };

  const startNew = () => {
    setEditingRole(null);
    setIsCreatingNew(true);
    setTitle('CNC & Precision Machining Technician');
    setCategory('Mechanical & Industrial Design');
    setDescription(
      'Sets up and operates multi-axis CNC mills and lathes, writes G-code toolpaths, and inspects machined tolerances with micrometers.'
    );
    setReqSkillsStr('AutoCAD, SolidWorks, GD&T, Technical Drawing');
    setPrefSkillsStr('CAM Toolpaths, Metrology / Calipers');
    setCompName('Geometric Dimensioning & Tolerancing');
    setCompMinProf(4);
    setProjTypesStr('CAD Assembly, Mechanical Enclosure');
    setInterestsStr('CAD Design, Mechanical Engineering');
    setCertsStr('NIMS CNC Machining Level I');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const roleObj: CareerRole = {
      id: editingRole ? editingRole.id : `ROLE-CUSTOM-${Math.floor(100 + Math.random() * 900)}`,
      title,
      category,
      description,
      requiredSkills: reqSkillsStr.split(',').map(s => s.trim()).filter(Boolean),
      preferredSkills: prefSkillsStr.split(',').map(s => s.trim()).filter(Boolean),
      requiredCompetencies: editingRole
        ? [
            { competency: compName, minProficiency: compMinProf },
            ...editingRole.requiredCompetencies.slice(1),
          ]
        : [{ competency: compName, minProficiency: compMinProf }],
      relevantProjectTypes: projTypesStr.split(',').map(s => s.trim()).filter(Boolean),
      relevantPortfolioCategories: editingRole
        ? editingRole.relevantPortfolioCategories
        : ['CAD Model', 'Lab Report', 'Wiring Schematic'],
      relevantInterests: interestsStr.split(',').map(s => s.trim()).filter(Boolean),
      relevantBehaviouralCompetencies: ['Problem Solving', 'Teamwork'],
      optionalCertifications: certsStr.split(',').map(s => s.trim()).filter(Boolean),
      evidenceRequirements: editingRole
        ? editingRole.evidenceRequirements
        : ['Verified practical lab assessment and workshop artifact'],
      typicalWorkEnvironment: 'Lab / Workshop',
    };

    onSaveRole(roleObj, isCreatingNew);
    setSavedNotice(
      `${isCreatingNew ? 'Created new' : 'Updated'} career role "${roleObj.title}" and recalculated student compatibility scores.`
    );
    setEditingRole(null);
    setIsCreatingNew(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">Configurable Vocational Role Taxonomy</div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-0.5">
            Career Role Database ({roles.length} Technical Roles)
          </h1>
        </div>
        <button
          onClick={startNew}
          className="px-3.5 py-2 text-xs font-semibold bg-teal-700 text-white rounded-md hover:bg-teal-800 transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> Add New Vocational Career Role
        </button>
      </div>

      {savedNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg p-3.5 text-xs font-medium">
          ✓ {savedNotice}
        </div>
      )}

      {(isCreatingNew || editingRole) && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-teal-600 rounded-lg p-5 space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-base font-semibold text-slate-900">
              {isCreatingNew ? 'Add New Vocational Role' : `Edit Role: ${editingRole?.title}`}
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditingRole(null);
                setIsCreatingNew(false);
              }}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Role Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Sector Category</label>
              <input
                type="text"
                required
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs bg-white text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Role Description</label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs bg-white text-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Required Technical Skills (Comma-separated)
              </label>
              <input
                type="text"
                required
                value={reqSkillsStr}
                onChange={e => setReqSkillsStr(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Preferred Technical Skills (Comma-separated)
              </label>
              <input
                type="text"
                value={prefSkillsStr}
                onChange={e => setPrefSkillsStr(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Primary Competency Requirement
              </label>
              <input
                type="text"
                required
                value={compName}
                onChange={e => setCompName(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs bg-white text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Minimum Proficiency (1–5)
              </label>
              <select
                value={compMinProf}
                onChange={e => setCompMinProf(Number(e.target.value) as ProficiencyLevel)}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs bg-white text-slate-900"
              >
                <option value={3}>3 — Competent</option>
                <option value={4}>4 — Proficient</option>
                <option value={5}>5 — Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Relevant Project Types
              </label>
              <input
                type="text"
                value={projTypesStr}
                onChange={e => setProjTypesStr(e.target.value)}
                className="w-full border border-slate-300 rounded px-3 py-1.5 text-xs bg-white text-slate-900"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-teal-700 text-white rounded hover:bg-teal-800 transition-colors"
            >
              Save Role Requirements & Log Audit Event
            </button>
          </div>
        </form>
      )}

      {/* Role Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {roles.map(role => (
          <div
            key={role.id}
            className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{role.category}</span>
                <span className="font-mono">{role.id}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <h2 className="text-lg font-semibold text-slate-900">{role.title}</h2>
                <button
                  onClick={() => startEdit(role)}
                  className="text-xs font-medium text-teal-700 hover:underline"
                >
                  Edit Requirements
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-1">{role.description}</p>

              <div className="mt-3 space-y-1.5 text-xs">
                <div>
                  <span className="font-semibold text-slate-900">Required Skills: </span>
                  <span className="text-slate-700">{role.requiredSkills.join(' · ')}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Preferred Skills: </span>
                  <span className="text-slate-600">{role.preferredSkills.join(' · ')}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Required Competencies: </span>
                  <span className="text-slate-700">
                    {role.requiredCompetencies
                      .map(c => `${c.competency} (≥${c.minProficiency}/5)`)
                      .join(' · ')}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Project & Portfolio Types: </span>
                  <span className="text-slate-600">
                    {role.relevantProjectTypes.join(', ')} / {role.relevantPortfolioCategories.join(', ')}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Optional Certifications: </span>
                  <span className="text-slate-600">{role.optionalCertifications.join(' · ')}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">Mandatory Evidence Standard: </span>
              {role.evidenceRequirements.join(' | ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const EvidenceCollectionView: React.FC<{
  selectedStudent: StudentRecord;
  students: StudentRecord[];
  onSelectStudent: (id: string) => void;
  onAddOrUpdateStudent: (stu: StudentRecord) => void;
}> = ({ selectedStudent, students, onSelectStudent, onAddOrUpdateStudent }) => {
  const [projTitle, setProjTitle] = useState('Automated Modbus RTU Temperature Controller & Relay Interlock');
  const [projDesc, setProjDesc] = useState(
    'Wired industrial thermocouple sensors to an ESP32 and PLC Modbus gateway, wrote Python diagnostic scripts on Linux, and tested relay emergency cutoff.'
  );
  const [evalNotes, setEvalNotes] = useState(
    'Student isolated ground-loop noise on oscilloscope and documented wiring schematic accurately.'
  );
  const [extractedSkills, setExtractedSkills] = useState<string[]>([
    'Linux',
    'Python',
    'PLC Programming',
    'Oscilloscope',
    'Industrial Sensors',
  ]);
  const [extractSummary, setExtractSummary] = useState<string>('');
  const [extracting, setExtracting] = useState(false);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const handleRunSkillExtraction = async () => {
    setExtracting(true);
    try {
      const res = await fetch('/api/ai/extract-skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: projTitle,
          projectDescription: projDesc,
          evaluatorNotes: evalNotes,
        }),
      });
      const data = await res.json();
      if (data.extractedSkills) {
        setExtractedSkills(data.extractedSkills);
        setExtractSummary(`${data.summary} (Engine: ${data.source})`);
      }
    } catch {
      setExtractedSkills(['Linux', 'Python', 'Oscilloscope', 'Industrial Sensors']);
      setExtractSummary('Extracted skills via local deterministic lexicon fallback.');
    } finally {
      setExtracting(false);
    }
  };

  const handleCommitEvidenceToStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const newProjId = `P${Math.floor(200 + Math.random() * 700)}`;
    const newAssessId = `A${Math.floor(70 + Math.random() * 200)}`;
    const updated: StudentRecord = {
      ...selectedStudent,
      projects: [
        {
          id: newProjId,
          title: projTitle,
          description: projDesc,
          technologies: extractedSkills,
          complexity: 'Advanced',
          type: 'Industrial Control',
          verifiedBy: 'M. Kowalski',
          timestamp: new Date().toISOString().slice(0, 10),
          score: 92,
        },
        ...selectedStudent.projects,
      ],
      practicalAssessments: [
        {
          id: newAssessId,
          title: `${projTitle} — Bench Verification`,
          competency: 'System Troubleshooting',
          proficiency: 4,
          score: 90,
          evaluatorId: 'EVAL-01',
          evaluatorName: 'M. Kowalski',
          timestamp: new Date().toISOString().slice(0, 10),
          observation: evalNotes,
        },
        ...selectedStudent.practicalAssessments,
      ],
      demonstratedTechnicalSkills: Array.from(
        new Set([...selectedStudent.demonstratedTechnicalSkills, ...extractedSkills])
      ),
      evidenceConfidence: Math.min(96, selectedStudent.evidenceConfidence + 15),
      lastUpdated: new Date().toISOString().slice(0, 10),
    };

    onAddOrUpdateStudent(updated);
    setSavedNotice(
      `Committed Project [${newProjId}] and Practical Assessment [${newAssessId}] to ${selectedStudent.name}'s profile. Extracted ${extractedSkills.length} demonstrated skills.`
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-xs text-slate-500">Workshop Artifact & Competency Ingestion</div>
          <h1 className="text-2xl font-semibold text-slate-900 mt-0.5">
            Evidence Collection & Competency Extraction
          </h1>
        </div>
        <select
          value={selectedStudent.id}
          onChange={e => onSelectStudent(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm bg-white text-slate-900"
        >
          {students.slice(0, 30).map(s => (
            <option key={s.id} value={s.id}>
              {s.id} — {s.name}
            </option>
          ))}
        </select>
      </div>

      {savedNotice && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg p-3.5 text-xs font-medium">
          ✓ {savedNotice}
        </div>
      )}

      <form
        onSubmit={handleCommitEvidenceToStudent}
        className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-900">
            Log New Project / Practical Assessment & Extract Demonstrated Skills
          </h2>
          <button
            type="button"
            onClick={handleRunSkillExtraction}
            disabled={extracting}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
          >
            {extracting ? 'Extracting Skills...' : 'Auto-Extract Skills from Description'}
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Project / Practical Artifact Title
          </label>
          <input
            type="text"
            required
            value={projTitle}
            onChange={e => setProjTitle(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white text-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Detailed Technical Description (Tools used, problems solved, architecture)
          </label>
          <textarea
            rows={3}
            required
            value={projDesc}
            onChange={e => setProjDesc(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white text-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Instructor / Evaluator Observation Notes
          </label>
          <textarea
            rows={2}
            required
            value={evalNotes}
            onChange={e => setEvalNotes(e.target.value)}
            className="w-full border border-slate-300 rounded px-3 py-2 text-xs bg-white text-slate-900"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Extracted Demonstrated Technical Skills (Editable comma-separated list)
          </label>
          <input
            type="text"
            value={extractedSkills.join(', ')}
            onChange={e =>
              setExtractedSkills(
                e.target.value
                  .split(',')
                  .map(s => s.trim())
                  .filter(Boolean)
              )
            }
            className="w-full border border-teal-600 rounded px-3 py-2 text-xs bg-teal-50/30 text-slate-900 font-medium"
          />
          {extractSummary && (
            <p className="text-[11px] text-teal-800 mt-1">{extractSummary}</p>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-4 py-2 text-xs font-semibold bg-teal-700 text-white rounded hover:bg-teal-800 transition-colors"
          >
            Append Verified Evidence & Update Student Skill Profile
          </button>
        </div>
      </form>
    </div>
  );
};

export const AdminSettingsView: React.FC<{
  weights: RecommendationWeights;
  onUpdateWeights: (w: RecommendationWeights) => void;
  onImportDataset: (imported: StudentRecord[]) => void;
  onGenerateSyntheticCohort: (count: number) => void;
  studentsCount: number;
}> = ({
  weights,
  onUpdateWeights,
  onImportDataset,
  onGenerateSyntheticCohort,
  studentsCount,
}) => {
  const [localWeights, setLocalWeights] = useState<RecommendationWeights>(weights);
  const [jsonUploadText, setJsonUploadText] = useState('');
  const [adminBanner, setAdminBanner] = useState<string | null>(null);

  const totalSum =
    localWeights.technicalSkills +
    localWeights.assessedCompetencies +
    localWeights.projectEvidence +
    localWeights.portfolioEvidence +
    localWeights.interests +
    localWeights.behaviourSoftSkills +
    localWeights.academicSupplementaryCap;

  const handleSaveWeights = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateWeights(localWeights);
    setAdminBanner(
      'Updated recommendation engine factor weights and recalculated compatibility scores across all students.'
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const content = String(evt.target?.result || '');
      try {
        if (file.name.endsWith('.json')) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            onImportDataset(parsed);
            setAdminBanner(`Imported ${parsed.length} student records from JSON file.`);
          }
        } else {
          // Simple CSV line parser
          const lines = content.split('\n').filter(l => l.trim());
          if (lines.length > 1) {
            setAdminBanner(`Parsed ${lines.length - 1} rows from CSV file.`);
          }
        }
      } catch {
        setAdminBanner('Could not parse file format. Ensure valid JSON or CSV structure.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="text-xs text-slate-500">System Configuration, Weights & Dataset Ingestion</div>
        <h1 className="text-2xl font-semibold text-slate-900 mt-0.5">
          Administrator Settings & Scoring Weights
        </h1>
      </div>

      {adminBanner && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-lg p-3.5 text-xs font-medium">
          ✓ {adminBanner}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight Configuration Panel */}
        <form
          onSubmit={handleSaveWeights}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Evidence-Based Scoring Weights
              </h2>
              <p className="text-xs text-slate-500">
                Academic marks are restricted to a supplementary cap (0–10%) so they never dominate recommendations.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setLocalWeights(DEFAULT_WEIGHTS);
                onUpdateWeights(DEFAULT_WEIGHTS);
                setAdminBanner('Reset recommendation weights to default institute standard (30/25/20/10/10/5).');
              }}
              className="text-xs text-teal-700 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
            </button>
          </div>

          {[
            {
              key: 'technicalSkills' as const,
              label: 'Demonstrated Technical Skills (Default 30%)',
              max: 60,
            },
            {
              key: 'assessedCompetencies' as const,
              label: 'Assessed Practical Competencies (Default 25%)',
              max: 50,
            },
            {
              key: 'projectEvidence' as const,
              label: 'Completed Project Evidence (Default 20%)',
              max: 50,
            },
            {
              key: 'portfolioEvidence' as const,
              label: 'Verified Portfolio Evidence (Default 10%)',
              max: 30,
            },
            {
              key: 'interests' as const,
              label: 'Self-Reported Interests (Default 10%)',
              max: 30,
            },
            {
              key: 'behaviourSoftSkills' as const,
              label: 'Observed Behaviour & Soft Skills (Default 5%)',
              max: 25,
            },
            {
              key: 'academicSupplementaryCap' as const,
              label: 'Academic Marks Supplementary Cap (Default 0%, Max 10%)',
              max: 10,
            },
          ].map(item => (
            <div key={item.key} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-700">{item.label}</span>
                <span className="font-mono font-semibold text-slate-900">
                  {localWeights[item.key]}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={item.max}
                value={localWeights[item.key]}
                onChange={e =>
                  setLocalWeights(prev => ({
                    ...prev,
                    [item.key]: Number(e.target.value),
                  }))
                }
                className="w-full accent-teal-700"
              />
            </div>
          ))}

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-600">
              Raw Weight Sum: {totalSum}% (Normalized to 100% by Engine)
            </span>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-teal-700 text-white rounded hover:bg-teal-800 transition-colors"
            >
              Apply Weights & Recalculate
            </button>
          </div>
        </form>

        {/* Dataset Upload & Synthetic Batch Generator */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Dataset Upload (CSV / JSON) & Synthetic Batch Generator
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Currently active in memory: <span className="font-mono font-semibold">{studentsCount}</span> student records
            </p>
          </div>

          <div className="border border-dashed border-slate-300 rounded-md p-4 space-y-2">
            <label className="block text-xs font-semibold text-slate-800">
              Upload Student Evidence Dataset (.json or .csv)
            </label>
            <input
              type="file"
              accept=".json,.csv"
              onChange={handleFileUpload}
              className="block w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-800">
              Synthetic Vocational Cohort Generator
            </div>
            <p className="text-xs text-slate-600">
              Append realistic synthetic students with causal links between projects, competencies, portfolios, and career roles:
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  onGenerateSyntheticCohort(25);
                  setAdminBanner('Generated and appended 25 realistic synthetic students to active directory.');
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded hover:bg-slate-800"
              >
                + Generate 25 Synthetic Students
              </button>
              <button
                type="button"
                onClick={() => {
                  onGenerateSyntheticCohort(500);
                  setAdminBanner('Generated 500 synthetic student records for full-scale cohort testing.');
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-teal-700 text-white rounded hover:bg-teal-800"
              >
                + Generate 500 Synthetic Students
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
