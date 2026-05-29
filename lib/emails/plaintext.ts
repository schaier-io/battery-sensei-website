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
        `Bestätige deine E-Mail über diesen Link. Wir schreiben selten ` +
        `und nur dann, wenn es deinem Mac-Akku wirklich hilft.\n\n` +
        `   ${confirmUrl}\n\n` +
        `Dieser Link ist 48 Stunden gültig.\n\n` +
        `Nicht angemeldet? Ignoriere diese E-Mail einfach. ` +
        `Ohne deine Bestätigung wird nichts gespeichert.\n\n` +
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

export function welcomeEmailText(
  locale: string,
  downloadUrl: string,
  unsubscribeUrl: string,
): string {
  const body = pick(
    {
      en:
        `You're in. Here's the download.\n\n` +
        `Battery Sensei is a small, quiet Mac app. It watches your ` +
        `battery so you don't have to, and speaks up only when it ` +
        `actually matters.\n\n` +
        `   ${downloadUrl}\n\n` +
        `What to expect: roughly one email per release, never more ` +
        `than once a month. Tips, changelogs, and the occasional ` +
        `behind-the-scenes note. No tracking pixels. No promotions ` +
        `for other people's products.\n\n` +
        `Unsubscribe at any time:\n` +
        `   ${unsubscribeUrl}\n\n` +
        `With care,\n` +
        `The Battery Sensei team\n` +
        `https://battery-sensei.app`,
      de:
        `Du bist dabei. Hier ist der Download.\n\n` +
        `Battery Sensei ist eine kleine, unaufdringliche Mac-App. ` +
        `Sie behält deinen Akku im Blick, damit du es nicht musst, ` +
        `und meldet sich nur, wenn es wirklich wichtig ist.\n\n` +
        `   ${downloadUrl}\n\n` +
        `Was dich erwartet: etwa eine E-Mail pro neuer Version, ` +
        `höchstens einmal im Monat. Tipps, Änderungen und gelegentlich ` +
        `ein Blick hinter die Kulissen. Keine Tracking-Pixel. Keine ` +
        `Werbung für fremde Produkte.\n\n` +
        `Jederzeit abmelden:\n` +
        `   ${unsubscribeUrl}\n\n` +
        `Viele Grüße,\n` +
        `Das Battery-Sensei-Team\n` +
        `https://battery-sensei.app`,
      es:
        `Estás dentro. Aquí está la descarga.\n\n` +
        `Battery Sensei es una app pequeña y discreta para Mac. ` +
        `Cuida tu batería para que tú no tengas que hacerlo y solo ` +
        `avisa cuando importa de verdad.\n\n` +
        `   ${downloadUrl}\n\n` +
        `Qué esperar: aproximadamente un correo por lanzamiento, ` +
        `nunca más de una vez al mes. Consejos, notas de cambios y ` +
        `alguna mirada entre bambalinas. Sin píxeles de seguimiento. Sin ` +
        `promociones de otros productos.\n\n` +
        `Cancelar suscripción en cualquier momento:\n` +
        `   ${unsubscribeUrl}\n\n` +
        `Con mimo,\n` +
        `El equipo de Battery Sensei\n` +
        `https://battery-sensei.app`,
      fr:
        `Vous y êtes. Voici le téléchargement.\n\n` +
        `Battery Sensei est une petite app Mac discrète. Elle veille ` +
        `sur votre batterie à votre place et ne se manifeste que ` +
        `lorsque c'est vraiment utile.\n\n` +
        `   ${downloadUrl}\n\n` +
        `À quoi vous attendre : environ un e-mail par nouvelle version, ` +
        `jamais plus d'une fois par mois. Des conseils, les nouveautés, ` +
        `parfois un mot sur les coulisses. Pas de pixel de suivi. ` +
        `Pas de promo pour des produits tiers.\n\n` +
        `Se désabonner à tout moment :\n` +
        `   ${unsubscribeUrl}\n\n` +
        `Avec attention,\n` +
        `L'équipe Battery Sensei\n` +
        `https://battery-sensei.app`,
      ja:
        `ご登録ありがとうございます。ダウンロードはこちらから。\n\n` +
        `Battery Senseiは、小さく静かなMacアプリです。あなたに代わって` +
        `バッテリーを見守り、本当に必要なときだけそっとお知らせします。\n\n` +
        `   ${downloadUrl}\n\n` +
        `今後の配信について：配信はリリースごとに約 1 通、多くとも月 1 通` +
        `です。ヒント、変更履歴、ときどき舞台裏の話。トラッキングピクセル` +
        `や他社製品のプロモーションは行いません。\n\n` +
        `いつでも配信停止できます：\n` +
        `   ${unsubscribeUrl}\n\n` +
        `心を込めて、\n` +
        `Battery Sensei チーム\n` +
        `https://battery-sensei.app`,
    },
    locale,
  )
  return body
}
