/** Skeleton grid while the month's sessions load — avoids a blank flash on the new primary view. */
export default function SessionsLoading() {
  return (
    <main>
      <div style={{ padding: '14px 18px 0', display: 'flex', justifyContent: 'space-between' }}>
        <div className="view-toggle" style={{ opacity: 0.4 }}>
          <span className="view-toggle-tab" data-active="true">Month</span>
          <span className="view-toggle-tab" data-active="false">Agenda</span>
        </div>
      </div>
      <div className="calendar" style={{ padding: '0 18px 32px' }}>
        <div className="calendar-nav">
          <span className="hl calendar-month-label" style={{ opacity: 0.4 }}>Loading…</span>
        </div>
        <div className="calendar-grid">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="calendar-skeleton-cell" />
          ))}
        </div>
      </div>
    </main>
  )
}
