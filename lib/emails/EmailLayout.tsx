/**
 * Shared shell — "tea-ceremony correspondence" aesthetic.
 *
 *   - 560px column, washi-paper backdrop with inner deckle border
 *   - Masthead: hosted PNG mark + wordmark in Spectral, hairline rule
 *   - Single brush-stroke ornament (SVG) under the masthead
 *   - Vertical kanji column on the right as a tatebashira accent
 *     (handled by individual templates so they can pick their own glyphs)
 *   - Footer carries the CAN-SPAM trio when an unsubscribeUrl is passed;
 *     otherwise (confirm flow) it shows the "ignore this email" note
 *     instead — confirmation messages MUST NOT offer an unsubscribe link,
 *     because the recipient hasn't opted in yet.
 *
 * Fonts: Google Fonts via @import. Apple Mail, Gmail (Apple), and most
 * webmail clients honor it; Outlook gets the safe fallback stack. This
 * is a deliberate progressive enhancement.
 */
import {
  Body,
  Container,
  Font,
  Head,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { ReactNode } from 'react'
import { fontStack, jpStack, palette, serifStack } from './theme.js'

type Props = {
  preview: string
  /** When omitted, the footer renders the "ignore" note instead. */
  unsubscribeUrl?: string
  locale?: string
  /** Site URL for logo. Defaults to production. */
  siteUrl?: string
  children: ReactNode
}

const COPY = {
  en: {
    why: 'A quiet note from Battery Sensei · battery-sensei.app',
    ignore: 'Didn\'t sign up? You can ignore this email. Nothing is saved until you confirm.',
    unsub: 'Unsubscribe',
    tagline: 'Calm energy for your Mac.',
  },
  de: {
    why: 'Eine kurze Nachricht von Battery Sensei · battery-sensei.app',
    ignore: 'Nicht angemeldet? Ignoriere diese E-Mail einfach. Ohne deine Bestätigung wird nichts gespeichert.',
    unsub: 'Abmelden',
    tagline: 'Mehr Ruhe für deinen Mac-Akku.',
  },
  es: {
    why: 'Un mensaje tranquilo de Battery Sensei · battery-sensei.app',
    ignore: '¿No te registraste? Ignora este correo. No guardamos nada hasta que confirmes.',
    unsub: 'Cancelar suscripción',
    tagline: 'Batería en calma para tu Mac.',
  },
  fr: {
    why: 'Un mot discret de Battery Sensei · battery-sensei.app',
    ignore: 'Vous n\'avez rien demandé ? Ignorez ce message : rien n\'est enregistré tant que vous ne confirmez pas.',
    unsub: 'Se désabonner',
    tagline: 'Moins de stress pour la batterie de votre Mac.',
  },
  ja: {
    why: 'Battery Senseiより、静かなお知らせ · battery-sensei.app',
    ignore: 'ご登録のお心当たりがなければ、このメールは無視してください。ご確認いただくまで、何も保存されません。',
    unsub: '配信停止',
    tagline: 'Macのバッテリーに、静かな安心を。',
  },
} as const

type Locale = keyof typeof COPY

export function EmailLayout({
  preview,
  unsubscribeUrl,
  locale = 'en',
  siteUrl = 'https://battery-sensei.app',
  children,
}: Props) {
  const l = COPY[locale as Locale] ?? COPY.en

  return (
    <Html lang={locale}>
      <Head>
        {/* Mobile-friendly viewport + scaling. Apple Mail and modern
            webmail clients honor this; Outlook gracefully ignores it. */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light only" />
        {/* Responsive overrides — narrow viewports drop body padding from
            44px → 22px and tighten the display headline so it doesn't
            wrap awkwardly. Class hooks below match in the body markup. */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @media only screen and (max-width: 480px) {
                .bs-pad { padding-left: 22px !important; padding-right: 22px !important; }
                .bs-pad-top { padding-top: 26px !important; }
                .bs-display { font-size: 30px !important; line-height: 36px !important; }
                .bs-brush { width: 100% !important; max-width: 260px !important; }
                .bs-cta { display: block !important; width: 100% !important; box-sizing: border-box !important; text-align: center !important; }
              }
            `,
          }}
        />
        <Font
          fontFamily="Spectral"
          fallbackFontFamily={['Georgia', 'Times New Roman']}
          webFont={{
            url: 'https://fonts.gstatic.com/s/spectral/v18/rnCu-xZa_krGokauCeNq1wWyafOPXHIJErY.woff2',
            format: 'woff2',
          }}
          fontWeight={500}
          fontStyle="normal"
        />
        <Font
          fontFamily="Spectral"
          fallbackFontFamily={['Georgia', 'Times New Roman']}
          webFont={{
            url: 'https://fonts.gstatic.com/s/spectral/v18/rnCs-xZa_krGokauCeNq1wWyafOPXHIJErY.woff2',
            format: 'woff2',
          }}
          fontWeight={500}
          fontStyle="italic"
        />
        <Font
          fontFamily="Source Sans 3"
          fallbackFontFamily={['Helvetica', 'Arial', 'sans-serif']}
          webFont={{
            url: 'https://fonts.gstatic.com/s/sourcesans3/v18/nwpBtKy2OAdR1K-IwhWudF-R9QMylBJAV3Bo8Ky461EN_io6npLJ.woff2',
            format: 'woff2',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <Font
          fontFamily="Noto Serif JP"
          fallbackFontFamily="Georgia"
          webFont={{
            url: 'https://fonts.gstatic.com/s/notoserifjp/v30/xn71YHs72GKoTvER4Gn3b5eMRtWGkp6o7MjQ2bwxOubAILUkLZHjwo7p.116.woff2',
            format: 'woff2',
          }}
          fontWeight={700}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          padding: '40px 12px',
          backgroundColor: '#e8dec3',
          backgroundImage:
            'radial-gradient(at 20% 0%, rgba(255,255,255,0.55), transparent 55%), radial-gradient(at 80% 100%, rgba(200,155,60,0.10), transparent 60%)',
          fontFamily: fontStack,
          color: palette.sumi,
          WebkitFontSmoothing: 'antialiased',
        }}
      >
        <Container
          style={{
            maxWidth: '600px',
            margin: '0 auto',
            backgroundColor: palette.washi,
            borderRadius: '2px',
            // Layered borders mimic deckle-edge paper without images.
            boxShadow:
              `inset 0 0 0 1px ${palette.line},` +
              `inset 0 0 0 8px ${palette.washi},` +
              `inset 0 0 0 9px rgba(28,26,23,0.06),` +
              '0 1px 0 rgba(28,26,23,0.05),' +
              '0 24px 48px -20px rgba(28,26,23,0.18)',
            overflow: 'hidden',
          }}
        >
          {/* Masthead */}
          <Section
            className="bs-pad bs-pad-top"
            style={{
              padding: '36px 44px 0',
            }}
          >
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              style={{ width: '100%' }}
            >
              <tbody>
                <tr>
                  <td style={{ verticalAlign: 'middle', width: '52px' }}>
                    <Img
                      src={`${siteUrl}/app-icon-256.png`}
                      alt=""
                      width="44"
                      height="44"
                      style={{
                        display: 'block',
                      }}
                    />
                  </td>
                  <td
                    style={{
                      verticalAlign: 'middle',
                      paddingLeft: '14px',
                    }}
                  >
                    <Text
                      style={{
                        margin: 0,
                        fontFamily: serifStack,
                        fontSize: '20px',
                        fontWeight: 500,
                        letterSpacing: '-0.012em',
                        color: palette.sumi,
                        lineHeight: 1.1,
                      }}
                    >
                      Battery Sensei
                    </Text>
                    <Text
                      style={{
                        margin: '3px 0 0',
                        fontFamily: fontStack,
                        fontSize: '11px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.22em',
                        color: palette.nezumi,
                      }}
                    >
                      {l.tagline}
                    </Text>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Single brush stroke — hand-drawn ink ornament */}
            <Section style={{ padding: '28px 0 0' }}>
              <Img
                src={`data:image/svg+xml;utf8,${encodeURIComponent(brushSvg(palette.sumi))}`}
                alt=""
                className="bs-brush"
                width="380"
                height="12"
                style={{ display: 'block', width: '100%', maxWidth: '380px' }}
              />
            </Section>
          </Section>

          {/* Body */}
          <Section
            className="bs-pad"
            style={{ padding: '24px 44px 36px' }}
          >
            {children}
          </Section>

          {/* Footer */}
          <Section
            className="bs-pad"
            style={{
              padding: '24px 44px 36px',
              borderTop: `1px solid ${palette.line}`,
              backgroundColor: 'rgba(226, 214, 189, 0.35)',
            }}
          >
            <Text
              style={{
                margin: 0,
                fontFamily: fontStack,
                fontSize: '11px',
                lineHeight: '18px',
                letterSpacing: '0.04em',
                color: palette.sumiSoft,
              }}
            >
              {l.why}
            </Text>
            {unsubscribeUrl ? (
              <Text
                style={{
                  margin: '8px 0 0',
                  fontFamily: fontStack,
                  fontSize: '11px',
                  lineHeight: '18px',
                  letterSpacing: '0.04em',
                  color: palette.sumiSoft,
                }}
              >
                <Link
                  href={unsubscribeUrl}
                  style={{
                    color: palette.sumi,
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  {l.unsub}
                </Link>
              </Text>
            ) : (
              <Text
                style={{
                  margin: '8px 0 0',
                  fontFamily: fontStack,
                  fontSize: '11px',
                  lineHeight: '18px',
                  letterSpacing: '0.04em',
                  color: palette.nezumi,
                  fontStyle: 'italic',
                }}
              >
                {l.ignore}
              </Text>
            )}
          </Section>
        </Container>

        {/* Bottom kanji watermark */}
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          style={{ margin: '20px auto 0', width: '600px', maxWidth: '100%' }}
        >
          <tbody>
            <tr>
              <td style={{ textAlign: 'center' }}>
                <Text
                  style={{
                    margin: 0,
                    fontFamily: jpStack,
                    fontSize: '11px',
                    letterSpacing: '0.3em',
                    color: 'rgba(28,26,23,0.35)',
                  }}
                >
                  電 池 仙 人
                </Text>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  )
}

function brushSvg(color: string): string {
  // A single, slightly tapered horizontal brush stroke.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 10" width="120" height="10"><path d="M2 6 C 22 2, 60 8, 96 4 L 118 5" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="0.85"/><circle cx="118" cy="5" r="1.6" fill="${color}" opacity="0.85"/></svg>`
}

/**
 * Vertical kanji column — call from a template body to drop a
 * tatebashira (vertical pillar of glyphs) into the layout. Renders as
 * a small floated table on supported clients, falls back gracefully to
 * a hidden no-op on Outlook (which doesn't honor float in tables).
 */
export function KanjiColumn({ glyphs }: { glyphs: string[] }) {
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      align="right"
      style={{
        // @ts-expect-error -- mso conditional styles
        msoLineHeightRule: 'exactly',
      }}
    >
      <tbody>
        {glyphs.map((g, i) => (
          <tr key={i}>
            <td
              style={{
                fontFamily: jpStack,
                fontSize: '22px',
                lineHeight: '32px',
                fontWeight: 700,
                color: 'rgba(28,26,23,0.18)',
                textAlign: 'center',
                width: '28px',
              }}
            >
              {g}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
