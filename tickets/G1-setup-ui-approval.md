---
id: G1
title: Setup UI approval
type: gate
status: not-started
phase: setup
order: 4
depends_on: [M1]
approves: M1
---

# G1 - Setup UI approval

> Type: gate · Status: not-started · Phase: setup

## Purpose

Approve the Setup UI ([M1](M1-setup-ui.md)) before its functionality is built.

## Preconditions

- [ ] [M1](M1-setup-ui.md) deliverables are complete

## Approval checklist

- [ ] Launch with no config: Setup appears, with the `MOCK DATA MODE` notice.
- [ ] `Connect` stays disabled until both fields are filled.
- [ ] Submitting a malformed URL (no scheme) shows the scheme error; `libsql://` is accepted.
- [ ] Submitting with token `bad` shows the connection failure panel with the retry and edit affordances.
- [ ] Submitting a good URL and token shows all three progress stages in order, then either the profile step or straight into the app (simulate the existing-profile path by setting the mock profile in the dev panel).
- [ ] Profile step: empty name or invalid email is rejected with the exact messages; valid input proceeds to Dashboard.
- [ ] In a development build, `d` from step 1 enters the app on mock data with the badge visible; in a production build the option is absent.
- [ ] Narrow terminal (60 columns): the form is readable and usable.
- [ ] Approve the copy, error wording, and the sense that this is a one-time gate before the app.

## On approval

- [ ] Set this ticket and [M1](M1-setup-ui.md) to `done`.
- [ ] Unblock the next ticket in the sequence.
