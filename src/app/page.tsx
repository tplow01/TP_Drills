import { redirect } from 'next/navigation'

// Phase 1 front door. Phase 2 replaces this with the hub.
export default function Home() {
  redirect('/drills')
}
