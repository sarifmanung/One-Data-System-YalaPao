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
  redirect(`/leave?${params.toString()}`);
}

function errorMessage(body: ApiErrorBody | null, fallback: string): string {
  if (typeof body?.detail === 'string' && body.detail.length > 0) {
    return body.detail;
  }
  if (typeof body?.message === 'string' && body.message.length > 0) {
    return body.message;
  }
  if (typeof body?.title === 'string' && body.title.length > 0) {
    return body.title;
  }
  return fallback;
}

async function callApi(
  path: string,
  method: 'POST',
  tenantId: string,
  body?: Record<string, unknown>,
): Promise<void> {
  const apiUrl = process.env.ONEDATA_API_URL ?? 'http://localhost:3100';
  const webOrigin = process.env.ONEDATA_PUBLIC_WEB_URL?.trim();
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'x-tenant-id': tenantId,
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

export async function createLeaveRequest(formData: FormData): Promise<void> {
  const tenantId = textValue(formData, 'tenantId');
  const leaveTypeId = textValue(formData, 'leaveTypeId');
  const startsOn = textValue(formData, 'startsOn');
  const endsOn = textValue(formData, 'endsOn');
  const reason = textValue(formData, 'reason');

  if (!tenantId || !leaveTypeId || !startsOn || !endsOn) {
    redirectWithNotice('error', 'กรุณากรอกประเภทลาและช่วงวันที่ให้ครบถ้วน');
  }

  try {
    await callApi('/api/v1/leave/requests', 'POST', tenantId, {
      leaveTypeId,
      startsOn,
      endsOn,
      ...(reason ? { reason } : {}),
    });
  } catch (error) {
    redirectWithNotice('error', error instanceof Error ? error.message : 'สร้างใบลาไม่สำเร็จ');
  }

  redirectWithNotice('success', 'บันทึกใบลาฉบับร่างแล้ว');
}

export async function submitLeaveRequest(formData: FormData): Promise<void> {
  const tenantId = textValue(formData, 'tenantId');
  const requestId = textValue(formData, 'requestId');
  if (!tenantId || !requestId) {
    redirectWithNotice('error', 'ไม่พบข้อมูลใบลาที่ต้องการส่ง');
  }

  try {
    await callApi(`/api/v1/leave/requests/${encodeURIComponent(requestId)}/submit`, 'POST', tenantId);
  } catch (error) {
    redirectWithNotice('error', error instanceof Error ? error.message : 'ส่งใบลาไม่สำเร็จ');
  }

  redirectWithNotice('success', 'ส่งใบลาเพื่อดำเนินการเอกสารกระดาษแล้ว');
}

export async function cancelLeaveRequest(formData: FormData): Promise<void> {
  const tenantId = textValue(formData, 'tenantId');
  const requestId = textValue(formData, 'requestId');
  if (!tenantId || !requestId) {
    redirectWithNotice('error', 'ไม่พบข้อมูลใบลาที่ต้องการยกเลิก');
  }

  try {
    await callApi(`/api/v1/leave/requests/${encodeURIComponent(requestId)}/cancel`, 'POST', tenantId);
  } catch (error) {
    redirectWithNotice('error', error instanceof Error ? error.message : 'ยกเลิกใบลาไม่สำเร็จ');
  }

  redirectWithNotice('success', 'ยกเลิกใบลาแล้ว และเก็บประวัติไว้ในระบบ');
}

export async function recordPaperResult(formData: FormData): Promise<void> {
  const tenantId = textValue(formData, 'tenantId');
  const requestId = textValue(formData, 'requestId');
  const result = textValue(formData, 'result');
  const approvedDays = textValue(formData, 'approvedDays');
  const documentNumber = textValue(formData, 'documentNumber');
  const documentDate = textValue(formData, 'documentDate');
  const reason = textValue(formData, 'reason');
  if (!tenantId || !requestId || !result) {
    redirectWithNotice('error', 'กรุณาระบุผลจากเอกสารกระดาษ');
  }

  const numericApprovedDays = approvedDays ? Number(approvedDays) : null;
  if (numericApprovedDays !== null && (!Number.isFinite(numericApprovedDays) || numericApprovedDays <= 0)) {
    redirectWithNotice('error', 'จำนวนวันที่อนุมัติต้องเป็นตัวเลขมากกว่าศูนย์');
  }

  try {
    await callApi(`/api/v1/leave/requests/${encodeURIComponent(requestId)}/paper-result`, 'POST', tenantId, {
      result,
      ...(numericApprovedDays !== null ? { approvedDays: numericApprovedDays } : {}),
      ...(documentNumber ? { documentNumber } : {}),
      ...(documentDate ? { documentDate } : {}),
      ...(reason ? { reason } : {}),
    });
  } catch (error) {
    redirectWithNotice('error', error instanceof Error ? error.message : 'บันทึกผลเอกสารกระดาษไม่สำเร็จ');
  }

  redirectWithNotice('success', 'บันทึกผลเอกสารกระดาษแล้ว');
}

export async function voidLeaveRequest(formData: FormData): Promise<void> {
  const tenantId = textValue(formData, 'tenantId');
  const requestId = textValue(formData, 'requestId');
  const reason = textValue(formData, 'reason');
  if (!tenantId || !requestId || !reason) {
    redirectWithNotice('error', 'กรุณาระบุเหตุผลก่อนทำให้ใบลาเป็นโมฆะ');
  }

  try {
    await callApi(`/api/v1/leave/requests/${encodeURIComponent(requestId)}/void`, 'POST', tenantId, { reason });
  } catch (error) {
    redirectWithNotice('error', error instanceof Error ? error.message : 'ทำให้ใบลาเป็นโมฆะไม่สำเร็จ');
  }

  redirectWithNotice('success', 'ทำให้ใบลาเป็นโมฆะแล้ว และเก็บประวัติเดิมไว้');
}
