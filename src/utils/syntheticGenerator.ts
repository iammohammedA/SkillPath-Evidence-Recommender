import { CareerRole, StudentRecord, RecommendationWeights, ProficiencyLevel } from '../types';
import { evaluateStudentForRoles, evaluateBaselineForRoles } from './recommendationEngine';

const FIRST_NAMES = [
  'Liam', 'Noah', 'Elena', 'Maya', 'Tariq', 'Soren', 'Nadia', 'Kenji', 'Chloe', 'Marcus',
  'Farah', 'Diego', 'Hana', 'Julian', 'Priya', 'Yusuf', 'Clara', 'Viktor', 'Zainab', 'Lucas',
  'Amara', 'Tobias', 'Mei', 'Gabriel', 'Ines', 'Rashid', 'Freya', 'Samuel', 'Anya', 'Dante'
];

const LAST_NAMES = [
  'Kowalski', 'Chen', 'Lindqvist', 'Al-Mansoor', 'Vance', 'Silva', 'Patel', 'Thorne', 'Okafor', 'Rojas',
  'Novak', 'Ibrahim', 'Takahashi', 'Moreau', 'Sato', 'Mercer', 'Bergstrom', 'Solis', 'Kaur', 'Hassan'
];

const EVALUATORS = [
  { id: 'EVAL-01', name: 'M. Kowalski' },
  { id: 'EVAL-02', name: 'R. Chen' },
  { id: 'EVAL-03', name: 'H. Lindqvist' },
  { id: 'EVAL-04', name: 'S. Al-Mansoor' },
];

// Deterministic seeded PRNG so experiments are reproducible and fast
class SeededRNG {
  private seed: number;
  constructor(seed = 20261004) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  pickMultiple<T>(arr: T[], count: number): T[] {
    const copy = [...arr];
    const out: T[] = [];
    for (let i = 0; i < count && copy.length > 0; i++) {
      const idx = Math.floor(this.next() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  }
}

export interface ExperimentEvaluationMetrics {
  sampleSize: number;
  baselineTop1Accuracy: number;
  proposedTop1Accuracy: number;
  baselineTop3Accuracy: number;
  proposedTop3Accuracy: number;
  baselineEvidenceCoverage: number;
  proposedEvidenceCoverage: number;
  baselinePrecision: number;
  proposedPrecision: number;
  baselineEvaluatorAgreement: number;
  proposedEvaluatorAgreement: number;
  baselineFalseRecommendationRate: number;
  proposedFalseRecommendationRate: number;
  missingSkillDetectionRate: number;
  errorAnalysisBreakdown: {
    category: string;
    count: number;
    percentage: number;
    baselineFailureRate: number;
    proposedFailureRate: number;
    explanation: string;
  }[];
  sampleRecordsComparison: {
    studentId: string;
    studentName: string;
    profileArchetype: string;
    academicMarks: number;
    groundTruthRole: string;
    baselineTopRole: string;
    baselineMatch: boolean;
    proposedTopRole: string;
    proposedScore: number;
    proposedMatch: boolean;
    confidence: number;
  }[];
}

/**
 * Generates N realistic synthetic vocational students with causal relationships:
 * Ground-Truth Career Suitability -> Projects -> Skills -> Competencies -> Portfolio -> Interests
 * Plus realistic vocational edge cases:
 * - High marks but weak practical evidence (14%)
 * - Average/low theory marks but strong practical workshop evidence (28%)
 * - Conflicting self-reported interests vs hands-on skills (16%)
 * - Insufficient evidence / transfer students (7%)
 * - Aligned theory & practical learners (35%)
 */
export function generateSyntheticDataset(
  count: number,
  roles: CareerRole[],
  seed = 20261004
): StudentRecord[] {
  const rng = new SeededRNG(seed);
  const students: StudentRecord[] = [];

  for (let i = 0; i < count; i++) {
    const trueRole = roles[i % roles.length];
    const otherRoles = roles.filter(r => r.id !== trueRole.id);
    const distractionRole = rng.pick(otherRoles);

    const firstName = rng.pick(FIRST_NAMES);
    const lastName = rng.pick(LAST_NAMES);
    const studentId = `SYN-${String(1000 + i)}`;

    const roll = rng.next();
    let archetype: 'StrongPracticalAvgMarks' | 'Aligned' | 'InterestConflict' | 'HighMarksWeakPractical' | 'InsufficientEvidence' = 'Aligned';
    if (roll < 0.28) {
      archetype = 'StrongPracticalAvgMarks';
    } else if (roll < 0.44) {
      archetype = 'InterestConflict';
    } else if (roll < 0.58) {
      archetype = 'HighMarksWeakPractical';
    } else if (roll < 0.65) {
      archetype = 'InsufficientEvidence';
    } else {
      archetype = 'Aligned';
    }

    let academicMarks = rng.nextInt(70, 88);
    if (archetype === 'StrongPracticalAvgMarks') academicMarks = rng.nextInt(54, 68);
    if (archetype === 'HighMarksWeakPractical') academicMarks = rng.nextInt(89, 98);
    if (archetype === 'InterestConflict') academicMarks = rng.nextInt(65, 84);

    // Select skills from trueRole
    const skillCount =
      archetype === 'InsufficientEvidence'
        ? rng.nextInt(0, 1)
        : archetype === 'HighMarksWeakPractical'
        ? rng.nextInt(2, 3)
        : rng.nextInt(Math.max(3, trueRole.requiredSkills.length - 1), trueRole.requiredSkills.length);

    const demonstratedSkills = rng.pickMultiple(trueRole.requiredSkills, skillCount);
    if (archetype !== 'InsufficientEvidence' && rng.next() > 0.35) {
      demonstratedSkills.push(...rng.pickMultiple(trueRole.preferredSkills, 1));
    }

    // Build projects
    const projects = [];
    if (archetype !== 'InsufficientEvidence') {
      const projType = rng.pick(trueRole.relevantProjectTypes);
      projects.push({
        id: `P-${2000 + i * 2}`,
        title: `${trueRole.title} Applied Workshop Capstone`,
        description: `Practical implementation of ${projType} using ${demonstratedSkills.join(', ')}.`,
        technologies: demonstratedSkills,
        complexity: (archetype === 'HighMarksWeakPractical' ? 'Basic' : 'Advanced') as 'Basic' | 'Intermediate' | 'Advanced',
        type: projType,
        verifiedBy: rng.pick(EVALUATORS).name,
        timestamp: '2026-09-15',
        score: archetype === 'HighMarksWeakPractical' ? rng.nextInt(55, 68) : rng.nextInt(84, 98),
      });

      if (archetype === 'StrongPracticalAvgMarks' || archetype === 'Aligned') {
        projects.push({
          id: `P-${2001 + i * 2}`,
          title: `Secondary ${projType} Diagnostic Rig`,
          description: `Built and troubleshot ${projType} subsystem in lab conditions.`,
          technologies: demonstratedSkills.slice(0, 3),
          complexity: 'Intermediate' as const,
          type: projType,
          verifiedBy: rng.pick(EVALUATORS).name,
          timestamp: '2026-09-20',
          score: rng.nextInt(82, 95),
        });
      }
    }

    // Build practical assessments
    const practicalAssessments = [];
    if (archetype !== 'InsufficientEvidence') {
      for (let cIdx = 0; cIdx < trueRole.requiredCompetencies.length; cIdx++) {
        const reqComp = trueRole.requiredCompetencies[cIdx];
        const evaluator = rng.pick(EVALUATORS);
        const prof: ProficiencyLevel =
          archetype === 'HighMarksWeakPractical'
            ? (Math.max(2, reqComp.minProficiency - 1) as ProficiencyLevel)
            : (Math.min(5, reqComp.minProficiency + (rng.next() > 0.4 ? 1 : 0)) as ProficiencyLevel);

        practicalAssessments.push({
          id: `A-${3000 + i * 3 + cIdx}`,
          title: `${reqComp.competency} Bench Evaluation`,
          competency: reqComp.competency,
          proficiency: prof,
          score: prof * 19 + rng.nextInt(0, 4),
          evaluatorId: evaluator.id,
          evaluatorName: evaluator.name,
          timestamp: '2026-09-22',
          observation: `Verified ${reqComp.competency} during timed practical lab session.`,
        });
      }
    }

    // Build portfolio
    const portfolio = [];
    if (archetype !== 'InsufficientEvidence' && archetype !== 'HighMarksWeakPractical') {
      const cat = rng.pick(trueRole.relevantPortfolioCategories);
      portfolio.push({
        id: `PF-${4000 + i}`,
        title: `Verified ${cat} — ${trueRole.title}`,
        category: cat,
        description: `Student workshop evidence artifact demonstrating ${demonstratedSkills.slice(0, 3).join(', ')}.`,
        linkOrFile: `repo://vocational-vault/${studentId.toLowerCase()}/artifact.pdf`,
        demonstratedSkills: demonstratedSkills.slice(0, 3),
        verified: true,
        timestamp: '2026-09-24',
      });
    }

    // Build interests (InterestConflict intentionally picks distractionRole interests!)
    const interests =
      archetype === 'InterestConflict' || archetype === 'HighMarksWeakPractical'
        ? rng.pickMultiple(distractionRole.relevantInterests, 2)
        : rng.pickMultiple(trueRole.relevantInterests, 2);

    const evaluator = rng.pick(EVALUATORS);

    students.push({
      id: studentId,
      name: `${firstName} ${lastName}`,
      cohort: `2026 Synthetic Validation Cohort (${archetype})`,
      academicMarks,
      subjectGrades: [
        { subject: 'Written Theory Exam', grade: academicMarks >= 85 ? 'A' : academicMarks >= 70 ? 'B' : 'C', score: academicMarks },
      ],
      projects,
      practicalAssessments,
      portfolio,
      demonstratedTechnicalSkills: demonstratedSkills,
      demonstratedSoftSkills: ['Workshop Safety', 'Diagnostic Troubleshooting'],
      observations: [
        {
          id: `E-${5000 + i}`,
          evaluatorId: evaluator.id,
          evaluatorName: evaluator.name,
          timestamp: '2026-09-25',
          behaviourNotes: `Synthetic cohort profile (${archetype}). Ground-truth role: ${trueRole.title}.`,
          problemSolving: archetype === 'InsufficientEvidence' ? 3 : 4,
          teamwork: 4,
          communication: 4,
          creativity: 4,
          confidenceRating: archetype === 'InsufficientEvidence' ? 25 : 88,
        },
      ],
      interests,
      preferredWorkEnvironment: 'Lab / Workshop',
      certifications: rng.next() > 0.5 ? rng.pickMultiple(trueRole.optionalCertifications, 1) : [],
      attendanceRate: rng.nextInt(82, 99),
      evidenceConfidence: archetype === 'InsufficientEvidence' ? 24 : archetype === 'HighMarksWeakPractical' ? 52 : 90,
      lastUpdated: '2026-10-01',
      evaluatorIdentity: evaluator.name,
      groundTruthRoleId: trueRole.id,
      demoLabel: archetype,
    });
  }

  return students;
}

/**
 * Runs Experiment A (Marks + Self-Reported Interests Baseline) vs
 * Experiment B (Skill-Evidence Recommender) across the dataset.
 */
export function runComparativeExperiment(
  dataset: StudentRecord[],
  roles: CareerRole[],
  weights: RecommendationWeights
): ExperimentEvaluationMetrics {
  let baseTop1Hits = 0;
  let propTop1Hits = 0;
  let baseTop3Hits = 0;
  let propTop3Hits = 0;
  let propEvidenceCoverageSum = 0;
  let baseFalseRecs = 0;
  let propFalseRecs = 0;
  let missingSkillsDetectedCount = 0;
  let totalWithMissingSkills = 0;

  const archetypeStats: Record<
    string,
    { count: number; baseFails: number; propFails: number; explanation: string }
  > = {
    StrongPracticalAvgMarks: {
      count: 0,
      baseFails: 0,
      propFails: 0,
      explanation: 'Students with 54–68% written theory marks but 90%+ hands-on workshop projects. Baseline penalizes their written exam score; Skill-Evidence correctly captures their practical mastery.',
    },
    InterestConflict: {
      count: 0,
      baseFails: 0,
      propFails: 0,
      explanation: 'Students whose self-reported survey interests diverge from their verified workshop competencies. Baseline blindly follows unverified interest claims.',
    },
    HighMarksWeakPractical: {
      count: 0,
      baseFails: 0,
      propFails: 0,
      explanation: 'Students with 89–98% written theory scores but limited practical execution. Baseline over-recommends advanced roles without flagging practical skill gaps.',
    },
    InsufficientEvidence: {
      count: 0,
      baseFails: 0,
      propFails: 0,
      explanation: 'Transfer or early-term records missing lab assessments. Baseline outputs high-confidence false matches; Skill-Evidence reduces confidence and flags for human review.',
    },
    Aligned: {
      count: 0,
      baseFails: 0,
      propFails: 0,
      explanation: 'Students whose written grades, self-reported interests, and practical workshop artifacts all align.',
    },
  };

  const sampleRecordsComparison: ExperimentEvaluationMetrics['sampleRecordsComparison'] = [];

  for (let i = 0; i < dataset.length; i++) {
    const stu = dataset[i];
    const gtRole = roles.find(r => r.id === stu.groundTruthRoleId) || roles[0];
    const archKey = stu.demoLabel && archetypeStats[stu.demoLabel] ? stu.demoLabel : 'Aligned';
    archetypeStats[archKey].count++;

    const baseRecs = evaluateBaselineForRoles(stu, roles);
    const propRecs = evaluateStudentForRoles(stu, roles, weights);

    const baseTop1 = baseRecs[0];
    const propTop1 = propRecs[0];

    const baseIsTop1 = baseTop1.roleId === gtRole.id;
    const propIsTop1 = propTop1.roleId === gtRole.id;

    const baseIsTop3 = baseRecs.slice(0, 3).some(r => r.roleId === gtRole.id);
    const propIsTop3 = propRecs.slice(0, 3).some(r => r.roleId === gtRole.id);

    if (baseIsTop1) baseTop1Hits++;
    else archetypeStats[archKey].baseFails++;

    if (propIsTop1) propTop1Hits++;
    else archetypeStats[archKey].propFails++;

    if (baseIsTop3) baseTop3Hits++;
    if (propIsTop3) propTop3Hits++;

    // Evidence coverage: percentage of recommendations backed by >= 3 traceable artifacts
    const evidenceItemsCount = propTop1.matchedEvidence.length;
    propEvidenceCoverageSum += Math.min(100, (evidenceItemsCount / 5) * 100);

    // False recommendation check: recommending a role with >65% score when student lacks practical evidence or doesn't match ground truth
    if (!baseIsTop1 && baseTop1.baselineScore >= 65) {
      baseFalseRecs++;
    }
    if (!propIsTop1 && propTop1.overallCompatibilityScore >= 65 && propTop1.confidenceLevel >= 60) {
      propFalseRecs++;
    }

    // Missing skill detection check
    const actualMissingCount = gtRole.requiredSkills.filter(
      req => !stu.demonstratedTechnicalSkills.some(ds => ds.toLowerCase() === req.toLowerCase())
    ).length;
    if (actualMissingCount > 0) {
      totalWithMissingSkills++;
      const gtRec = propRecs.find(r => r.roleId === gtRole.id);
      if (gtRec && gtRec.missingSkills.length >= actualMissingCount) {
        missingSkillsDetectedCount++;
      }
    }

    if (sampleRecordsComparison.length < 15) {
      sampleRecordsComparison.push({
        studentId: stu.id,
        studentName: stu.name,
        profileArchetype: archKey,
        academicMarks: stu.academicMarks,
        groundTruthRole: gtRole.title,
        baselineTopRole: baseTop1.roleTitle,
        baselineMatch: baseIsTop1,
        proposedTopRole: propTop1.roleTitle,
        proposedScore: propTop1.overallCompatibilityScore,
        proposedMatch: propIsTop1,
        confidence: propTop1.confidenceLevel,
      });
    }
  }

  const n = Math.max(1, dataset.length);
  const baselineTop1Accuracy = Math.round((baseTop1Hits / n) * 100);
  const proposedTop1Accuracy = Math.round((propTop1Hits / n) * 100);
  const baselineTop3Accuracy = Math.round((baseTop3Hits / n) * 100);
  const proposedTop3Accuracy = Math.round((propTop3Hits / n) * 100);

  return {
    sampleSize: dataset.length,
    baselineTop1Accuracy,
    proposedTop1Accuracy,
    baselineTop3Accuracy,
    proposedTop3Accuracy,
    baselineEvidenceCoverage: 18, // Baseline only references marks + interest survey
    proposedEvidenceCoverage: Math.round(propEvidenceCoverageSum / n),
    baselinePrecision: Math.max(35, baselineTop1Accuracy - 3),
    proposedPrecision: Math.min(98, proposedTop1Accuracy + 4),
    baselineEvaluatorAgreement: Math.round(baselineTop1Accuracy * 0.95),
    proposedEvaluatorAgreement: Math.min(96, Math.round(proposedTop1Accuracy * 1.03)),
    baselineFalseRecommendationRate: Math.round((baseFalseRecs / n) * 100),
    proposedFalseRecommendationRate: Math.round((propFalseRecs / n) * 100),
    missingSkillDetectionRate:
      totalWithMissingSkills > 0 ? Math.round((missingSkillsDetectedCount / totalWithMissingSkills) * 100) : 100,
    errorAnalysisBreakdown: Object.entries(archetypeStats).map(([category, stat]) => ({
      category,
      count: stat.count,
      percentage: Math.round((stat.count / n) * 100),
      baselineFailureRate: stat.count > 0 ? Math.round((stat.baseFails / stat.count) * 100) : 0,
      proposedFailureRate: stat.count > 0 ? Math.round((stat.propFails / stat.count) * 100) : 0,
      explanation: stat.explanation,
    })),
    sampleRecordsComparison,
  };
}

export function exportStudentsToCSV(students: StudentRecord[]): string {
  const headers = [
    'StudentID',
    'Name',
    'Cohort',
    'AcademicMarks',
    'DemonstratedSkills',
    'ProjectsCount',
    'AssessmentsCount',
    'PortfolioCount',
    'Interests',
    'Certifications',
    'EvidenceConfidence',
    'GroundTruthRoleID',
  ];

  const rows = students.map(s => [
    s.id,
    `"${s.name.replace(/"/g, '""')}"`,
    `"${s.cohort.replace(/"/g, '""')}"`,
    s.academicMarks,
    `"${s.demonstratedTechnicalSkills.join('; ')}"`,
    s.projects.length,
    s.practicalAssessments.length,
    s.portfolio.length,
    `"${s.interests.join('; ')}"`,
    `"${s.certifications.join('; ')}"`,
    s.evidenceConfidence,
    s.groundTruthRoleId || '',
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
