# Retention operations

## Deployment

1. Set `CRON_SECRET` in the Vercel production environment to a random value
   of at least 16 characters. Use `openssl rand -hex 32` to generate it.
2. Apply Prisma migrations with `pnpm db:deploy` before or with the production
   deployment. The migration adds legal-hold fields and the public-feature
   anonymization marker.
3. Deploy `vercel.json`. Production calls `/api/cron/retention` every day at
   `03:17 UTC`. Preview deployments do not run Vercel Cron jobs.
4. In Vercel, open Project → Settings → Cron Jobs. Confirm the path and
   schedule, then use **View Logs** after the first production invocation.

## Expected result

A successful invocation returns HTTP 200 and a count-only JSON report:

```json
{
  "ok": true,
  "pendingNewslettersDeleted": 0,
  "unsubscribedNewslettersMinimized": 0,
  "supportRequestsDeleted": 0,
  "privateFeatureRequestsDeleted": 0,
  "publicFeatureRequestsAnonymized": 0,
  "featureVoteIpsMinimized": 0,
  "licenseVotersDeleted": 0,
  "adminLoginAttemptsDeleted": 0,
  "failures": []
}
```

The job enforces these first-party deadlines:

- Unconfirmed newsletter: 48-hour link lifetime plus 7 days, or 9 days after
  collection. Resend contacts are removed before the Neon row.
- Unsubscribed newsletter: first enforce account-level opt-out and clear names
  in Resend, then reduce the Neon row to the minimum suppression/consent record.
- Support and pending/rejected feature data: 24 calendar months after last
  activity. Those feature states cannot receive votes, so their `updatedAt`
  reflects submission/moderation activity rather than public popularity.
- Maintained public feature entries: private fields are removed 24 calendar
  months after moderation/approval (creation for legacy rows). Votes and public
  roadmap edits do not extend this deadline; approved public copy, status,
  count, and non-identifying record fields remain.
- Vote IP addresses: removed after 30 days. The keyed voter/request relation
  remains while the vote and public entry exist, preserving counts and
  duplicate-vote prevention. Parent request deletion still cascades the vote.
- License-validation cache: deleted 60 days after last validation. Admin login
  attempts: deleted after 30 days unless an active security/legal hold applies.

## Failures and retries

Expired pending Resend contacts are addressed by both stored contact ids and
email. Unsubscribed contacts are forced to `unsubscribed: true`, with names
cleared, before local contact ids and request metadata are erased. `not_found`
is success. Any other Resend error keeps the Neon retry data and returns HTTP
503 with an opaque row id in `failures`; manually invoke the endpoint with the
same bearer secret after Resend recovers, or verify the next daily run.
Database/unexpected failures return HTTP 500. Vercel does not automatically
retry failed Cron invocations, so alert on non-200 results and inspect **View
Logs**. Operations are idempotent and safe to invoke again.

## Legal holds and provider settings

Set `retentionHoldUntil` on a `SupportRequest`, `FeatureRequest`, or
`AdminLoginAttempt` before its deadline when an active dispute, security
incident, or legal obligation requires preservation.
Use a UTC timestamp and document the reason outside free-form personal-data
fields. The next daily run applies retention after the timestamp passes.

Vercel Web Analytics, Speed Insights, and Vercel request-log retention are
provider-account settings; this Neon job cannot delete them. At every plan or
account change, manually confirm Analytics, Speed Insights, and Logs retention
in Vercel against the public privacy notice. Polar purchase retention remains
under Polar's independent policy and applicable accounting law.

Reference: [Vercel Cron management](https://vercel.com/docs/cron-jobs/manage-cron-jobs).
