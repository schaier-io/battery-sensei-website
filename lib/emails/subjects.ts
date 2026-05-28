/**
 * Locale-matched subject lines for the newsletter transactional mails.
 * Pulled out of the route handlers to keep the i18n strings co-located
 * with the rest of the email module.
 */
export function confirmSubject(locale: string): string {
  switch (locale) {
    case 'de':
      return 'Bitte bestätige deine E-Mail — Battery Sensei'
    case 'es':
      return 'Confirma tu correo — Battery Sensei'
    case 'fr':
      return 'Confirmez votre adresse — Battery Sensei'
    case 'ja':
      return 'メールアドレスのご確認 — Battery Sensei'
    default:
      return 'Confirm your email — Battery Sensei'
  }
}

export function welcomeSubject(locale: string): string {
  switch (locale) {
    case 'de':
      return 'Willkommen bei Battery Sensei'
    case 'es':
      return 'Bienvenido a Battery Sensei'
    case 'fr':
      return 'Bienvenue chez Battery Sensei'
    case 'ja':
      return 'Battery Sensei へようこそ'
    default:
      return 'Welcome to Battery Sensei'
  }
}
