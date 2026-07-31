export default function CompleteProfileLoading() {
  return (
    <main aria-busy="true" className="loading-shell">
      <p className="loading-wordmark">XCRUIZT</p>
      <div aria-hidden="true" className="loading-track">
        <span />
      </div>
      <p className="section-kicker">CHECKING ACCOUNT</p>
    </main>
  );
}
