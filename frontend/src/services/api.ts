import { AlertItem, Insight, ReportChatResponse, ReportSummary, VitalEnvelope } from '../types/health';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export function fetchHistory(): Promise<VitalEnvelope[]> {
  return request<VitalEnvelope[]>('/vitals/history?limit=60');
}

export async function fetchLatestVitals(): Promise<VitalEnvelope | null> {
  const history = await request<VitalEnvelope[]>('/vitals/history?limit=1');
  return history.length ? history[history.length - 1] : null;
}

export function fetchAlerts(): Promise<AlertItem[]> {
  return request<AlertItem[]>('/alerts?limit=20');
}

export function fetchLatestInsight(): Promise<Insight> {
  return request<Insight>('/ai/latest');
}

export function triggerInsight(): Promise<Insight> {
  return request<Insight>('/ai/analyze', { method: 'POST' });
}

export function fetchReports(): Promise<ReportSummary[]> {
  return request<ReportSummary[]>('/reports/history');
}

export function fetchReport(reportId: string): Promise<ReportSummary> {
  return request<ReportSummary>(`/reports/${reportId}`);
}

export function askReportsQuestion(question: string): Promise<ReportChatResponse> {
  return request<ReportChatResponse>('/reports/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
}
