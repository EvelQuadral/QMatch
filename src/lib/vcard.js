export function parseName(fullName) {
  const parts = fullName.trim().split(' ');
  if (parts.length >= 2) {
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }
  return { firstName: fullName, lastName: '' };
}

export function downloadVCard(director) {
  const { firstName, lastName } = parseName(director.name);
  const tagsLine = (director.tags || []).join(', ');

  const vcard = `BEGIN:VCARD
VERSION:3.0
FN:${director.name}
N:${lastName};${firstName};;;
ORG:Quadral;${director.title || ''}
EMAIL:${director.email || ''}
TEL:${director.phone || ''}
NOTE:Rencontré au Congrès HLM 2026${tagsLine ? ' - ' + tagsLine : ''}
END:VCARD`;

  const blob = new Blob([vcard], { type: 'text/vcard' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${firstName}_${lastName}_Quadral.vcf`;
  link.click();
  URL.revokeObjectURL(url);
}
