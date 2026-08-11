# Oureach.ai — multi-channel outreach dashboard

A college project: a single login where you connect your email plus your
Instagram, Facebook, Twitter/X and LinkedIn accounts, upload a list of leads,
write one message, and send it out across every connected channel — with a
dashboard that logs what was sent, to whom, on which platform, and whether it
succeeded.

## What actually works out of the box

- **Sign up / log in** — real accounts, passwords hashed with bcrypt, sessions via cookies.
- **Email sending — genuinely real.** Connect any SMTP account (e.g. Gmail
  with an [app password](https://myaccount.google.com/apppasswords)) and
  campaigns really send email through it via Nodemailer.
- **Instagram / Facebook / Twitter / LinkedIn — simulated by default.**
  Actually posting/DM'ing on these platforms requires you to register a
  developer app with each one and get it approved for messaging permissions,
  which can take days to weeks and can't be done inside a project by itself.
  So `DEMO_MODE=true` (the default, in `.env`) simulates realistic sends —
  a short delay and a ~92% success rate — so the whole product demos
  end-to-end today. Flip `DEMO_MODE=false` and fill in the API keys in `.env`
  once you've registered and been approved for each platform's API
  (see `src/social.js` for exactly which endpoint each one calls).
- **Lead lists** — upload a CSV (`sample_leads.csv` included) or add leads
  one at a time. Columns: `name, email, instagram, facebook, twitter, linkedin`.
- **Campaigns** — pick a channel, write a message (use `{{name}}` to
  personalize), select leads, launch. Every send is logged.
- **Per-user dashboard** — total leads/campaigns/sent/failed, a per-channel
  breakdown, and a recent-activity feed. Each user only sees their own data.
- **About / Founder page** — company page for Oureach.ai with your resume
  and photo as founder & CEO.

## Running it locally

```bash
npm install
cp .env.example .env      # then edit .env if you want (SESSION_SECRET etc.)
npm start
```

Open **http://localhost:3000**.

## Putting it online (free options for a college submission)

This is a plain Node/Express app with a small JSON file as its database, so
it deploys almost anywhere that runs Node:

**Render.com (recommended, free tier)**
1. Push this folder to a GitHub repo.
2. On Render: New → Web Service → connect the repo.
3. Build command: `npm install`. Start command: `npm start`.
4. Add environment variables from `.env.example` (at least `SESSION_SECRET`).
5. Deploy — Render gives you a public URL like `oureach-ai.onrender.com`.

**Railway.app** works the same way (New Project → Deploy from GitHub → set
env vars → it detects `npm start` automatically).

**Replit** also works if you'd rather not use GitHub: import this folder,
it auto-detects Node, add the `.env` values in the Secrets tab, hit Run.

> Note: the JSON-file database in `data/db.json` resets if the platform's
> free tier restarts/redeploys the container. That's fine for a demo/viva.
> For anything long-lived, swap `src/db.js` for a real database
> (e.g. Postgres) — the rest of the app doesn't need to change, since it
> only talks to `db.js`'s `load()`/`save()` functions.

## Project structure

```
server.js              Express app + all API routes
src/db.js               JSON-file data layer (users, accounts, leads, campaigns, logs)
src/auth.js              login-required middleware
src/mailer.js            real SMTP sending via Nodemailer
src/social.js            Instagram/Facebook/Twitter/LinkedIn sender (demo + real-API scaffolding)
public/index.html        login / sign up
public/dashboard.html     per-user dashboard, connect accounts, leads, campaigns
public/about.html         company + founder page
public/css/style.css      shared design system
```

## Extending it for a stronger submission

- Swap `src/db.js` for Postgres/MongoDB and mention it in your report as the
  production-readiness step.
- Add real OAuth "Connect with Instagram/LinkedIn" buttons instead of typing
  a handle — needs a registered developer app per platform.
- Add open/click tracking for email (a tracking pixel + link redirects).
- Add scheduled sends with a job queue (e.g. `node-cron`).
