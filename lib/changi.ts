import { resolveTool, callTool } from './tools.js';

export interface TrafficIncident {
  id?: string;
  type?: string;
  message: string;
  expressway?: string;
  latitude?: number;
  longitude?: number;
  raw?: unknown;
}

export interface ChangiStatusResult {
  from?: string;
  flight_time: string;
  leave_by: string;
  leave_by_iso: string;
  standard_lead_hours: number;
  incident_count: number;
  incident_buffer_minutes: number;
  monitored_expressways: string[];
  affecting_incidents: TrafficIncident[];
  all_incidents_count: number;
  source: string;
  fetched_at: string;
}

const MONITORED_EXPRESSWAYS = ['ECP', 'PIE', 'TPE', 'KPE'];

function parseFlightTime(timeInput?: string): { targetDate: Date; rawInput: string } {
  const now = new Date();
  if (!timeInput || !timeInput.trim()) {
    // Default to 4 hours from now
    const defaultDate = new Date(now.getTime() + 4 * 60 * 60 * 1000);
    return { targetDate: defaultDate, rawInput: defaultDate.toISOString() };
  }

  const trimmed = timeInput.trim();

  // Try direct Date parse
  const parsedDirect = new Date(trimmed);
  if (!isNaN(parsedDirect.getTime()) && trimmed.includes('-')) {
    return { targetDate: parsedDirect, rawInput: trimmed };
  }

  // Handle "HH:mm" or "HH:mm:ss"
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:([0-5][0-9]))?$/;
  const match = trimmed.match(timeRegex);
  if (match) {
    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);

    // If already passed today, assume tomorrow
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    return { targetDate: target, rawInput: trimmed };
  }

  if (!isNaN(parsedDirect.getTime())) {
    return { targetDate: parsedDirect, rawInput: trimmed };
  }

  // Fallback to 4 hours from now
  const fallback = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  return { targetDate: fallback, rawInput: trimmed };
}

export async function getChangiStatus(params: {
  from?: string;
  flight_time?: string;
}): Promise<ChangiStatusResult> {
  const matched = await resolveTool('changi');
  const schemaProps = (matched.tool.inputSchema as any)?.properties || {};
  const args: Record<string, unknown> = {};

  if ('from' in schemaProps && params.from) args['from'] = params.from;
  if ('origin' in schemaProps && params.from) args['origin'] = params.from;

  const rawResult = await callTool(matched.name, args);

  let rawIncidents: any[] = [];
  if (Array.isArray(rawResult)) {
    rawIncidents = rawResult;
  } else if (Array.isArray(rawResult?.value)) {
    rawIncidents = rawResult.value;
  } else if (Array.isArray(rawResult?.incidents)) {
    rawIncidents = rawResult.incidents;
  } else if (Array.isArray(rawResult?.data)) {
    rawIncidents = rawResult.data;
  } else if (rawResult && typeof rawResult === 'object') {
    for (const key of Object.keys(rawResult)) {
      if (Array.isArray(rawResult[key])) {
        rawIncidents = rawResult[key];
        break;
      }
    }
  }

  const affectingIncidents: TrafficIncident[] = [];

  for (const item of rawIncidents) {
    const msg = String(item?.Message || item?.message || item?.description || item?.text || JSON.stringify(item));
    const upperMsg = msg.toUpperCase();

    // Check if incident affects ECP, PIE, TPE, KPE or mentions Changi/Airport
    let matchedExp: string | undefined;
    for (const exp of MONITORED_EXPRESSWAYS) {
      if (upperMsg.includes(exp)) {
        matchedExp = exp;
        break;
      }
    }

    if (!matchedExp && (upperMsg.includes('CHANGI') || upperMsg.includes('AIRPORT'))) {
      matchedExp = 'CHANGI_ACCESS';
    }

    if (matchedExp) {
      affectingIncidents.push({
        id: item?.IncidentID || item?.id || `inc-${affectingIncidents.length + 1}`,
        type: item?.Type || item?.type || 'Traffic Alert',
        message: msg,
        expressway: matchedExp,
        latitude: typeof item?.Latitude === 'number' ? item.Latitude : undefined,
        longitude: typeof item?.Longitude === 'number' ? item.Longitude : undefined,
        raw: item,
      });
    }
  }

  const { targetDate, rawInput } = parseFlightTime(params.flight_time);
  const incidentCount = affectingIncidents.length;
  const incidentBufferMinutes = incidentCount * 15;
  const standardLeadMinutes = 3 * 60; // 3 hours
  const totalDeductionMinutes = standardLeadMinutes + incidentBufferMinutes;

  const leaveByDate = new Date(targetDate.getTime() - totalDeductionMinutes * 60 * 1000);

  // Format friendly leave_by display string (e.g. "12:15 PM" or "2026-10-15 12:15")
  const leaveByDisplay = leaveByDate.toLocaleTimeString('en-SG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return {
    from: params.from,
    flight_time: rawInput,
    leave_by: leaveByDisplay,
    leave_by_iso: leaveByDate.toISOString(),
    standard_lead_hours: 3,
    incident_count: incidentCount,
    incident_buffer_minutes: incidentBufferMinutes,
    monitored_expressways: MONITORED_EXPRESSWAYS,
    affecting_incidents: affectingIncidents,
    all_incidents_count: rawIncidents.length,
    source: matched.source,
    fetched_at: new Date().toISOString(),
  };
}
