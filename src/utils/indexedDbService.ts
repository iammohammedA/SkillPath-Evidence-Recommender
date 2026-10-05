import { OfflineFieldRecord } from '../types';

const DB_NAME = 'SkillEvidenceFieldDB';
const DB_VERSION = 1;
const STORE_FIELD_QUEUE = 'offline_field_queue';

function openFieldDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_FIELD_QUEUE)) {
        db.createObjectStore(STORE_FIELD_QUEUE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineFieldRecord(record: OfflineFieldRecord): Promise<void> {
  const db = await openFieldDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FIELD_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_FIELD_QUEUE);
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllOfflineFieldRecords(): Promise<OfflineFieldRecord[]> {
  const db = await openFieldDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FIELD_QUEUE, 'readonly');
    const store = tx.objectStore(STORE_FIELD_QUEUE);
    const req = store.getAll();
    req.onsuccess = () => {
      const list = (req.result || []) as OfflineFieldRecord[];
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteOfflineFieldRecord(id: string): Promise<void> {
  const db = await openFieldDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FIELD_QUEUE, 'readwrite');
    const store = tx.objectStore(STORE_FIELD_QUEUE);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function seedInitialFieldConflictIfEmpty(): Promise<OfflineFieldRecord[]> {
  const existing = await getAllOfflineFieldRecords();
  if (existing.length > 0) return existing;

  const sampleConflictRecord: OfflineFieldRecord = {
    id: 'FLD-801',
    studentId: 'STU-103',
    studentName: 'Mateo Silva',
    evaluatorName: 'H. Lindqvist (Field Tablet #04)',
    activityType: 'Practical Assessment',
    title: 'High-Voltage VFD Drive Commissioning Bench Test',
    description: 'Configured variable frequency drive acceleration ramps and emergency dynamic braking resistor on 3-phase induction motor.',
    competencyName: 'Three-Phase Power Wiring',
    proficiency: 5,
    demonstratedSkills: ['Three-Phase Wiring', 'Motor Controls', 'Safety Lockout/Tagout', 'PLC Programming'],
    projectType: 'Motor Control Panel',
    portfolioCategory: 'Wiring Schematic',
    observationNotes: 'Recorded offline inside basement motor control lab. Student completed VFD parameter tuning with zero safety infractions.',
    createdAt: '2026-10-04 08:40:12',
    syncStatus: 'Conflict Detected',
    conflictReason: 'Concurrent modification: Server record for STU-103 was updated at 08:42:05 by M. Kowalski while Field Tablet #04 was offline.',
    localVersion: {
      id: 'STU-103',
      name: 'Mateo Silva',
      evidenceConfidence: 97,
      demonstratedTechnicalSkills: ['PLC Programming', 'Ladder Logic', 'SCADA', 'Pneumatics', 'Industrial Sensors', 'Motor Controls', 'Three-Phase Wiring', 'Multimeter Diagnostics', 'Safety Lockout/Tagout', 'VFD Commissioning'],
      evaluatorIdentity: 'H. Lindqvist (Offline Field Tablet #04)',
      lastUpdated: '2026-10-04 08:40:12 (Local Offline)',
    },
    serverConflictVersion: {
      id: 'STU-103',
      name: 'Mateo Silva',
      evidenceConfidence: 95,
      demonstratedTechnicalSkills: ['PLC Programming', 'Ladder Logic', 'SCADA', 'Pneumatics', 'Industrial Sensors', 'Motor Controls', 'Three-Phase Wiring', 'Multimeter Diagnostics', 'Safety Lockout/Tagout'],
      evaluatorIdentity: 'M. Kowalski (Main Registry Server)',
      lastUpdated: '2026-10-04 08:42:05 (Server)',
    },
  };

  const samplePendingRecord: OfflineFieldRecord = {
    id: 'FLD-802',
    studentId: 'STU-101',
    studentName: 'Amina Vance',
    evaluatorName: 'M. Kowalski (Workshop Mobile)',
    activityType: 'Project Artifact',
    title: 'SIEM Wazuh Log Aggregation & Incident Playbook',
    description: 'Deployed Wazuh SIEM agent across 3 Linux endpoints and authored an automated brute-force incident response playbook.',
    competencyName: 'Security Incident Triage',
    proficiency: 4,
    demonstratedSkills: ['SIEM', 'Incident Response', 'Linux', 'Network Security'],
    projectType: 'Network Security',
    portfolioCategory: 'Incident Log',
    observationNotes: 'Captured offline in Cyber Range Room B. Closes previous SIEM experience gap.',
    createdAt: '2026-10-04 09:10:00',
    syncStatus: 'Pending Sync',
    localVersion: {
      id: 'STU-101',
      name: 'Amina Vance',
      evidenceConfidence: 96,
      demonstratedTechnicalSkills: ['Linux', 'Python', 'Network Security', 'Packet Analysis', 'Firewall Configuration', 'Bash Scripting', 'TCP/IP', 'SIEM', 'Incident Response'],
      evaluatorIdentity: 'M. Kowalski (Workshop Mobile)',
      lastUpdated: '2026-10-04 09:10:00 (Local Offline)',
    },
  };

  await saveOfflineFieldRecord(sampleConflictRecord);
  await saveOfflineFieldRecord(samplePendingRecord);
  return [samplePendingRecord, sampleConflictRecord];
}
