/** Skeleton rows while the agenda loads — avoids a blank flash on the default view. */
export default function SessionsLoading() {
  return (
    <main>
      <div style={{ padding: '14px 18px 0', display: 'flex', justifyContent: 'space-between' }}>
        <div className="view-toggle" style={{ opacity: 0.4 }}>
          <span className="view-toggle-tab" data-active="true">Agenda</span>
          <span className="view-toggle-tab" data-active="false">Month</span>
        </div>
      </div>
      <div style={{ padding: '20px 18px 32px' }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="schedule-skeleton-row" />
        ))}
      </div>
    </main>
  )
}
