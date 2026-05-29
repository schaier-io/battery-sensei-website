/**
 * Locale-matched subject line for the confirm (double opt-in) email. The
 * sender already shows as "Battery Sensei", so the subject stays short and
 * brand-suffix-free.
 */
export function confirmSubject(locale: string): string {
  switch (locale) {
    case 'de':
      return 'Bitte bestätigen Sie Ihre E-Mail-Adresse'
    case 'es':
      return 'Confirma tu correo electrónico'
    case 'fr':
      return 'Confirmez votre adresse e-mail'
    case 'ja':
      return 'メールアドレスのご確認'
    default:
      return 'Confirm your email address'
  }
}
