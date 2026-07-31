export default function AdminLoading() {
  return (
    <main
      className="loading-shell"
      aria-busy="true"
      aria-label="กำลังโหลด Admin dashboard"
    >
      <p className="loading-wordmark">XCRUIZT / ADMIN</p>
      <div className="loading-track" aria-hidden="true">
        <span />
      </div>
      <p className="section-kicker">LOADING OPERATIONS</p>
    </main>
  );
}
