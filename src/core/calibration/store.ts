import { getDb } from '../progress/db';
import type { CalibrationData } from './types';

export async function loadCalibration(profile: string): Promise<CalibrationData> {
  try {
    const row = await getDb().calibration.get(profile);
    return (row?.data as CalibrationData) ?? {};
  } catch {
    return {};
  }
}

export async function saveCalibration(profile: string, patch: Partial<CalibrationData>): Promise<CalibrationData> {
  const prev = await loadCalibration(profile);
  const data: CalibrationData = { ...prev, ...patch, updatedAt: Date.now() };
  await getDb().calibration.put({ profile, updatedAt: data.updatedAt!, data });
  return data;
}

export async function clearCalibration(profile: string): Promise<void> {
  await getDb().calibration.delete(profile);
}
