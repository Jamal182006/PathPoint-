import { INITIAL_USERS, INITIAL_APPLICATIONS } from '../mock/initialData';

const STORAGE_KEYS = {
  APPLICATIONS: 'pathpoint_applications',
  USERS: 'pathpoint_users',
  CURRENT_USER_ID: 'pathpoint_current_user_id',
};

const APPLICATION_STATUSES = ['Saved', 'Applied', 'Interviewing', 'Offered', 'Rejected'];

// Initialize localStorage if empty
const ensureInitialized = () => {
  if (!localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) {
    localStorage.setItem(
      STORAGE_KEYS.APPLICATIONS,
      JSON.stringify(INITIAL_APPLICATIONS)
    );
  }
  if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
  }
  if (!localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID)) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, 'user-alex');
  }
};

export const storageService = {
  // Reset all data back to clean demo state
  resetToDemoData: () => {
    localStorage.setItem(
      STORAGE_KEYS.APPLICATIONS,
      JSON.stringify(INITIAL_APPLICATIONS)
    );
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, 'user-alex');
    window.location.reload();
  },

  // USERS
  getUsers: () => {
    ensureInitialized();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  },

  getCurrentUser: () => {
    ensureInitialized();
    const users = storageService.getUsers();
    const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID) || 'user-alex';
    const found = users.find((u) => u.id === currentId);
    return found || users[0];
  },

  setCurrentUser: (userId) => {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, userId);
  },

  // AUTH FALLBACKS — used by apiAdapter when backend is offline
  login: (email, password = '') => {
    ensureInitialized();
    const users = storageService.getUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!found) throw new Error('No account found with that email address.');

    // If password provided and user has a password set, validate
    if (password && found.password && found.password !== password) {
      throw new Error('Invalid email or password. Please try again.');
    }

    if (found.status === 'suspended') {
      throw new Error('Account suspended. Please contact your career counselor.');
    }

    storageService.setCurrentUser(found.id);
    return found;
  },

  register: ({ name, email, password = '', role = 'user', careerTrack = 'General' }) => {
    ensureInitialized();
    const users = storageService.getUsers();
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) throw new Error('An account with that email already exists.');
    return storageService.createUser({ name, email, password, role, careerTrack });
  },

  createUser: (userData) => {
    const users = storageService.getUsers();
    const newUser = {
      id: `user-${Date.now()}`,
      name: userData.name,
      email: userData.email.toLowerCase(),
      password: userData.password || 'password123',
      role: userData.role || 'user',
      careerTrack: userData.careerTrack || 'General',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
    };
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    storageService.setCurrentUser(newUser.id);
    return newUser;
  },

  forgotPassword: (email) => {
    ensureInitialized();
    const users = storageService.getUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    // Always succeed from a security perspective
    return {
      success: true,
      message: found
        ? `Password reset link generated for ${email}. (Demo link: /login?reset_sent=1)`
        : `If that email is registered, instructions have been dispatched.`,
    };
  },

  // APPLICATIONS
  getApplications: (userId, { status, search } = {}) => {
    ensureInitialized();
    let apps = [];
    try {
      apps = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) || [];
    } catch {
      apps = INITIAL_APPLICATIONS;
    }

    let userApps = apps.filter((a) => a.userId === userId);

    if (status && status !== 'All' && APPLICATION_STATUSES.includes(status)) {
      userApps = userApps.filter((a) => a.status === status);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      userApps = userApps.filter(
        (a) =>
          a.company?.toLowerCase().includes(q) ||
          a.role?.toLowerCase().includes(q) ||
          a.contactPerson?.toLowerCase().includes(q) ||
          a.jobDescriptionNotes?.toLowerCase().includes(q)
      );
    }

    return userApps.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  },

  getApplicationById: (id) => {
    ensureInitialized();
    const apps = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) || [];
    return apps.find((a) => a._id === id) || null;
  },

  createApplication: (userId, data) => {
    ensureInitialized();
    const apps = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) || [];
    const nowIso = new Date().toISOString();
    const status = data.status || 'Saved';

    const newApp = {
      _id: `app-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      userId,
      company: data.company?.trim(),
      role: data.role?.trim(),
      salaryRange: data.salaryRange || '',
      dateApplied: data.dateApplied || nowIso,
      status,
      statusHistory: [
        {
          status,
          changedAt: data.dateApplied || nowIso,
        },
      ],
      jobDescriptionNotes: data.jobDescriptionNotes || '',
      contactPerson: data.contactPerson || '',
      resumeVersion: data.resumeVersion || '',
      resumeFile: data.resumeFile || null,
      interviewDates: Array.isArray(data.interviewDates) ? data.interviewDates : [],
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    apps.unshift(newApp);
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
    return newApp;
  },

  updateApplication: (id, data) => {
    ensureInitialized();
    const apps = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) || [];
    const index = apps.findIndex((a) => a._id === id);
    if (index === -1) return null;

    const currentApp = apps[index];
    const nowIso = new Date().toISOString();

    const updated = {
      ...currentApp,
      ...data,
      updatedAt: nowIso,
    };

    // Check if status changed
    if (data.status && data.status !== currentApp.status) {
      updated.status = data.status;
      updated.statusHistory = [
        ...(currentApp.statusHistory || []),
        { status: data.status, changedAt: nowIso },
      ];
    }

    apps[index] = updated;
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
    return updated;
  },

  updateStatus: (id, newStatus) => {
    ensureInitialized();
    const apps = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) || [];
    const index = apps.findIndex((a) => a._id === id);
    if (index === -1) return null;

    const currentApp = apps[index];
    if (currentApp.status === newStatus) return currentApp;

    const nowIso = new Date().toISOString();
    const updated = {
      ...currentApp,
      status: newStatus,
      statusHistory: [
        ...(currentApp.statusHistory || []),
        { status: newStatus, changedAt: nowIso },
      ],
      updatedAt: nowIso,
    };

    apps[index] = updated;
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
    return updated;
  },

  deleteApplication: (id) => {
    ensureInitialized();
    const apps = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) || [];
    const filtered = apps.filter((a) => a._id !== id);
    localStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(filtered));
    return true;
  },

  uploadResume: (id, { fileName, fileSize }) => {
    return storageService.updateApplication(id, {
      resumeVersion: fileName,
      resumeFile: {
        filename: fileName,
        originalName: fileName,
        path: '#', // In client-only version, mocked file reference
        size: fileSize || 1024 * 250,
        uploadedAt: new Date().toISOString(),
      },
    });
  },

  // PERSONAL ANALYTICS SUMMARY
  getAnalyticsSummary: (userId) => {
    ensureInitialized();
    const applications = storageService.getApplications(userId);
    const totalApplications = applications.length;

    const statusCounts = {
      Saved: 0,
      Applied: 0,
      Interviewing: 0,
      Offered: 0,
      Rejected: 0,
    };

    let submittedCount = 0;
    let interviewedCount = 0;
    let offeredCount = 0;
    let totalDaysToFirstChange = 0;
    let transitionsCounted = 0;
    const timelineMap = {};

    applications.forEach((app) => {
      if (statusCounts[app.status] !== undefined) {
        statusCounts[app.status]++;
      }

      const hasApplied =
        app.status !== 'Saved' ||
        app.statusHistory?.some((h) => h.status !== 'Saved');

      if (hasApplied) {
        submittedCount++;
      }

      const reachedInterview =
        app.status === 'Interviewing' ||
        app.status === 'Offered' ||
        (app.interviewDates && app.interviewDates.length > 0) ||
        app.statusHistory?.some(
          (h) => h.status === 'Interviewing' || h.status === 'Offered'
        );

      if (reachedInterview) {
        interviewedCount++;
      }

      const reachedOffer =
        app.status === 'Offered' ||
        app.statusHistory?.some((h) => h.status === 'Offered');

      if (reachedOffer) {
        offeredCount++;
      }

      // Compute time from Applied -> next status change
      const sortedHistory = [...(app.statusHistory || [])].sort(
        (a, b) => new Date(a.changedAt) - new Date(b.changedAt)
      );
      const appliedIdx = sortedHistory.findIndex((h) => h.status === 'Applied');
      if (appliedIdx !== -1 && appliedIdx < sortedHistory.length - 1) {
        const appliedTime = new Date(sortedHistory[appliedIdx].changedAt).getTime();
        const nextTime = new Date(sortedHistory[appliedIdx + 1].changedAt).getTime();
        const diffDays = Math.max(0, (nextTime - appliedTime) / (1000 * 60 * 60 * 24));
        totalDaysToFirstChange += diffDays;
        transitionsCounted++;
      }

      const dateToGroup = app.dateApplied || app.createdAt;
      if (dateToGroup) {
        const d = new Date(dateToGroup);
        const monthKey = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        timelineMap[monthKey] = (timelineMap[monthKey] || 0) + 1;
      }
    });

    const baseForRates = submittedCount > 0 ? submittedCount : totalApplications;
    const interviewRate =
      baseForRates > 0 ? Math.round((interviewedCount / baseForRates) * 1000) / 10 : 0;
    const offerRate =
      baseForRates > 0 ? Math.round((offeredCount / baseForRates) * 1000) / 10 : 0;

    const avgDaysToFirstStatusChange =
      transitionsCounted > 0
        ? Math.round((totalDaysToFirstChange / transitionsCounted) * 10) / 10
        : 0;

    const statusData = APPLICATION_STATUSES.map((status) => ({
      name: status,
      value: statusCounts[status] || 0,
    }));

    const funnelData = [
      { stage: 'Saved', count: statusCounts.Saved + submittedCount },
      { stage: 'Applied', count: submittedCount },
      { stage: 'Interviewing', count: interviewedCount },
      { stage: 'Offered', count: offeredCount },
    ];

    const timelineData = Object.entries(timelineMap).map(([month, count]) => ({
      month,
      count,
    }));

    return {
      totalApplications,
      submittedCount,
      interviewedCount,
      offeredCount,
      interviewRate,
      offerRate,
      avgDaysToFirstStatusChange,
      statusCounts,
      statusData,
      funnelData,
      timelineData,
    };
  },

  // ADMIN AGGREGATE METRICS
  getAdminMetrics: () => {
    ensureInitialized();
    const users = storageService.getUsers().filter((u) => u.role === 'user');
    const apps = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) || [];

    const totalUsers = users.length;
    const totalApplications = apps.length;

    const statusCounts = {
      Saved: 0,
      Applied: 0,
      Interviewing: 0,
      Offered: 0,
      Rejected: 0,
    };

    apps.forEach((a) => {
      if (statusCounts[a.status] !== undefined) {
        statusCounts[a.status]++;
      }
    });

    const avgApplicationsPerUser =
      totalUsers > 0 ? Math.round((totalApplications / totalUsers) * 10) / 10 : 0;

    // Users with offers
    const usersWithOffers = [...new Set(apps.filter((a) => a.status === 'Offered').map((a) => a.userId))];
    let avgApplicationsBeforeOffer = 0;
    if (usersWithOffers.length > 0) {
      const totalAppsForHired = apps.filter((a) => usersWithOffers.includes(a.userId)).length;
      avgApplicationsBeforeOffer = Math.round((totalAppsForHired / usersWithOffers.length) * 10) / 10;
    }

    const submittedTotal =
      statusCounts.Applied +
      statusCounts.Interviewing +
      statusCounts.Offered +
      statusCounts.Rejected;

    const platformInterviewRate =
      submittedTotal > 0
        ? Math.round(((statusCounts.Interviewing + statusCounts.Offered) / submittedTotal) * 1000) / 10
        : 0;

    const platformOfferRate =
      submittedTotal > 0
        ? Math.round((statusCounts.Offered / submittedTotal) * 1000) / 10
        : 0;

    return {
      totalUsers,
      totalApplications,
      usersWithOfferCount: usersWithOffers.length,
      avgApplicationsPerUser,
      avgApplicationsBeforeOffer,
      platformInterviewRate,
      platformOfferRate,
      statusCounts,
    };
  },

  // ADMIN USER MANAGEMENT & DIRECTORY
  getAdminUsers: ({ search = '', role = 'All', status = 'All' } = {}) => {
    ensureInitialized();
    const users = storageService.getUsers();
    const apps = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) || [];

    let enriched = users.map((u) => {
      const userApps = apps.filter((a) => a.userId === u.id);
      const interviewingCount = userApps.filter((a) => a.status === 'Interviewing').length;
      const offeredCount = userApps.filter((a) => a.status === 'Offered').length;

      return {
        ...u,
        status: u.status || 'active',
        careerTrack: u.careerTrack || (u.role === 'admin' ? 'Career Counseling' : 'Software Engineering'),
        applicationCount: userApps.length,
        interviewCount: interviewingCount,
        offerCount: offeredCount,
        lastActiveAt: u.lastActiveAt || u.createdAt || new Date().toISOString(),
      };
    });

    if (role && role !== 'All') {
      enriched = enriched.filter((u) => u.role === role);
    }

    if (status && status !== 'All') {
      enriched = enriched.filter((u) => u.status === status);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      enriched = enriched.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.careerTrack?.toLowerCase().includes(q)
      );
    }

    return enriched;
  },

  updateUserStatus: (userId, newStatus) => {
    ensureInitialized();
    const users = storageService.getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) throw new Error('User not found');
    users[idx].status = newStatus;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    return users[idx];
  },

  getUserApplications: (userId) => {
    ensureInitialized();
    const apps = JSON.parse(localStorage.getItem(STORAGE_KEYS.APPLICATIONS)) || [];
    return apps.filter((a) => a.userId === userId);
  },
};

export default storageService;
