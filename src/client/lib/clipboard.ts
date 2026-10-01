/**
 * Copies text to the clipboard. The Clipboard API needs a secure context
 * (HTTPS or localhost); elsewhere this falls back to a temporary textarea.
 */
export const copyText = async (text: string): Promise<void> => {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (!document.execCommand('copy')) throw new Error('Copy command was rejected');
  } finally {
    textarea.remove();
  }
};
