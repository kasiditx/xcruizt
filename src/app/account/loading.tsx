export default function AccountLoading() {
  return (
    <main aria-busy="true" className="loading-shell">
      <p className="loading-wordmark">XCRUIZT</p>
      <div aria-hidden="true" className="loading-track">
        <span />
      </div>
      <p className="section-kicker">LOADING ACCOUNT</p>
    </main>
  );
}
