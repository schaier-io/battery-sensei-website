/**
 * Welcome email — sent after confirmation. Carries the download link
 * and sets cadence expectations. Unsubscribe link lives in the shared
 * EmailLayout footer (legally required from here on out).
 */
import { Button, Section, Text } from '@react-email/components'
import { EmailLayout } from './EmailLayout.js'
import { fontStack, jpStack, palette, serifStack } from './theme.js'

type Props = {
  downloadUrl: string
  unsubscribeUrl: string
  locale?: string
  siteUrl?: string
}

const COPY = {
  en: {
    preview: 'Welcome. Here\'s your download.',
    kicker: 'Welcome',
    kanji: '歓迎',
    headingPre: 'You\'re in.',
    headingItalic: 'Here\'s the download.',
    body: 'Battery Sensei is a small, quiet Mac app. It watches your battery so you don\'t have to, and speaks up only when it actually matters.',
    cta: 'Download Battery Sensei',
    expectKicker: 'What to expect',
    expectBody: 'Roughly one email per release, never more than once a month. Tips, changelogs, and the occasional behind-the-scenes note. No tracking pixels. No promotions for other people\'s products.',
    sign: 'With care,',
    signature: 'The Battery Sensei team',
  },
  de: {
    preview: 'Willkommen. Hier ist dein Download.',
    kicker: 'Willkommen',
    kanji: '歓迎',
    headingPre: 'Du bist dabei.',
    headingItalic: 'Hier ist der Download.',
    body: 'Battery Sensei ist eine kleine, unaufdringliche Mac-App. Sie behält deinen Akku im Blick, damit du es nicht musst, und meldet sich nur, wenn es wirklich wichtig ist.',
    cta: 'Battery Sensei herunterladen',
    expectKicker: 'Was dich erwartet',
    expectBody: 'Etwa eine E-Mail pro neuer Version, höchstens einmal im Monat. Tipps, Änderungen und gelegentlich ein Blick hinter die Kulissen. Keine Tracking-Pixel. Keine Werbung für fremde Produkte.',
    sign: 'Viele Grüße,',
    signature: 'Das Battery-Sensei-Team',
  },
  es: {
    preview: 'Te damos la bienvenida. Aquí está tu descarga.',
    kicker: 'Hola',
    kanji: '歓迎',
    headingPre: 'Estás dentro.',
    headingItalic: 'Aquí está la descarga.',
    body: 'Battery Sensei es una app pequeña y discreta para Mac. Cuida tu batería para que tú no tengas que hacerlo y solo avisa cuando importa de verdad.',
    cta: 'Descargar Battery Sensei',
    expectKicker: 'Qué esperar',
    expectBody: 'Aproximadamente un correo por lanzamiento, nunca más de una vez al mes. Consejos, notas de cambios y alguna mirada entre bambalinas. Sin píxeles de seguimiento. Sin promociones de otros productos.',
    sign: 'Con mimo,',
    signature: 'El equipo de Battery Sensei',
  },
  fr: {
    preview: 'Bienvenue. Voici votre téléchargement.',
    kicker: 'Bienvenue',
    kanji: '歓迎',
    headingPre: 'Vous y êtes.',
    headingItalic: 'Voici le téléchargement.',
    body: 'Battery Sensei est une petite app Mac discrète. Elle veille sur votre batterie à votre place et ne se manifeste que lorsque c\'est vraiment utile.',
    cta: 'Télécharger Battery Sensei',
    expectKicker: 'À quoi vous attendre',
    expectBody: 'Environ un e-mail par nouvelle version, jamais plus d\'une fois par mois. Des conseils, les nouveautés, parfois un mot sur les coulisses. Pas de pixel de suivi. Pas de promo pour des produits tiers.',
    sign: 'Avec attention,',
    signature: 'L\'équipe Battery Sensei',
  },
  ja: {
    preview: 'ようこそ。ダウンロードはこちらです。',
    kicker: 'ようこそ',
    kanji: '歓迎',
    headingPre: 'ご登録ありがとうございます。',
    headingItalic: 'ダウンロードはこちらから。',
    body: 'Battery Senseiは、小さく静かなMacアプリです。あなたに代わってバッテリーを見守り、本当に必要なときだけそっとお知らせします。',
    cta: 'Battery Sensei をダウンロード',
    expectKicker: '今後の配信について',
    expectBody: '配信はリリースごとに約 1 通、多くとも月 1 通です。ヒント、変更履歴、ときどき舞台裏の話。トラッキングピクセルや他社製品のプロモーションは行いません。',
    sign: '心を込めて、',
    signature: 'Battery Sensei チーム',
  },
} as const

type Locale = keyof typeof COPY

export function WelcomeEmail({
  downloadUrl,
  unsubscribeUrl,
  locale = 'en',
  siteUrl,
}: Props) {
  const l = COPY[locale as Locale] ?? COPY.en
  return (
    <EmailLayout
      preview={l.preview}
      unsubscribeUrl={unsubscribeUrl}
      locale={locale}
      siteUrl={siteUrl}
    >
      {/* Kicker */}
      <Text
        style={{
          margin: '0 0 18px',
          fontFamily: fontStack,
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.26em',
          color: palette.hinomaru,
        }}
      >
        {l.kicker}
        <span style={{ color: palette.nezumi, margin: '0 8px' }}>·</span>
        <span style={{ fontFamily: jpStack, letterSpacing: '0.18em' }}>
          {l.kanji}
        </span>
      </Text>

      {/* Headline */}
      <Text
        className="bs-display"
        style={{
          margin: '0 0 20px',
          fontFamily: serifStack,
          fontSize: '36px',
          lineHeight: '42px',
          fontWeight: 500,
          letterSpacing: '-0.022em',
          color: palette.sumi,
          fontFeatureSettings: '"kern", "liga", "dlig", "ss01"',
        }}
      >
        {l.headingPre}
        <span
          style={{
            display: 'block',
            fontStyle: 'italic',
            fontWeight: 500,
            color: palette.sumiSoft,
          }}
        >
          {l.headingItalic}
        </span>
      </Text>

      {/* Body */}
      <Text
        style={{
          margin: '0 0 28px',
          fontFamily: fontStack,
          fontSize: '16px',
          lineHeight: '28px',
          color: palette.sumiSoft,
          fontFeatureSettings: '"kern", "liga", "calt"',
          maxWidth: '460px',
        }}
      >
        {l.body}
      </Text>

      {/* CTA — sumi ink, refined serif label, leading download icon */}
      <Section style={{ margin: '0 0 32px' }}>
        <Button
          href={downloadUrl}
          className="bs-cta"
          style={{
            backgroundColor: palette.sumi,
            color: palette.washi,
            padding: '16px 30px 17px',
            borderRadius: '3px',
            fontFamily: serifStack,
            fontSize: '17px',
            fontWeight: 500,
            letterSpacing: '-0.005em',
            textDecoration: 'none',
            display: 'inline-block',
            boxShadow:
              '0 1px 0 rgba(28,26,23,0.3), 0 8px 18px -10px rgba(28,26,23,0.5)',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              fontFamily: fontStack,
              fontSize: '15px',
              marginRight: '10px',
              opacity: 0.92,
              transform: 'translateY(-1px)',
            }}
          >
            ↓
          </span>
          {l.cta}
        </Button>
      </Section>

      {/* What to expect — quiet sumi rule, no fill */}
      <Section
        style={{
          margin: '0 0 28px',
          padding: '4px 0 4px 18px',
          borderLeft: `1px solid ${palette.line}`,
        }}
      >
        <Text
          style={{
            margin: '0 0 6px',
            fontFamily: serifStack,
            fontStyle: 'italic',
            fontSize: '14px',
            letterSpacing: '-0.005em',
            color: palette.sumi,
          }}
        >
          {l.expectKicker}
        </Text>
        <Text
          style={{
            margin: 0,
            fontFamily: fontStack,
            fontSize: '14px',
            lineHeight: '23px',
            color: palette.sumiSoft,
          }}
        >
          {l.expectBody}
        </Text>
      </Section>

      {/* Signature */}
      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        style={{ width: '100%' }}
      >
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'middle' }}>
              <Text
                style={{
                  margin: 0,
                  fontFamily: serifStack,
                  fontStyle: 'italic',
                  fontSize: '14px',
                  color: palette.sumiSoft,
                  lineHeight: 1.4,
                }}
              >
                {l.sign}
                <br />
                <span style={{ color: palette.sumi, fontStyle: 'normal' }}>
                  {l.signature}
                </span>
              </Text>
            </td>
            <td
              style={{
                verticalAlign: 'middle',
                textAlign: 'right',
                width: '64px',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  fontFamily: jpStack,
                  fontSize: '24px',
                  fontWeight: 700,
                  color: palette.washi,
                  backgroundColor: palette.hinomaru,
                  width: '46px',
                  height: '46px',
                  lineHeight: '46px',
                  textAlign: 'center',
                  borderRadius: '2px',
                  transform: 'rotate(-3deg)',
                  boxShadow:
                    '0 1px 0 rgba(28,26,23,0.2), 0 4px 10px -4px rgba(188,0,45,0.5)',
                }}
              >
                電
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </EmailLayout>
  )
}

WelcomeEmail.PreviewProps = {
  downloadUrl: 'https://battery-sensei.app/#download',
  unsubscribeUrl:
    'https://battery-sensei.app/api/newsletter/unsubscribe?token=demo',
  locale: 'en',
  siteUrl: 'https://battery-sensei.app',
} satisfies Props

export default WelcomeEmail
