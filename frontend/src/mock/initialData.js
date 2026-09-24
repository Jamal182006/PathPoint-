const now = new Date();
const dayMs = 24 * 60 * 60 * 1000;

export const INITIAL_USERS = [
  {
    id: 'user-admin',
    name: 'Dr. Sarah Lin (Career Services)',
    email: 'admin@example.com',
    password: 'admin123',
    role: 'admin',
    title: 'Director of Career Services',
    status: 'active',
    createdAt: new Date(now.getTime() - 90 * dayMs).toISOString(),
    lastActiveAt: new Date().toISOString(),
  },
];

export const INITIAL_APPLICATIONS = [];
