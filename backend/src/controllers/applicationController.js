import Application from '../models/Application.js';

const parseMultipartForm = (req) => new Promise((resolve, reject) => {
  const contentType = req.headers['content-type'] || '';
  const boundaryMatch = contentType.match(/boundary=(?:(?:"([^"]+)"|([^;]+)))/i);

  if (!boundaryMatch) {
    resolve({ fields: {}, files: [] });
    return;
  }

  const boundary = `--${boundaryMatch[1] || boundaryMatch[2]}`;
  const chunks = [];

  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    try {
      const body = Buffer.concat(chunks);
      const parts = body.toString('binary').split(boundary);
      const fields = {};
      const files = [];

      parts.forEach((part) => {
        if (!part || part.startsWith('--') || part.includes('Content-Transfer-Encoding')) {
          return;
        }

        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) return;

        const headers = part.slice(0, headerEnd);
        const content = part.slice(headerEnd + 4).replace(/\r\n$/, '');
        const dispositionMatch = headers.match(/name="([^"]+)"/i);
        const filenameMatch = headers.match(/filename="([^"]*)"/i);

        if (!dispositionMatch) return;

        const fieldName = dispositionMatch[1];
        const rawValue = content.replace(/\r\n--$/, '').replace(/\r\n$/, '');

        if (filenameMatch && filenameMatch[1] !== '') {
          files.push({
            fieldname: fieldName,
            originalname: filenameMatch[1],
            mimetype: (headers.match(/Content-Type:\s*([^;\r\n]+)/i) || [])[1] || 'application/octet-stream',
            buffer: Buffer.from(rawValue, 'binary'),
          });
          return;
        }

        fields[fieldName] = Buffer.from(rawValue, 'binary').toString('utf8');
      });

      resolve({ fields, files });
    } catch (error) {
      reject(error);
    }
  });
  req.on('error', reject);
});

// @desc    Get all applications for logged in user
// @route   GET /api/applications
// @access  Protected
export const getApplications = async (req, res) => {
  try {
    const { status, search } = req.query;
    const query = { userId: req.user.id };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { company: { $regex: search, $options: 'i' } },
        { role: { $regex: search, $options: 'i' } },
      ];
    }

    const applications = await Application.find(query).sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    console.error('[Application Error - getAll]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve applications',
    });
  }
};

// @desc    Get single application by ID
// @route   GET /api/applications/:id
// @access  Protected
export const getApplicationById = async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: application,
    });
  } catch (error) {
    console.error('[Application Error - getById]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve application',
    });
  }
};

// @desc    Create new application
// @route   POST /api/applications
// @access  Protected
export const createApplication = async (req, res) => {
  try {
    const {
      company,
      role,
      salaryRange = '',
      dateApplied = new Date(),
      status = 'Saved',
      jobDescriptionNotes = '',
      contactPerson = '',
      resumeVersion = '',
      resumeUrl = '',
      interviewDates = [],
    } = req.body;

    if (!company || !role) {
      return res.status(400).json({
        success: false,
        message: 'Company name and role are required',
      });
    }

    const application = await Application.create({
      userId: req.user.id,
      company: company.trim(),
      role: role.trim(),
      salaryRange,
      dateApplied,
      status,
      statusHistory: [{ status, changedAt: new Date() }],
      jobDescriptionNotes,
      contactPerson,
      resumeVersion,
      resumeUrl,
      interviewDates,
    });

    return res.status(201).json({
      success: true,
      message: 'Application created successfully',
      data: application,
    });
  } catch (error) {
    console.error('[Application Error - create]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create application',
    });
  }
};

// @desc    Update application
// @route   PUT /api/applications/:id
// @access  Protected
export const updateApplication = async (req, res) => {
  try {
    let application = await Application.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    // Check if status changed to append to statusHistory
    if (req.body.status && req.body.status !== application.status) {
      application.statusHistory.push({
        status: req.body.status,
        changedAt: new Date(),
      });
    }

    Object.assign(application, req.body);
    await application.save();

    return res.status(200).json({
      success: true,
      message: 'Application updated successfully',
      data: application,
    });
  } catch (error) {
    console.error('[Application Error - update]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update application',
    });
  }
};

// @desc    Update application status (Kanban drag-and-drop)
// @route   PATCH /api/applications/:id/status
// @access  Protected
export const updateApplicationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Saved', 'Applied', 'Interviewing', 'Offered', 'Rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const application = await Application.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    application.status = status;
    application.statusHistory.push({
      status,
      changedAt: new Date(),
    });

    await application.save();

    return res.status(200).json({
      success: true,
      message: `Status updated to ${status}`,
      data: application,
    });
  } catch (error) {
    console.error('[Application Error - updateStatus]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update status',
    });
  }
};

// @desc    Delete application
// @route   DELETE /api/applications/:id
// @access  Protected
export const deleteApplication = async (req, res) => {
  try {
    const application = await Application.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Application removed successfully',
    });
  } catch (error) {
    console.error('[Application Error - delete]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete application',
    });
  }
};

// @desc    Upload resume document for a specific application
// @route   POST /api/applications/:id/resume
// @access  Protected
export const uploadResume = async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findOne({
      _id: id,
      userId: req.user.id,
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    const contentType = req.headers['content-type'] || '';
    let parsed = { fields: {}, files: [] };
    let file = null;
    let resumeVersion = req.body?.resumeVersion || '';
    let resumeUrl = req.body?.resumeUrl || '';

    if (contentType.includes('multipart/form-data')) {
      parsed = await parseMultipartForm(req);
      file = parsed.files.find((entry) => entry.fieldname === 'resume') || parsed.files[0] || null;
      resumeVersion = parsed.fields.resumeVersion || file?.originalname || resumeVersion;
      resumeUrl = parsed.fields.resumeUrl || resumeUrl || `/uploads/resumes/${Date.now()}-${(resumeVersion || 'resume').replace(/[^a-zA-Z0-9._-]+/g, '-')}`;
    } else {
      const body = req.body || {};
      resumeVersion = body.resumeVersion || body.resumeFile || resumeVersion;
      resumeUrl = body.resumeUrl || resumeUrl;
    }

    if (!file && !resumeVersion && !resumeUrl) {
      return res.status(400).json({
        success: false,
        message: 'A resume file or resume metadata is required',
      });
    }

    const safeResumeName = (resumeVersion || 'resume.pdf').trim();
    application.resumeVersion = safeResumeName || 'resume.pdf';
    application.resumeUrl = resumeUrl || `/uploads/resumes/${Date.now()}-${safeResumeName.replace(/[^a-zA-Z0-9._-]+/g, '-')}`;

    await application.save();

    return res.status(200).json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        resumeVersion: application.resumeVersion,
        resumeUrl: application.resumeUrl,
      },
    });
  } catch (error) {
    console.error('[Application Error - uploadResume]:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload resume',
    });
  }
};
