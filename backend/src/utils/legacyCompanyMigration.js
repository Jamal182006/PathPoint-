import Company from '../models/Company.js';

export const verificationStatusForLegacyProvider = (status) => {
  if (status === 'approved' || status === 'rejected') return status;
  return 'pending';
};

export const migrateLegacyProviderCompany = async (provider) => {
  const currentStatus = provider.businessVerification?.status;
  const status = verificationStatusForLegacyProvider(currentStatus);

  if (!currentStatus || currentStatus === 'not_submitted') {
    if (!provider.businessVerification) provider.businessVerification = {};
    provider.businessVerification.status = 'pending';
    await provider.save({ validateBeforeSave: false });
  }

  const migrationKey = `legacy-provider-${provider._id}`;
  const updateResult = await Company.updateOne(
    { migrationKey },
    {
      $setOnInsert: {
        migrationKey,
        providerId: provider._id,
        name: provider.businessProfile.companyName,
        category: provider.businessProfile.industry || 'Other',
        description: provider.businessProfile.description || '',
        location: provider.businessProfile.location || '',
        logo: '',
        requirements: [],
        status,
        rejectionReason: status === 'rejected' ? provider.businessVerification?.rejectionReason || '' : '',
        isArchived: false,
      },
    },
    { upsert: true }
  );

  return { created: Boolean(updateResult.upsertedCount), migrationKey };
};
