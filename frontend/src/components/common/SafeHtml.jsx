
import React from 'react';
import DOMPurify from 'dompurify';

const SafeHtml = ({ html }) => {
  const sanitizedHtml = DOMPurify.sanitize(html);
  return <span dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />;
};

export default SafeHtml;