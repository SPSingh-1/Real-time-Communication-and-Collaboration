export const formatRelativeDate = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hr ago`;
  if (diffDays === 1) return "yesterday";
  return new Date(date).toLocaleDateString();
};

export const isDocumentFile = (filename = '', mimeType = '') => {
  const name = String(filename || '').toLowerCase();
  const mime = String(mimeType || '').toLowerCase();
  return (
    name.endsWith('.pdf') ||
    name.endsWith('.doc') ||
    name.endsWith('.docx') ||
    name.endsWith('.ppt') ||
    name.endsWith('.pptx') ||
    name.endsWith('.xls') ||
    name.endsWith('.xlsx') ||
    name.endsWith('.txt') ||
    mime.includes('pdf') ||
    mime.includes('word') ||
    mime.includes('officedocument')
  );
};

export const getFileViewUrl = (fileUrl) => {
  return fileUrl || '';
};

export const getFileDownloadUrl = (fileUrl) => {
  if (!fileUrl) return '';
  if (fileUrl.includes('res.cloudinary.com')) {
    if (fileUrl.includes('/image/upload/')) {
      return fileUrl.replace('/image/upload/', '/image/upload/fl_attachment/');
    }
    if (fileUrl.includes('/raw/upload/')) {
      return fileUrl.replace('/raw/upload/', '/raw/upload/fl_attachment/');
    }
    if (fileUrl.includes('/video/upload/')) {
      return fileUrl.replace('/video/upload/', '/video/upload/fl_attachment/');
    }
  }
  return fileUrl;
};