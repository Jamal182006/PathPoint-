const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateJob = (job) => {
  if (!String(job.title || '').trim()) return 'Add a job title.';
  if (!String(job.category || '').trim()) return 'Choose a job category.';
  if (!String(job.description || '').trim()) return 'Add a job description.';
  if (!Number.isInteger(Number(job.slots)) || Number(job.slots) < 1 || Number(job.slots) > 10000) {
    return 'Openings must be a whole number between 1 and 10000.';
  }
  if (job.salaryMin !== '' && job.salaryMin != null && (!Number.isFinite(Number(job.salaryMin)) || Number(job.salaryMin) < 0)) {
    return 'Minimum salary must be a non-negative amount.';
  }
  if (job.salaryMax !== '' && job.salaryMax != null && (!Number.isFinite(Number(job.salaryMax)) || Number(job.salaryMax) < 0)) {
    return 'Maximum salary must be a non-negative amount.';
  }
  if (job.salaryMin !== '' && job.salaryMin != null && job.salaryMax !== '' && job.salaryMax != null && Number(job.salaryMin) > Number(job.salaryMax)) {
    return 'Minimum salary cannot exceed maximum salary.';
  }
  if (!/^[A-Z]{3}$/.test(String(job.currency || '').trim().toUpperCase())) return 'Currency must be a three-letter code.';
  if (job.contactEmail && !emailPattern.test(String(job.contactEmail).trim())) return 'Enter a valid contact email.';
  if ((job.latitude === '' || job.latitude == null) !== (job.longitude === '' || job.longitude == null)) return 'Choose both latitude and longitude for the map location.';
  if (job.requirements?.some((requirement) => !String(requirement.title || '').trim()
    || (requirement.type === 'file' && !requirement.allowedFileTypes?.length))) {
    return 'Every requirement needs a title and file requirements need an allowed file type.';
  }
  return '';
};
