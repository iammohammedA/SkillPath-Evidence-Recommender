import {
  CareerRole,
  StudentRecord,
  RecommendationWeights,
  RoleRecommendationResult,
  BaselineRecommendationResult,
  TraceableEvidenceItem,
} from '../types';

/**
 * Deterministic, transparent, evidence-based career recommendation engine.
 * Calculates compatibility scores using demonstrated evidence and explicitly
 * traces every matched item back to Project IDs, Assessment IDs, Portfolio IDs, or Evaluator IDs.
 */
export function evaluateStudentForRoles(
  student: StudentRecord,
  roles: CareerRole[],
  weights: RecommendationWeights
): RoleRecommendationResult[] {
  // Normalize weights so they sum to 100%
  const totalPrimaryWeight =
    weights.technicalSkills +
    weights.assessedCompetencies +
    weights.projectEvidence +
    weights.portfolioEvidence +
    weights.interests +
    weights.behaviourSoftSkills +
    weights.academicSupplementaryCap;

  const norm = totalPrimaryWeight > 0 ? 100 / totalPrimaryWeight : 1;

  // Detect evaluator disagreement across assessments on the same competency
  const competencyEvaluations = new Map<string, number[]>();
  for (const assessment of student.practicalAssessments) {
    const list = competencyEvaluations.get(assessment.competency) || [];
    list.push(assessment.proficiency);
    competencyEvaluations.set(assessment.competency, list);
  }
  let hasEvaluatorDisagreement = false;
  let disagreementDetail = '';
  competencyEvaluations.forEach((proficiencies, comp) => {
    if (proficiencies.length > 1) {
      const maxP = Math.max(...proficiencies);
      const minP = Math.min(...proficiencies);
      if (maxP - minP >= 2) {
        hasEvaluatorDisagreement = true;
        disagreementDetail = `Evaluator disagreement detected on "${comp}" (proficiency ratings diverge from ${minP}/5 to ${maxP}/5).`;
      }
    }
  });

  // Collect all unique skills demonstrated across student record, projects, and portfolio
  const skillSources = new Map<string, string>();
  student.demonstratedTechnicalSkills.forEach(s => {
    skillSources.set(s.toLowerCase(), 'Verified Skill Profile');
  });
  student.projects.forEach(p => {
    p.technologies.forEach(t => {
      skillSources.set(t.toLowerCase(), `Project ${p.id}`);
    });
  });
  student.portfolio.forEach(pf => {
    pf.demonstratedSkills.forEach(s => {
      if (!skillSources.has(s.toLowerCase())) {
        skillSources.set(s.toLowerCase(), `Portfolio ${pf.id}`);
      }
    });
  });

  // Check total evidence volume for confidence calculation
  const totalEvidenceItems =
    student.projects.length +
    student.practicalAssessments.length +
    student.portfolio.length;

  const results: RoleRecommendationResult[] = roles.map(role => {
    const matchedEvidence: TraceableEvidenceItem[] = [];
    const missingSkills: string[] = [];
    const evidenceGaps: string[] = [];
    const flags: string[] = [];

    // 1. Technical Skills Match (Required 75% weight, Preferred 25% weight within skill score)
    let matchedRequiredCount = 0;
    role.requiredSkills.forEach(reqSkill => {
      const source = skillSources.get(reqSkill.toLowerCase());
      if (source) {
        matchedRequiredCount++;
        matchedEvidence.push({
          type: 'Skill',
          label: `${reqSkill} demonstrated`,
          sourceId: source,
          detail: `Required skill verified via ${source}`,
        });
      } else {
        missingSkills.push(reqSkill);
      }
    });

    let matchedPreferredCount = 0;
    role.preferredSkills.forEach(prefSkill => {
      const source = skillSources.get(prefSkill.toLowerCase());
      if (source) {
        matchedPreferredCount++;
        matchedEvidence.push({
          type: 'Skill',
          label: `${prefSkill} demonstrated (Preferred)`,
          sourceId: source,
          detail: `Preferred skill verified via ${source}`,
        });
      } else {
        // Also track top preferred skills as growth areas if not met
        if (missingSkills.length < 4) {
          missingSkills.push(`${prefSkill} (Preferred)`);
        }
      }
    });

    const reqRatio = role.requiredSkills.length > 0 ? matchedRequiredCount / role.requiredSkills.length : 1;
    const prefRatio = role.preferredSkills.length > 0 ? matchedPreferredCount / role.preferredSkills.length : 0;
    const skillMatchScore = Math.min(100, Math.round(reqRatio * 80 + prefRatio * 20));

    // 2. Assessed Competencies Match
    let competencyScoreAccum = 0;
    role.requiredCompetencies.forEach(reqComp => {
      // Find matching practical assessments
      const matchingAssessments = student.practicalAssessments.filter(
        a => a.competency.toLowerCase() === reqComp.competency.toLowerCase()
      );
      if (matchingAssessments.length > 0) {
        // Use average proficiency if multiple evaluators graded it
        const avgProf =
          matchingAssessments.reduce((acc, item) => acc + item.proficiency, 0) /
          matchingAssessments.length;
        const primaryAssessment = matchingAssessments[0];
        const ratio = Math.min(1.15, avgProf / reqComp.minProficiency);
        competencyScoreAccum += Math.min(100, ratio * 100);

        const levelNames = ['', 'Novice', 'Beginner', 'Competent', 'Proficient', 'Advanced'];
        matchedEvidence.push({
          type: 'Competency',
          label: `${reqComp.competency} assessed at ${levelNames[Math.round(avgProf)] || 'Proficient'} level (${avgProf.toFixed(1)}/5)`,
          sourceId: `Practical Assessment ${primaryAssessment.id}`,
          detail: `${primaryAssessment.title} — Graded by ${primaryAssessment.evaluatorName} (${primaryAssessment.score}%)`,
        });

        if (avgProf < reqComp.minProficiency) {
          evidenceGaps.push(
            `${reqComp.competency} is below minimum proficiency (${avgProf.toFixed(1)}/5 vs required ${reqComp.minProficiency}/5)`
          );
        }
      } else {
        evidenceGaps.push(`Unassessed competency: ${reqComp.competency} (min level ${reqComp.minProficiency}/5)`);
      }
    });

    const competencyMatchScore =
      role.requiredCompetencies.length > 0
        ? Math.round(competencyScoreAccum / role.requiredCompetencies.length)
        : 0;

    // 3. Project Evidence Score
    let projectScoreAccum = 0;
    const relevantProjects = student.projects.filter(p => {
      const typeMatch = role.relevantProjectTypes.some(
        rt => rt.toLowerCase() === p.type.toLowerCase()
      );
      const techOverlap = p.technologies.some(t =>
        role.requiredSkills.some(rs => rs.toLowerCase() === t.toLowerCase())
      );
      return typeMatch || techOverlap;
    });

    if (relevantProjects.length > 0) {
      relevantProjects.forEach(proj => {
        const complexityBonus =
          proj.complexity === 'Advanced' ? 1.0 : proj.complexity === 'Intermediate' ? 0.85 : 0.65;
        projectScoreAccum += proj.score * complexityBonus;
        matchedEvidence.push({
          type: 'Project',
          label: `${proj.title} (${proj.complexity})`,
          sourceId: `Project ${proj.id}`,
          detail: `Demonstrated ${proj.technologies.slice(0, 4).join(', ')} — Verified by ${proj.verifiedBy}`,
        });
      });
      // Cap at 100; 1 strong advanced project gives ~85-95, 2+ gives up to 100
      const baseProjAvg = projectScoreAccum / relevantProjects.length;
      const countMultiplier = relevantProjects.length >= 2 ? 1.08 : 0.92;
      projectScoreAccum = Math.min(100, Math.round(baseProjAvg * countMultiplier));
    } else {
      evidenceGaps.push(`No verified practical project in ${role.relevantProjectTypes.join(' or ')}`);
    }
    const projectEvidenceScore = projectScoreAccum;

    // 4. Portfolio Evidence Score
    let portfolioScoreAccum = 0;
    const relevantPortfolio = student.portfolio.filter(pf => {
      const catMatch = role.relevantPortfolioCategories.some(
        rc => rc.toLowerCase() === pf.category.toLowerCase()
      );
      const skillOverlap = pf.demonstratedSkills.some(s =>
        role.requiredSkills.some(rs => rs.toLowerCase() === s.toLowerCase())
      );
      return catMatch || skillOverlap;
    });

    if (relevantPortfolio.length > 0) {
      relevantPortfolio.forEach(pf => {
        matchedEvidence.push({
          type: 'Portfolio',
          label: `${pf.title} [${pf.category}]`,
          sourceId: `Portfolio ${pf.id}`,
          detail: pf.description,
        });
      });
      portfolioScoreAccum = Math.min(100, relevantPortfolio.length * 60 + 30);
    } else {
      evidenceGaps.push(`Missing portfolio artifact (${role.relevantPortfolioCategories.slice(0, 2).join(' / ')})`);
    }
    const portfolioEvidenceScore = portfolioScoreAccum;

    // 5. Interest Alignment Score
    const matchedInterests = student.interests.filter(interest =>
      role.relevantInterests.some(ri =>
        ri.toLowerCase().includes(interest.toLowerCase()) ||
        interest.toLowerCase().includes(ri.toLowerCase())
      )
    );
    matchedInterests.forEach(intItem => {
      matchedEvidence.push({
        type: 'Interest',
        label: `${intItem} interest selected`,
        sourceId: 'Student Interest Survey',
        detail: `Aligned with ${role.title} domain interests`,
      });
    });
    const interestAlignmentScore =
      matchedInterests.length >= 2 ? 100 : matchedInterests.length === 1 ? 75 : 15;

    // 6. Observed Behaviour & Soft Skills Score
    let behaviourScore = 50;
    if (student.observations.length > 0) {
      const obs = student.observations[0];
      const ratingMap: Record<string, number> = {
        'Problem Solving': obs.problemSolving,
        'Teamwork': obs.teamwork,
        'Communication': obs.communication,
        'Creativity': obs.creativity,
      };
      let sumRatings = 0;
      role.relevantBehaviouralCompetencies.forEach(beh => {
        const val = ratingMap[beh] || 3;
        sumRatings += (val / 5) * 100;
        if (val >= 4) {
          matchedEvidence.push({
            type: 'Behaviour',
            label: `${beh} competency rated highly (${val}/5)`,
            sourceId: `Instructor Evaluation ${obs.id}`,
            detail: `Observed by ${obs.evaluatorName}: "${obs.behaviourNotes.slice(0, 80)}..."`,
          });
        }
      });
      behaviourScore =
        role.relevantBehaviouralCompetencies.length > 0
          ? Math.round(sumRatings / role.relevantBehaviouralCompetencies.length)
          : 70;
    }

    // Certifications bonus check
    const matchedCerts = student.certifications.filter(c =>
      role.optionalCertifications.some(oc => oc.toLowerCase() === c.toLowerCase())
    );
    matchedCerts.forEach(cert => {
      matchedEvidence.push({
        type: 'Certification',
        label: `Certified: ${cert}`,
        sourceId: 'Verified Credential Registry',
        detail: `Recognized industry certification for ${role.title}`,
      });
    });

    // Weighted overall score calculation
    const rawWeighted =
      (skillMatchScore * weights.technicalSkills * norm +
        competencyMatchScore * weights.assessedCompetencies * norm +
        projectEvidenceScore * weights.projectEvidence * norm +
        portfolioEvidenceScore * weights.portfolioEvidence * norm +
        interestAlignmentScore * weights.interests * norm +
        behaviourScore * weights.behaviourSoftSkills * norm +
        student.academicMarks * weights.academicSupplementaryCap * norm) /
      100;

    const certBonus = matchedCerts.length > 0 ? 3 : 0;
    const overallCompatibilityScore = Math.min(99, Math.max(5, Math.round(rawWeighted + certBonus)));

    // Confidence & Failure Mode Detection
    let confidenceLevel = Math.round(
      (student.evidenceConfidence * 0.5) +
      (Math.min(totalEvidenceItems, 6) / 6) * 50
    );

    let confidenceStatus: RoleRecommendationResult['confidenceStatus'] = 'High Confidence';

    // Failure Case 1: Insufficient Evidence
    if (totalEvidenceItems <= 1 || student.practicalAssessments.length === 0 || (student.portfolio.length === 0 && student.projects.length <= 1)) {
      confidenceLevel = Math.min(confidenceLevel, 38);
      confidenceStatus = 'Low Confidence — Insufficient Evidence';
      flags.push('Insufficient practical & portfolio evidence: Student has academic marks/interests but lacks verified workshop artifacts.');
    }

    // Failure Case 2: Conflicting Evidence vs Self-Reported Interests
    const practicalCoreStrength = (skillMatchScore + competencyMatchScore + projectEvidenceScore) / 3;
    if (practicalCoreStrength >= 75 && interestAlignmentScore <= 20) {
      confidenceStatus = 'Flagged — Conflicting Evidence';
      flags.push(
        `Conflicting Evidence: Demonstrated practical skills strongly match ${role.title} (${Math.round(practicalCoreStrength)}% technical evidence), but student self-reported interests (${student.interests.join(', ')}) point to a different domain.`
      );
    } else if (interestAlignmentScore >= 75 && practicalCoreStrength <= 30) {
      flags.push(
        `Unverified Interest Claim: Student claims interest in ${role.title}, but demonstrated workshop evidence is ${Math.round(practicalCoreStrength)}%.`
      );
    }

    // Failure Case 3: Biased / Split Evaluator Disagreement
    if (hasEvaluatorDisagreement) {
      confidenceStatus = 'Flagged — Evaluator Disagreement';
      confidenceLevel = Math.min(confidenceLevel, 64);
      flags.push(disagreementDetail);
    }

    // Concrete suggested activities based on missing skills & gaps
    const suggestedActivities: string[] = [];
    missingSkills.slice(0, 3).forEach(ms => {
      const cleanSkill = ms.replace(' (Preferred)', '');
      suggestedActivities.push(`Complete supervised workshop lab & practical checkoff in ${cleanSkill}`);
    });
    if (student.portfolio.length === 0) {
      suggestedActivities.push(`Upload at least 1 verified ${role.relevantPortfolioCategories[0] || 'technical artifact'} to student portfolio`);
    }
    if (suggestedActivities.length === 0) {
      suggestedActivities.push(`Ready for industry capstone placement or employer apprenticeship in ${role.title}`);
    }

    return {
      roleId: role.id,
      roleTitle: role.title,
      roleCategory: role.category,
      overallCompatibilityScore,
      skillMatchScore,
      competencyMatchScore,
      projectEvidenceScore,
      portfolioEvidenceScore,
      interestAlignmentScore,
      behaviourAlignmentScore: behaviourScore,
      academicScore: student.academicMarks,
      matchedEvidence,
      missingSkills,
      evidenceGaps,
      confidenceLevel,
      confidenceStatus,
      flags,
      suggestedActivities,
    };
  });

  return results.sort((a, b) => b.overallCompatibilityScore - a.overallCompatibilityScore);
}

/**
 * Conventional Baseline Recommender: Marks (60%) + Self-Reported Interests (40%).
 * Used in side-by-side comparison and Experiment Module to prove why demonstrated evidence is superior.
 */
export function evaluateBaselineForRoles(
  student: StudentRecord,
  roles: CareerRole[]
): BaselineRecommendationResult[] {
  // Deterministic academic tier preference bias (conventional systems map high academic marks to desk/analytic/cyber roles)
  const academicPrestigeBias: Record<string, number> = {
    'ROLE-CYBER': 92,
    'ROLE-DEV': 90,
    'ROLE-DATA': 88,
    'ROLE-CLOUD': 84,
    'ROLE-IOT': 78,
    'ROLE-CAD': 75,
    'ROLE-NET': 72,
    'ROLE-ELX': 70,
    'ROLE-AUTO': 68,
    'ROLE-ELEC': 65,
  };

  const results: BaselineRecommendationResult[] = roles.map(role => {
    const matchedInterests = student.interests.filter(interest =>
      role.relevantInterests.some(ri =>
        ri.toLowerCase().includes(interest.toLowerCase()) ||
        interest.toLowerCase().includes(ri.toLowerCase())
      )
    );
    const interestScore = matchedInterests.length >= 2 ? 100 : matchedInterests.length === 1 ? 75 : 20;

    // Academic alignment in naive baseline: higher marks boost high-theory roles
    const roleTheoryTarget = academicPrestigeBias[role.id] || 75;
    const markProximity = Math.max(0, 100 - Math.abs(student.academicMarks - roleTheoryTarget) * 1.4);

    const baselineScore = Math.round(markProximity * 0.55 + interestScore * 0.45);

    return {
      roleId: role.id,
      roleTitle: role.title,
      baselineScore,
      reasoning: `Calculated strictly from Academic Marks (${student.academicMarks}%) and Self-Reported Interests (${
        matchedInterests.length > 0 ? matchedInterests.join(', ') : 'No direct interest match'
      }). Ignores workshop projects and practical assessments.`,
    };
  });

  return results.sort((a, b) => b.baselineScore - a.baselineScore);
}
