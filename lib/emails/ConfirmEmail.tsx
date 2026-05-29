/**
 * Double opt-in confirmation email.
 *
 * NO unsubscribe link — by design. The recipient hasn't opted in yet,
 * so there's nothing to unsubscribe from. Instead the footer carries
 * an "if you didn't sign up, ignore this" note (CASL/CAN-SPAM friendly,
 * and matches how real opt-in funnels work).
 */
import { Button, Link, Section, Text } from '@react-email/components'
import { EmailLayout } from './EmailLayout.js'
import { fontStack, jpStack, palette, serifStack } from './theme.js'

type Props = {
  confirmUrl: string
  locale?: string
  siteUrl?: string
}

const COPY = {
  en: {
    preview: 'One click to confirm your Battery Sensei signup.',
    kicker: 'A note from Battery Sensei',
    kanji: '確認',
    headingPre: 'One quiet click',
    headingItalic: 'and you\'re on the list.',
    body: 'Tap below to confirm your email. We write rarely, and only when something genuinely useful for your Mac\'s battery is ready.',
    cta: 'Confirm my email',
    fallback: 'Button not working? Paste this link:',
    expiry: 'This link is valid for 48 hours.',
    sign: 'With care,',
    signature: 'The Battery Sensei team',
  },
  de: {
    preview: 'Ein Klick, um deine Anmeldung zu bestätigen.',
    kicker: 'Eine Nachricht von Battery Sensei',
    kanji: '確認',
    headingPre: 'Ein kurzer Klick',
    headingItalic: 'und wir legen los.',
    body: 'Bestätige unten deine E-Mail-Adresse. Wir schreiben selten und nur dann, wenn es deinem Mac-Akku wirklich hilft.',
    cta: 'E-Mail bestätigen',
    fallback: 'Funktioniert der Button nicht? Kopiere diesen Link:',
    expiry: 'Dieser Link ist 48 Stunden gültig.',
    sign: 'Viele Grüße,',
    signature: 'Das Battery-Sensei-Team',
  },
  es: {
    preview: 'Un clic para confirmar tu suscripción.',
    kicker: 'Una nota de Battery Sensei',
    kanji: '確認',
    headingPre: 'Un clic',
    headingItalic: 'y todo listo.',
    body: 'Pulsa abajo para confirmar tu correo. Escribimos poco, solo cuando hay algo realmente útil para la batería de tu Mac.',
    cta: 'Confirmar mi correo',
    fallback: '¿El botón no funciona? Pega este enlace:',
    expiry: 'Este enlace caduca en 48 horas.',
    sign: 'Con mimo,',
    signature: 'El equipo de Battery Sensei',
  },
  fr: {
    preview: 'Un clic pour confirmer votre inscription.',
    kicker: 'Un mot de Battery Sensei',
    kanji: '確認',
    headingPre: 'Un dernier clic',
    headingItalic: 'et c\'est confirmé.',
    body: 'Confirmez votre adresse ci-dessous. Nous écrivons rarement, seulement quand quelque chose peut vraiment aider la batterie de votre Mac.',
    cta: 'Confirmer mon adresse',
    fallback: 'Le bouton ne fonctionne pas ? Collez ce lien :',
    expiry: 'Ce lien est valable 48 heures.',
    sign: 'Avec attention,',
    signature: 'L\'équipe Battery Sensei',
  },
  ja: {
    preview: 'ワンクリックでご登録を完了してください。',
    kicker: 'Battery Senseiより',
    kanji: '確認',
    headingPre: 'あとひと押しで',
    headingItalic: '登録完了です。',
    body: '下のボタンを押してメールアドレスをご確認ください。配信は控えめに、Macのバッテリーに本当に役立つことがあるときだけお送りします。',
    cta: 'メールを確認する',
    fallback: 'ボタンが動かない場合は、このリンクをご利用ください：',
    expiry: 'このリンクは48時間有効です。',
    sign: '心を込めて、',
    signature: 'Battery Sensei チーム',
  },
} as const

type Locale = keyof typeof COPY

export function ConfirmEmail({
  confirmUrl,
  locale = 'en',
  siteUrl,
}: Props) {
  const l = COPY[locale as Locale] ?? COPY.en
  return (
    <EmailLayout
      preview={l.preview}
      locale={locale}
      siteUrl={siteUrl}
      // No unsubscribeUrl on purpose — see file header.
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
          margin: '0 0 30px',
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

      {/* CTA — refined serif label, leading checkmark icon */}
      <Section style={{ margin: '0 0 26px' }}>
        <Button
          href={confirmUrl}
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
              fontSize: '14px',
              marginRight: '10px',
              opacity: 0.9,
              transform: 'translateY(-1px)',
            }}
          >
            ✓
          </span>
          {l.cta}
        </Button>
      </Section>

      {/* Fallback link */}
      <Text
        style={{
          margin: '0 0 6px',
          fontFamily: fontStack,
          fontSize: '12px',
          letterSpacing: '0.04em',
          color: palette.nezumi,
        }}
      >
        {l.fallback}
      </Text>
      <Text
        style={{
          margin: '0 0 30px',
          fontFamily: fontStack,
          fontSize: '12px',
          wordBreak: 'break-all',
        }}
      >
        <Link
          href={confirmUrl}
          style={{
            color: palette.sumiSoft,
            textDecoration: 'underline',
            textUnderlineOffset: '2px',
          }}
        >
          {confirmUrl}
        </Link>
      </Text>

      {/* Meta */}
      <Text
        style={{
          margin: '0 0 30px',
          fontFamily: fontStack,
          fontStyle: 'italic',
          fontSize: '12px',
          color: palette.nezumi,
        }}
      >
        {l.expiry}
      </Text>

      {/* Signature with hinomaru chop */}
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

ConfirmEmail.PreviewProps = {
  confirmUrl:
    'https://battery-sensei.app/api/newsletter/confirm?token=demo',
  locale: 'en',
  siteUrl: 'https://battery-sensei.app',
} satisfies Props

export default ConfirmEmail
