/**
 * Shared doctor directory — one catalog request shared across every card/list
 * that needs « id → name/specialty » lookups (patient appointments list, cards).
 */
import { useEffect, useState } from 'react';
import { doctorService } from './index';

export interface DoctorEntry {
  name: string;
  specialty: string;
}

let directoryPromise: Promise<Record<string, DoctorEntry>> | null = null;

function loadDirectory(): Promise<Record<string, DoctorEntry>> {
  directoryPromise ??= doctorService.list().then((doctors) =>
    Object.fromEntries(doctors.map((d) => [d.id, { name: `Dr ${d.firstName} ${d.lastName}`, specialty: d.specialty }])),
  );
  return directoryPromise;
}

export function useDoctorDirectory(): Record<string, DoctorEntry> {
  const [directory, setDirectory] = useState<Record<string, DoctorEntry>>({});
  useEffect(() => {
    let alive = true;
    loadDirectory().then((dir) => {
      if (alive) setDirectory(dir);
    });
    return () => {
      alive = false;
    };
  }, []);
  return directory;
}
