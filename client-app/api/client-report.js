// GET /api/client-report?clientId=123
// Returns one client, all their projects, and every payment on each project
// — the exact "everything joined together" query Firebase RTDB is bad at.
// This is separate from your Firebase-backed app; it only touches Neon.

const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Use GET' });
  }

  const clientId = req.query.clientId;
  if (!clientId) {
    return res.status(400).json({ error: 'clientId query param is required' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);

    const clientRows = await sql`
      SELECT id, name, email, phone, city, created_at
      FROM clients WHERE id = ${clientId}
    `;
    if (!clientRows.length) {
      return res.status(404).json({ error: 'No client with that id' });
    }

    const projectRows = await sql`
      SELECT id, title, status, project_type, budget_estimate, start_date
      FROM projects WHERE client_id = ${clientId}
      ORDER BY created_at DESC
    `;

    const projectIds = projectRows.map(p => p.id);
    const paymentRows = projectIds.length
      ? await sql`
          SELECT id, project_id, amount, currency, method, paid_at, notes
          FROM payments WHERE project_id = ANY(${projectIds})
          ORDER BY paid_at DESC
        `
      : [];

    // Attach each project's payments and running total
    const projects = projectRows.map(p => {
      const payments = paymentRows.filter(pay => pay.project_id === p.id);
      const totalPaid = payments.reduce((sum, pay) => sum + Number(pay.amount), 0);
      return { ...p, payments, totalPaid };
    });

    res.status(200).json({
      client: clientRows[0],
      projects,
      grandTotalPaid: projects.reduce((sum, p) => sum + p.totalPaid, 0)
    });
  } catch (e) {
    console.error('client-report error:', e);
    res.status(500).json({ error: 'Could not run report', detail: e.message });
  }
};
