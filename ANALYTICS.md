# Dawn website analytics

Create a GoatCounter site at https://www.goatcounter.com/ and keep its dashboard
private. Set the site URL to https://oi-ryh.github.io/Dawn/.
Copy the public count endpoint from its installation settings into `endpoint`
in analytics.js, then deploy. Never put an account password or API token here.
Until that value is set, analytics makes no external requests.

The standard GoatCounter script records pageviews. All three download buttons
record the event `download-dawn-1.0.3`. This measures clicks, not completed
downloads, installs, or Sparkle updates. Ad blockers and clicks before the
analytics script loads can prevent a count. Use the dashboard's unique event
visitors and unique site visitors over the same period for an approximate
download conversion rate; raw click totals / pageviews is a different metric.

When releasing another version, update both downloadURL and the event name/title
in analytics.js alongside the website's displayed version.

Verification after activation:
1. Open the published page with analytics allowed by your browser.
2. Confirm the pageview appears in your private dashboard.
3. Click a download button and confirm the DMG downloads and the event appears.
4. Block gc.zgo.at and confirm downloading still works.

Documentation: https://www.goatcounter.com/help/start
and https://www.goatcounter.com/help/events
