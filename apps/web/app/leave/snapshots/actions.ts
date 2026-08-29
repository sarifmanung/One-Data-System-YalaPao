'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

type ApiErrorBody = {
  detail?: unknown;
  message?: unknown;
  title?: unknown;
};

function textValue(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function redirectWithNotice(type: 'success' | 'error', message: string): never {
  const params = new URLSearchParams({ noticeType: type, notice: message });
  redirect(`/leave/snapshots?${params.toString()}`);
}

function errorMessage(body: ApiErrorBody | null, fallback: string): string {
  for (const key of ['detail', 'message', 'title'] as const) {
    const value = body?.[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return fallback;
}

async function callApi(
  path: string,
  affiliationId: string,
  body?: Record<string, unknown>,
): Promise<void> {
  const apiUrl = process.env.ONEDATA_API_URL ?? 'http://localhost:3100';
  const webOrigin = process.env.ONEDATA_PUBLIC_WEB_URL?.trim();
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-tenant-id': affiliationId,
      ...(webOrigin ? { origin: webOrigin } : {}),
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as ApiErrorBody | null;
    throw new Error(errorMessage(payload, `ดำเนินการไม่สำเร็จ (HTTP ${response.status})`));
  }
}

export async function prepareLeaveSnapshot(formData: FormData): Promise<void> {
  const affiliationId = textValue(formData, 'affiliationId');
  const period = textValue(formData, 'period');
  if (!affiliationId || !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
    redirectWithNotice('error', 'กรุณาระบุงวดในรูปแบบ YYYY-MM');
  }
  try {
    await callApi('/api/v1/integrations/special/leave-snapshots/prepare', affiliationId, { period });
  } catch (error) {
    redirectWithNotice('error', error instanceof Error ? error.message : 'เตรียม snapshot ไม่สำเร็จ');
  }
  redirectWithNotice('success', 'เตรียม snapshot แล้ว กรุณาตรวจ reconciliation ก่อนส่ง');
}

export async function deliverLeaveSnapshot(formData: FormData): Promise<void> {
  const affiliationId = textValue(formData, 'affiliationId');
  const batchId = textValue(formData, 'batchId');
  if (!affiliationId || !batchId) {
    redirectWithNotice('error', 'ไม่พบ batch ที่ต้องการส่ง');
  }
  try {
    await callApi(`/api/v1/integrations/special/leave-snapshots/${encodeURIComponent(batchId)}/deliver`, affiliationId);
  } catch (error) {
    redirectWithNotice('error', error instanceof Error ? error.message : 'ส่ง snapshot ไม่สำเร็จ');
  }
  redirectWithNotice('success', 'ส่ง snapshot ไปยังระบบ ฉ. แล้ว');
}

export async function saveLeaveSnapshotSchedule(formData: FormData): Promise<void> {
  const affiliationId = textValue(formData, 'affiliationId');
  const cutoffDays = Number(textValue(formData, 'cutoffDays'));
  const contractVersion = textValue(formData, 'contractVersion');
  if (!affiliationId || !Number.isInteger(cutoffDays) || cutoffDays < 0 || cutoffDays > 31) {
    redirectWithNotice('error', 'จำนวนวันหลังสิ้นงวดต้องอยู่ระหว่าง 0 ถึง 31 วัน');
  }
  try {
    await callApi('/api/v1/integrations/special/leave-snapshots/schedules', affiliationId, {
      affiliationId,
      cutoffDays,
      contractVersion,
    });
  } catch (error) {
    redirectWithNotice('error', error instanceof Error ? error.message : 'บันทึก schedule ไม่สำเร็จ');
  }
  redirectWithNotice('success', 'บันทึก schedule เป็นฉบับร่างแล้ว');
}

export async function approveLeaveSnapshotSchedule(formData: FormData): Promise<void> {
  await transitionSchedule(formData, 'approve', 'อนุมัติ schedule แล้ว');
}

export async function pauseLeaveSnapshotSchedule(formData: FormData): Promise<void> {
  await transitionSchedule(formData, 'pause', 'หยุด schedule แล้ว');
}

async function transitionSchedule(
  formData: FormData,
  action: 'approve' | 'pause',
  successMessage: string,
): Promise<void> {
  const affiliationId = textValue(formData, 'affiliationId');
  const scheduleId = textValue(formData, 'scheduleId');
  if (!affiliationId || !scheduleId) {
    redirectWithNotice('error', 'ไม่พบ schedule ที่ต้องการเปลี่ยนสถานะ');
  }
  try {
    await callApi(
      `/api/v1/integrations/special/leave-snapshots/schedules/${encodeURIComponent(scheduleId)}/${action}`,
      affiliationId,
    );
  } catch (error) {
    redirectWithNotice('error', error instanceof Error ? error.message : 'เปลี่ยนสถานะ schedule ไม่สำเร็จ');
  }
  redirectWithNotice('success', successMessage);
}
