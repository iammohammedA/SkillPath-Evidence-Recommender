export type ProficiencyLevel = 1 | 2 | 3 | 4 | 5; // 1: Novice, 2: Beginner, 3: Competent, 4: Proficient, 5: Advanced

export interface StudentProject {
  id: string; // e.g. "P102"
  title: string;
  description: string;
  technologies: string[];
  complexity: 'Basic' | 'Intermediate' | 'Advanced';
  type: string; // e.g., "Network Security", "Industrial Control", "Web Application", "CAD Assembly", "Data Pipeline", "Electrical Wiring", "PCB Prototyping", "Cloud Deployment", "IoT Telemetry"
  verifiedBy: string;
  timestamp: string;
  score: number; // 0-100 practical execution score
}

export interface PracticalAssessment {
  id: string; // e.g. "A21"
  title: string;
  competency: string;
  proficiency: ProficiencyLevel;
  score: number; // 0-100
  evaluatorId: string;
  evaluatorName: string;
  timestamp: string;
  observation: string;
}

export interface PortfolioEvidence {
  id: string; // e.g. "PF44"
  title: string;
  category: string; // e.g. "GitHub Repository", "Wiring Schematic", "CAD Model", "Lab Report", "Incident Log", "Oscilloscope Capture", "PLC Ladder Diagram"
  description: string;
  linkOrFile: string;
  demonstratedSkills: string[];
  verified: boolean;
  timestamp: string;
}

export interface EvaluatorObservation {
  id: string; // e.g. "E17"
  evaluatorId: string;
  evaluatorName: string;
  timestamp: string;
  behaviourNotes: string;
  problemSolving: ProficiencyLevel;
  teamwork: ProficiencyLevel;
  communication: ProficiencyLevel;
  creativity: ProficiencyLevel;
  confidenceRating: number; // 0-100
}

export interface HumanValidationRecord {
  status: 'Pending Review' | 'Approved' | 'Modified / Overridden' | 'Rejected' | 'More Evidence Requested';
  originalRoleId: string;
  originalRoleTitle: string;
  originalScore: number;
  finalRoleId: string;
  finalRoleTitle: string;
  evaluatorId: string;
  evaluatorName: string;
  reason: string;
  comments: string;
  timestamp: string;
}

export interface StudentRecord {
  id: string;
  name: string;
  cohort: string;
  academicMarks: number; // 0-100 overall academic percentage
  subjectGrades: { subject: string; grade: string; score: number }[];
  projects: StudentProject[];
  practicalAssessments: PracticalAssessment[];
  portfolio: PortfolioEvidence[];
  demonstratedTechnicalSkills: string[];
  demonstratedSoftSkills: string[];
  observations: EvaluatorObservation[];
  interests: string[];
  preferredWorkEnvironment: 'Lab / Workshop' | 'Field / On-Site' | 'Office / Remote' | 'Industrial Plant' | 'Hybrid Technical';
  certifications: string[];
  attendanceRate: number; // 0-100
  evidenceConfidence: number; // 0-100 calculated or instructor-rated
  lastUpdated: string;
  evaluatorIdentity: string;
  groundTruthRoleId?: string; // Used for synthetic benchmark validation
  isDemoHighlight?: boolean;
  demoLabel?: string; // e.g. "Student A: High marks + weak practical evidence"
  humanValidation?: HumanValidationRecord;
  version?: number;
}

export interface CareerRole {
  id: string;
  title: string;
  category: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  requiredCompetencies: {
    competency: string;
    minProficiency: ProficiencyLevel;
  }[];
  relevantProjectTypes: string[];
  relevantPortfolioCategories: string[];
  relevantInterests: string[];
  relevantBehaviouralCompetencies: ('Problem Solving' | 'Teamwork' | 'Communication' | 'Creativity')[];
  optionalCertifications: string[];
  evidenceRequirements: string[];
  typicalWorkEnvironment: string;
}

export interface RecommendationWeights {
  technicalSkills: number; // default 30
  assessedCompetencies: number; // default 25
  projectEvidence: number; // default 20
  portfolioEvidence: number; // default 10
  interests: number; // default 10
  behaviourSoftSkills: number; // default 5
  academicSupplementaryCap: number; // default 0 (or optional 0-5% tie-breaker, never dominant)
}

export interface TraceableEvidenceItem {
  type: 'Skill' | 'Competency' | 'Project' | 'Portfolio' | 'Interest' | 'Behaviour' | 'Certification';
  label: string;
  sourceId: string; // e.g. "Project P102", "Assessment A21", "Portfolio PF44", "Evaluation E17"
  detail: string;
}

export interface RoleRecommendationResult {
  roleId: string;
  roleTitle: string;
  roleCategory: string;
  overallCompatibilityScore: number; // 0-100
  skillMatchScore: number; // 0-100
  competencyMatchScore: number; // 0-100
  projectEvidenceScore: number; // 0-100
  portfolioEvidenceScore: number; // 0-100
  interestAlignmentScore: number; // 0-100
  behaviourAlignmentScore: number; // 0-100
  academicScore: number; // 0-100 (supplementary indicator only)
  matchedEvidence: TraceableEvidenceItem[];
  missingSkills: string[];
  evidenceGaps: string[];
  confidenceLevel: number; // 0-100
  confidenceStatus: 'High Confidence' | 'Moderate Confidence' | 'Low Confidence — Insufficient Evidence' | 'Flagged — Conflicting Evidence' | 'Flagged — Evaluator Disagreement';
  flags: string[];
  suggestedActivities: string[];
}

export interface BaselineRecommendationResult {
  roleId: string;
  roleTitle: string;
  baselineScore: number; // Calculated purely from Academic Marks (60%) + Self-Reported Interests (40%)
  reasoning: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: 'Evaluator' | 'Administrator' | 'Field Instructor' | 'System Engine';
  actionType:
    | 'RECOMMENDATION_GENERATED'
    | 'HUMAN_APPROVAL'
    | 'HUMAN_OVERRIDE'
    | 'HUMAN_REJECT'
    | 'EVIDENCE_REQUESTED'
    | 'DATA_MODIFICATION'
    | 'FIELD_ENTRY_CREATED'
    | 'FIELD_SYNC_COMPLETED'
    | 'CONFLICT_RESOLVED'
    | 'ROLE_REQUIREMENT_MODIFIED'
    | 'WEIGHTS_MODIFIED';
  studentId?: string;
  studentName?: string;
  originalRecommendation?: string;
  finalRecommendation?: string;
  score?: number;
  evidenceUsed: string[];
  reasonOrNotes: string;
}

export interface OfflineFieldRecord {
  id: string;
  studentId: string;
  studentName: string;
  evaluatorName: string;
  activityType: 'Practical Assessment' | 'Project Artifact' | 'Portfolio Evidence' | 'Behaviour Observation';
  title: string;
  description: string;
  competencyName: string;
  proficiency: ProficiencyLevel;
  demonstratedSkills: string[];
  projectType: string;
  portfolioCategory: string;
  observationNotes: string;
  createdAt: string;
  syncStatus: 'Pending Sync' | 'Synced' | 'Conflict Detected' | 'Sync Failed';
  localVersion: Partial<StudentRecord>;
  serverConflictVersion?: Partial<StudentRecord>;
  conflictReason?: string;
}

export interface StakeholderFeedbackEntry {
  id: string;
  evaluatorName: string;
  evaluatorRole: string;
  timestamp: string;
  isDemoSample: boolean;
  understandableRating: number; // 1-5
  evidenceSupportRating: number; // 1-5
  workflowPracticalityRating: number; // 1-5
  offlineModeUtilityRating: number; // 1-5
  explanationsUsefulRating: number; // 1-5
  trustWithHumanReviewRating: number; // 1-5
  improvementSuggestions: string;
}

export type AppPageId =
  | 'home'
  | 'students'
  | 'student-profile'
  | 'evidence-collection'
  | 'skill-profile'
  | 'recommendations'
  | 'evidence-explanation'
  | 'human-review'
  | 'audit-trail'
  | 'offline-field'
  | 'sync-conflict'
  | 'role-database'
  | 'experiment'
  | 'failure-analysis'
  | 'risk-analysis'
  | 'stakeholder-feedback'
  | 'admin-settings';
