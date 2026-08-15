import { NextResponse } from 'next/server'
import * as ical from 'node-ical'
import type { VEvent } from 'node-ical'
import { createServerClient } from '@/lib/supabase/server'
import { getTeam } from '@/lib/teams-server'
import { mapIcsEventToSessionInput } from '@/lib/ics-import'

/**
 * Fetches and parses a team's connected ICS feed, creates a session for
 * every fixture it hasn't imported before (matched by the event's UID),
 * and stamps `calendar_synced_at`. Runs server-side because most calendar
 * hosts don't send CORS headers a browser could use to fetch the feed
 * directly (design doc, 2026-08-15). No auth in this app, so this uses the
 * same anon-key Supabase client every other write in the app already uses.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: teamId } = await params

  const team = await getTeam(teamId)
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 })
  }
  if (!team.calendar_url) {
    return NextResponse.json({ error: 'No calendar connected for this team' }, { status: 400 })
  }

  let events: ical.CalendarResponse
  try {
    events = await ical.async.fromURL(team.calendar_url)
  } catch {
    return NextResponse.json({ error: 'Could not fetch the calendar feed' }, { status: 502 })
  }

  const supabase = await createServerClient()

  const { data: existing, error: existingError } = await supabase
    .from('session')
    .select('external_uid')
    .eq('team_id', teamId)
    .not('external_uid', 'is', null)

  if (existingError) {
    return NextResponse.json({ error: `Failed to check existing sessions: ${existingError.message}` }, { status: 500 })
  }

  const knownUids = new Set((existing ?? []).map((row) => row.external_uid as string))

  const newSessions = Object.values(events)
    .filter((component) => {
      if (component && component.type === 'VEVENT') {
        const vevent = component as VEvent
        return !knownUids.has(vevent.uid)
      }
      return false
    })
    .map((event) => mapIcsEventToSessionInput(event as VEvent, team))

  if (newSessions.length > 0) {
    const { error: insertError } = await supabase.from('session').insert(newSessions)
    if (insertError) {
      return NextResponse.json({ error: `Failed to save sessions: ${insertError.message}` }, { status: 500 })
    }
  }

  await supabase.from('team').update({ calendar_synced_at: new Date().toISOString() }).eq('id', teamId)

  return NextResponse.json({ created: newSessions.length })
}
