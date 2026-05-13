// App.tsx — Route shell. Pages and layout components added per build phase.
// Phase 1 will add: /invoices, /cashflow, /clients
// Phase 2 will add: /projects, /expenses
// Phase 3 will add: /journals, /reports
// Phase 4 will add: /tax
// Phase 5 will add: /employees, /timesheets

export default function App() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>BuildRight & Associates</h1>
        <p style={{ color: "#666", marginTop: 8 }}>Scaffold ready. Phase 1 build begins here.</p>
      </div>
    </div>
  );
}
