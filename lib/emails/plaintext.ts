/**
 * Plain-text alternatives for every transactional send.
 *
 * Multipart MIME (text + html) is the inbox-deliverability gold standard:
 *   - Gmail/Yahoo treat html-only as a weak signal and lift spam scores.
 *   - Accessibility tools and watchOS use the text part as the primary
 *     reading source.
 *   - Some corporate filters strip html entirely.
 *
 * Kept in one file so the wording stays mirrored to the HTML templates.
 * No user input flows in — only the signed token URLs we generate.
 */

type Locale = 'en' | 'de' | 'es' | 'fr' | 'ja'

function pick<T>(map: Record<Locale, T>, locale: string): T {
  return map[(locale as Locale)] ?? map.en
}

export function confirmEmailText(
  locale: string,
  confirmUrl: string,
): string {
  const body = pick(
    {
      en:
        `One quiet click, and you're on the list.\n\n` +
        `Confirm your email by opening this link. We only write when ` +
        `something genuinely useful for your Mac's battery is ready.\n\n` +
        `   ${confirmUrl}\n\n` +
        `This link is valid for 48 hours.\n\n` +
        `If you didn't sign up, you can ignore this email. Nothing ` +
        `is saved until you confirm.\n\n` +
        `With care,\n` +
        `The Battery Sensei team\n` +
        `https://battery-sensei.app`,
      de:
        `Ein kurzer Klick, und wir legen los.\n\n` +
        `Bestätigen Sie Ihre E-Mail über diesen Link. Wir schreiben selten ` +
        `und nur dann, wenn es Ihrem Mac-Akku wirklich hilft.\n\n` +
        `   ${confirmUrl}\n\n` +
        `Dieser Link ist 48 Stunden gültig.\n\n` +
        `Nicht angemeldet? Ignorieren Sie diese E-Mail einfach. ` +
        `Ohne Ihre Bestätigung wird nichts gespeichert.\n\n` +
        `Viele Grüße,\n` +
        `Das Battery-Sensei-Team\n` +
        `https://battery-sensei.app`,
      es:
        `Un clic y todo listo.\n\n` +
        `Confirma tu correo abriendo este enlace. Escribimos poco, ` +
        `solo cuando hay algo realmente útil para la batería de tu Mac.\n\n` +
        `   ${confirmUrl}\n\n` +
        `Este enlace caduca en 48 horas.\n\n` +
        `¿No te registraste? Ignora este correo. No guardamos nada ` +
        `hasta que confirmes.\n\n` +
        `Con mimo,\n` +
        `El equipo de Battery Sensei\n` +
        `https://battery-sensei.app`,
      fr:
        `Un dernier clic, et c'est confirmé.\n\n` +
        `Confirmez votre adresse en ouvrant ce lien. Nous écrivons ` +
        `rarement, seulement quand quelque chose peut vraiment aider ` +
        `la batterie de votre Mac.\n\n` +
        `   ${confirmUrl}\n\n` +
        `Ce lien est valable 48 heures.\n\n` +
        `Vous n'avez rien demandé ? Ignorez ce message : rien n'est ` +
        `enregistré tant que vous ne confirmez pas.\n\n` +
        `Avec attention,\n` +
        `L'équipe Battery Sensei\n` +
        `https://battery-sensei.app`,
      ja:
        `あとひと押しで登録完了です。\n\n` +
        `下のリンクからメールアドレスをご確認ください。配信は控えめに、` +
        `Macのバッテリーに本当に役立つときだけお送りします。\n\n` +
        `   ${confirmUrl}\n\n` +
        `このリンクは48時間有効です。\n\n` +
        `ご登録のお心当たりがなければ、このメールは無視してください。` +
        `ご確認いただくまで、何も保存されません。\n\n` +
        `心を込めて、\n` +
        `Battery Sensei チーム\n` +
        `https://battery-sensei.app`,
    },
    locale,
  )
  return body
}
