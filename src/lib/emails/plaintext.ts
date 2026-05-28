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
        `One quiet click, and we begin.\n\n` +
        `Confirm your email by opening this link — we only write when ` +
        `something genuinely useful for your Mac's battery is ready.\n\n` +
        `   ${confirmUrl}\n\n` +
        `This link rests for 48 hours.\n\n` +
        `If you didn't sign up, you can let this drift past — nothing ` +
        `is saved until you confirm.\n\n` +
        `With care,\n` +
        `The Battery Sensei team\n` +
        `https://battery-sensei.app`,
      de:
        `Ein leiser Klick — und wir beginnen.\n\n` +
        `Bestätige deine E-Mail über diesen Link. Wir schreiben nur, ` +
        `wenn es wirklich nützlich für den Akku deines Macs ist.\n\n` +
        `   ${confirmUrl}\n\n` +
        `Dieser Link ruht 48 Stunden.\n\n` +
        `Nicht angemeldet? Lass die E-Mail einfach vorbeiziehen — ` +
        `ohne deine Bestätigung wird nichts gespeichert.\n\n` +
        `Mit Sorgfalt,\n` +
        `Das Battery Sensei Team\n` +
        `https://battery-sensei.app`,
      es:
        `Un clic tranquilo, y comenzamos.\n\n` +
        `Confirma tu correo abriendo este enlace. Escribimos poco — ` +
        `solo cuando hay algo realmente útil para la batería de tu Mac.\n\n` +
        `   ${confirmUrl}\n\n` +
        `Este enlace reposa 48 horas.\n\n` +
        `¿No te registraste? Déjalo pasar — nada se guarda hasta ` +
        `que confirmes.\n\n` +
        `Con cuidado,\n` +
        `El equipo de Battery Sensei\n` +
        `https://battery-sensei.app`,
      fr:
        `Un clic discret, et nous commençons.\n\n` +
        `Confirmez votre adresse en ouvrant ce lien. Nous écrivons ` +
        `rarement — seulement quand il y a vraiment de quoi aider ` +
        `la batterie de votre Mac.\n\n` +
        `   ${confirmUrl}\n\n` +
        `Ce lien repose 48 heures.\n\n` +
        `Pas inscrit·e ? Laissez ce message passer — rien n'est ` +
        `enregistré tant que vous ne confirmez pas.\n\n` +
        `Avec soin,\n` +
        `L'équipe Battery Sensei\n` +
        `https://battery-sensei.app`,
      ja:
        `ひと押しの静けさ。そして、はじまる。\n\n` +
        `下のリンクからメールアドレスをご確認ください。配信は控えめに、` +
        `Mac のバッテリーに本当に役立つときだけお送りします。\n\n` +
        `   ${confirmUrl}\n\n` +
        `このリンクは 48 時間で静かに閉じます。\n\n` +
        `ご登録のお心当たりがなければ、そっと閉じてください。` +
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
        `Battery Sensei ist eine kleine, leise Mac-App. Sie achtet ` +
        `auf deinen Akku, damit du es nicht tun musst — und meldet ` +
        `sich nur, wenn es wirklich zählt.\n\n` +
        `   ${downloadUrl}\n\n` +
        `Was dich erwartet: etwa eine E-Mail pro Release, höchstens ` +
        `einmal im Monat. Tipps, Changelogs und gelegentlich ein ` +
        `Blick hinter die Kulissen. Keine Tracking-Pixel. Keine ` +
        `Werbung für andere Produkte.\n\n` +
        `Jederzeit abmelden:\n` +
        `   ${unsubscribeUrl}\n\n` +
        `Mit Sorgfalt,\n` +
        `Das Battery Sensei Team\n` +
        `https://battery-sensei.app`,
      es:
        `Estás dentro. Aquí está la descarga.\n\n` +
        `Battery Sensei es una app pequeña y silenciosa para Mac. ` +
        `Cuida tu batería para que tú no tengas que hacerlo, y solo ` +
        `habla cuando importa de verdad.\n\n` +
        `   ${downloadUrl}\n\n` +
        `Qué esperar: aproximadamente un correo por lanzamiento, ` +
        `nunca más de una vez al mes. Consejos, changelogs y alguna ` +
        `nota entre bambalinas. Sin píxeles de seguimiento. Sin ` +
        `promociones de otros productos.\n\n` +
        `Cancelar suscripción en cualquier momento:\n` +
        `   ${unsubscribeUrl}\n\n` +
        `Con cuidado,\n` +
        `El equipo de Battery Sensei\n` +
        `https://battery-sensei.app`,
      fr:
        `Vous y êtes. Voici le téléchargement.\n\n` +
        `Battery Sensei est une petite app Mac, discrète. Elle veille ` +
        `sur votre batterie à votre place, et ne se manifeste que ` +
        `lorsque c'est vraiment utile.\n\n` +
        `   ${downloadUrl}\n\n` +
        `À quoi vous attendre : environ un email par release, jamais ` +
        `plus d'une fois par mois. Astuces, changelogs et parfois une ` +
        `note en coulisses. Pas de pixel de suivi. Pas de promo pour ` +
        `des produits tiers.\n\n` +
        `Se désabonner à tout moment :\n` +
        `   ${unsubscribeUrl}\n\n` +
        `Avec soin,\n` +
        `L'équipe Battery Sensei\n` +
        `https://battery-sensei.app`,
      ja:
        `ご登録ありがとうございます。ダウンロードはこちらから。\n\n` +
        `Battery Sensei は、小さく静かな Mac アプリです。あなたに代わって` +
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
