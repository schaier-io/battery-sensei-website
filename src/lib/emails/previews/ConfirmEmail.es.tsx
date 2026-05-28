import { ConfirmEmail } from '../ConfirmEmail'

export default function Preview() {
  return (
    <ConfirmEmail
      confirmUrl="https://battery-sensei.app/api/newsletter/confirm?token=demo"
      locale="es"
      siteUrl="https://battery-sensei.app"
    />
  )
}
