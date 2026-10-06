export const MAX_BUSINESS_DOCUMENT_SIZE = 5 * 1024 * 1024;

const supportedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);

export const parseBusinessDocument = (document) => {
  if (!document?.data || !document?.mimeType || !document?.fileName) {
    throw new Error('Upload a business registration document to continue');
  }

  if (!supportedMimeTypes.has(document.mimeType)) {
    throw new Error('Document must be a PDF, JPG, or PNG file');
  }

  if (typeof document.data === 'string' && document.data.length > Math.ceil(MAX_BUSINESS_DOCUMENT_SIZE / 3) * 4) {
    throw new Error('Document must be smaller than 5 MB');
  }

  if (typeof document.data !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(document.data)) {
    throw new Error('The uploaded document could not be read');
  }

  const buffer = Buffer.from(document.data, 'base64');
  if (!buffer.length || buffer.length > MAX_BUSINESS_DOCUMENT_SIZE || buffer.toString('base64') !== document.data) {
    throw new Error('Document must be smaller than 5 MB');
  }

  const validSignature = document.mimeType === 'application/pdf'
    ? buffer.subarray(0, 5).toString('ascii') === '%PDF-'
    : document.mimeType === 'image/png'
      ? buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

  if (!validSignature) {
    throw new Error('The document content does not match its file type');
  }

  return {
    documentName: document.fileName.split(/[\\/]/).pop().trim().slice(0, 255) || 'business-document',
    documentMimeType: document.mimeType,
    documentSize: buffer.length,
    documentData: buffer,
  };
};