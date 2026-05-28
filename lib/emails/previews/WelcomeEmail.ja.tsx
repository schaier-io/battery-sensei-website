import { WelcomeEmail } from '../WelcomeEmail.js'

export default function Preview() {
  return (
    <WelcomeEmail
      downloadUrl="https://battery-sensei.app/#download"
      unsubscribeUrl="https://battery-sensei.app/api/newsletter/unsubscribe?token=demo"
      locale="ja"
      siteUrl="https://battery-sensei.app"
    />
  )
}
