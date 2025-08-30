export function initEmail(publicKey) {
  if (window.emailjs && publicKey) window.emailjs.init(publicKey);
}
