// Export & Import Utility Service for PathPoint

export const exportService = {
  // Export applications to CSV (Excel / Google Sheets compatible)
  exportToCSV: (applications = []) => {
    if (!applications || applications.length === 0) {
      throw new Error('No applications to export');
    }

    const headers = [
      'Company',
      'Role',
      'Status',
      'Salary Range',
      'Date Applied',
      'Contact Person',
      'Resume Version',
      'Scheduled Interviews',
      'Status History Transitions',
      'Notes',
    ];

    const escapeCSV = (str) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = applications.map((app) => {
      const interviewCount = (app.interviewDates || []).length;
      const historySummary = (app.statusHistory || [])
        .map((h) => `${h.status} (${new Date(h.changedAt).toLocaleDateString()})`)
        .join(' -> ');

      return [
        escapeCSV(app.company),
        escapeCSV(app.role),
        escapeCSV(app.status),
        escapeCSV(app.salaryRange || ''),
        escapeCSV(app.dateApplied ? new Date(app.dateApplied).toLocaleDateString() : ''),
        escapeCSV(app.contactPerson || ''),
        escapeCSV(app.resumeVersion || ''),
        escapeCSV(interviewCount > 0 ? `${interviewCount} date(s)` : 'None'),
        escapeCSV(historySummary),
        escapeCSV(app.jobDescriptionNotes || ''),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `pathpoint_applications_${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Export full JSON backup
  exportToJSON: (applications = [], user = null) => {
    const payload = {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      user: user ? { name: user.name, email: user.email } : null,
      totalApplications: applications.length,
      applications,
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `pathpoint_backup_${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // Validate and parse imported JSON
  parseImportJSON: (jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      let list = [];
      if (Array.isArray(parsed)) {
        list = parsed;
      } else if (parsed && Array.isArray(parsed.applications)) {
        list = parsed.applications;
      } else {
        throw new Error('Invalid format. JSON must be an array of applications or contain an applications property.');
      }

      // Basic validation
      const valid = list.filter((item) => item.company && item.role);
      if (valid.length === 0) {
        throw new Error('No valid application records found in imported file (must contain company and role).');
      }

      return valid;
    } catch (err) {
      throw new Error(err.message || 'Failed to parse JSON file');
    }
  },
};

export default exportService;
