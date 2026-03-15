import supabase from '../utils/supabase-client.js';
import slack from '../utils/slack-client.js';
import { log, error as logError } from '../utils/logger.js';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  // Find cohorts where application_close was yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const { data: closingCohorts, error: cohortErr } = await supabase
    .from('cohorts')
    .select('*, programs(*)')
    .eq('application_close', yesterdayStr)
    .eq('status', 'upcoming');

  if (cohortErr) {
    logError('fetch-closing-cohorts', cohortErr);
    process.exit(1);
  }

  if (!closingCohorts || closingCohorts.length === 0) {
    log('no-closing-cohorts', { date: yesterdayStr });
    return;
  }

  for (const cohort of closingCohorts) {
    log('processing-cohort', { slug: cohort.slug, name: cohort.name });
    const program = cohort.programs;

    // Fetch registrations
    const { data: registrations } = await supabase
      .from('cohort_registrations')
      .select('*, profiles(full_name, email, slack_user_id)')
      .eq('cohort_id', cohort.id)
      .eq('status', 'registered');

    if (!registrations || registrations.length === 0) {
      log('no-registrations', { cohort: cohort.slug });
      continue;
    }

    // Group by target role (from registration_data)
    const groups = {};
    for (const reg of registrations) {
      const role = reg.registration_data?.target_role || 'general';
      if (!groups[role]) groups[role] = [];
      groups[role].push(reg);
    }

    const podMinSize = program.schedule?.podMinSize || 4;
    const podMaxSize = program.schedule?.podMaxSize || 5;

    // Form pods
    const pods = formPods(groups, podMinSize, podMaxSize);
    log('pods-formed', { cohort: cohort.slug, podCount: Object.keys(pods).length });

    // Update registrations with pod assignments and set status to active
    for (const [podName, members] of Object.entries(pods)) {
      for (const reg of members) {
        if (!dryRun) {
          await supabase
            .from('cohort_registrations')
            .update({ pod: podName, status: 'active' })
            .eq('id', reg.id);
        }
        log('pod-assigned', { member: reg.profiles?.full_name, pod: podName, dryRun });
      }
    }

    // Send notifications
    for (const [podName, members] of Object.entries(pods)) {
      for (const reg of members) {
        const slackUserId = reg.profiles?.slack_user_id;
        if (!slackUserId) continue;

        const podMembers = members
          .filter((m) => m.id !== reg.id)
          .map((m) => m.profiles?.full_name || 'A team member');

        const message = buildWelcomeMessage({
          name: reg.profiles?.full_name || 'there',
          cohortName: cohort.name,
          podName,
          podMembers,
          kickoff: cohort.start_date,
          endDate: cohort.end_date,
          programSlug: program.slug,
          durationWeeks: program.duration_weeks,
        });

        if (dryRun) {
          log('would-send-dm', { to: slackUserId, message: message.substring(0, 100) + '...' });
        } else {
          try {
            await slack.postMessage(slackUserId, message);
            log('dm-sent', { to: slackUserId, member: reg.profiles?.full_name });
          } catch (err) {
            logError('dm-failed', { to: slackUserId, error: err.message });
          }
        }

        // Send email backup if SendGrid is configured
        if (process.env.SENDGRID_API_KEY && reg.profiles?.email) {
          if (dryRun) {
            log('would-send-email', { to: reg.profiles.email });
          } else {
            try {
              await sendEmail(reg.profiles.email, reg.profiles.full_name, cohort.name, podName, cohort.start_date);
              log('email-sent', { to: reg.profiles.email });
            } catch (err) {
              logError('email-failed', { to: reg.profiles.email, error: err.message });
            }
          }
        }
      }
    }

    log('cohort-processed', { slug: cohort.slug, totalMembers: registrations.length, totalPods: Object.keys(pods).length });
  }
}

function formPods(groups, minSize, maxSize) {
  const pods = {};
  const roleNames = Object.keys(groups);

  // Handle groups that are too small by merging with adjacent roles
  const mergedGroups = {};
  let carryover = [];
  let carryoverLabel = '';

  for (const role of roleNames) {
    const members = [...(groups[role] || []), ...carryover];
    carryover = [];
    carryoverLabel = '';

    if (members.length < minSize) {
      carryover = members;
      carryoverLabel = role;
      continue;
    }

    mergedGroups[role] = members;
  }

  // If there's leftover, merge with the last group
  if (carryover.length > 0) {
    const lastRole = Object.keys(mergedGroups).pop();
    if (lastRole) {
      mergedGroups[lastRole] = [...mergedGroups[lastRole], ...carryover];
    } else {
      mergedGroups[carryoverLabel || 'general'] = carryover;
    }
  }

  // Split large groups into multiple pods
  for (const [role, members] of Object.entries(mergedGroups)) {
    if (members.length <= maxSize) {
      pods[role] = members;
    } else {
      const numPods = Math.ceil(members.length / maxSize);
      for (let i = 0; i < numPods; i++) {
        const start = i * maxSize;
        const slice = members.slice(start, start + maxSize);
        if (slice.length > 0) {
          pods[numPods > 1 ? `${role}-${i + 1}` : role] = slice;
        }
      }
    }
  }

  return pods;
}

function buildWelcomeMessage({ name, cohortName, podName, podMembers, kickoff, endDate, programSlug, durationWeeks }) {
  const kickoffFormatted = new Date(kickoff).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const endFormatted = new Date(endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const podList = podMembers.length > 0
    ? podMembers.join(', ')
    : 'Your pod members will be announced soon';

  return [
    `Hey ${name}! Welcome to *${cohortName}*!`,
    '',
    `You've been placed in the *${podName}* pod with: ${podList}`,
    '',
    `*Key Dates*`,
    `Kickoff: ${kickoffFormatted}`,
    `End: ${endFormatted} (${durationWeeks} weeks)`,
    '',
    `*What to expect:*`,
    `- Weekly pod meetings with your group`,
    `- Log your progress each week at learn.webuildblack.com/programs/${programSlug}/updates`,
    `- Personalized coaching DMs every Monday`,
    '',
    `*Graduation criteria:*`,
    `- Log at least 6 of ${durationWeeks} weeks`,
    `- Attend at least 6 pod meetings`,
    `- Complete 4+ mock interviews`,
    `- Send 10+ job applications`,
    '',
    `Let's get it!`,
  ].join('\n');
}

async function sendEmail(to, name, cohortName, podName, kickoff) {
  const kickoffFormatted = new Date(kickoff).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: 'info@webuildblack.com', name: 'We Build Black' },
      subject: `Welcome to ${cohortName}!`,
      content: [{
        type: 'text/plain',
        value: `Hey ${name},\n\nYou've been placed in the ${podName} pod for ${cohortName}.\n\nKickoff: ${kickoffFormatted}\n\nLog your weekly progress at learn.webuildblack.com\n\nLet's get it!\n\n- The WBB Team`,
      }],
    }),
  });
}

main().catch((err) => {
  logError('fatal', err);
  process.exit(1);
});
