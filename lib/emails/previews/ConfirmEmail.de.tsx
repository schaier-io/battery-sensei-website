import { ConfirmEmail } from '../ConfirmEmail.js'

export default function Preview() {
  return (
    <ConfirmEmail
      confirmUrl="https://battery-sensei.app/api/newsletter/confirm?token=demo"
      locale="de"
      siteUrl="https://battery-sensei.app"
    />
  )
}
