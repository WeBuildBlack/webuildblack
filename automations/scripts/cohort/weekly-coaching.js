import supabase from '../utils/supabase-client.js';
import slack from '../utils/slack-client.js';
import { log, error as logError } from '../utils/logger.js';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  // Find in-progress cohorts
  const { data: cohorts, error: cohortErr } = await supabase
    .from('cohorts')
    .select('*, programs(*)')
    .eq('status', 'in_progress');

  if (cohortErr) {
    logError('fetch-cohorts', cohortErr);
    process.exit(1);
  }

  if (!cohorts || cohorts.length === 0) {
    log('no-active-cohorts', {});
    return;
  }

  for (const cohort of cohorts) {
    log('processing-cohort', { slug: cohort.slug });
    const program = cohort.programs;

    // Get active registrations
    const { data: registrations } = await supabase
      .from('cohort_registrations')
      .select('*, profiles(full_name, email, slack_user_id)')
      .eq('cohort_id', cohort.id)
      .eq('status', 'active');

    if (!registrations || registrations.length === 0) continue;

    // Get all updates for this cohort
    const { data: allUpdates } = await supabase
      .from('weekly_updates')
      .select('*')
      .eq('cohort_id', cohort.id)
      .order('week_number', { ascending: true });

    // Calculate current week
    const start = new Date(cohort.start_date);
    const now = new Date();
    const currentWeek = Math.max(0, Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000)));

    for (const reg of registrations) {
      const memberUpdates = (allUpdates || []).filter((u) => u.user_id === reg.user_id);
      const analysis = analyzeMember(memberUpdates, currentWeek, program);
      const message = buildCoachingMessage(reg.profiles?.full_name || 'there', analysis, currentWeek, program);

      const slackUserId = reg.profiles?.slack_user_id;
      if (!slackUserId) continue;

      if (dryRun) {
        log('would-send-coaching', { to: slackUserId, name: reg.profiles?.full_name, message: message.substring(0, 150) + '...' });
      } else {
        try {
          await slack.postMessage(slackUserId, message);
          log('coaching-sent', { to: slackUserId, name: reg.profiles?.full_name });
        } catch (err) {
          logError('coaching-failed', { to: slackUserId, error: err.message });
        }
      }
    }

    // Pod-level summaries
    const pods = {};
    for (const reg of registrations) {
      const pod = reg.pod || 'unassigned';
      if (!pods[pod]) pods[pod] = [];
      pods[pod].push(reg);
    }

    for (const [podName, members] of Object.entries(pods)) {
      const podUpdates = (allUpdates || []).filter((u) =>
        members.some((m) => m.user_id === u.user_id)
      );
      const summary = buildPodSummary(podName, members, podUpdates, currentWeek);
      log('pod-summary', { pod: podName, summary: summary.substring(0, 100) + '...' });
    }

    log('cohort-complete', { slug: cohort.slug, membersProcessed: registrations.length });
  }
}

function analyzeMember(updates, currentWeek, program) {
  const weeksLogged = updates.length;
  const totalWeeks = currentWeek;

  // Consistency
  const consistency = totalWeeks > 0 ? weeksLogged / totalWeeks : 1;
  const podMeetings = updates.filter((u) => u.data?.pod_meeting_attended).length;

  // Activity totals
  const totals = {
    dsa: 0,
    systemDesign: 0,
    behavioral: 0,
    mockInterviews: 0,
    applications: 0,
    interviews: 0,
    offers: 0,
  };

  for (const u of updates) {
    totals.dsa += u.data?.dsa_problems || 0;
    totals.systemDesign += u.data?.system_design || 0;
    totals.behavioral += u.data?.behavioral_prep || 0;
    totals.mockInterviews += u.data?.mock_interviews || 0;
    totals.applications += u.data?.applications_sent || 0;
    totals.interviews += u.data?.interviews_scheduled || 0;
    totals.offers += u.data?.offers_received || 0;
  }

  // Momentum: compare last 2 weeks vs prior 2 weeks
  const recent = updates.filter((u) => u.week_number >= currentWeek - 2);
  const prior = updates.filter((u) => u.week_number >= currentWeek - 4 && u.week_number < currentWeek - 2);

  const recentActivity = recent.reduce((sum, u) =>
    sum + (u.data?.dsa_problems || 0) + (u.data?.applications_sent || 0) + (u.data?.mock_interviews || 0), 0
  );
  const priorActivity = prior.reduce((sum, u) =>
    sum + (u.data?.dsa_problems || 0) + (u.data?.applications_sent || 0) + (u.data?.mock_interviews || 0), 0
  );

  let momentum = 'steady';
  if (recentActivity > priorActivity * 1.2) momentum = 'up';
  else if (recentActivity < priorActivity * 0.8) momentum = 'down';

  // Confidence trend
  const confidenceScores = updates
    .filter((u) => u.data?.confidence)
    .map((u) => ({ week: u.week_number, score: u.data.confidence }));

  let confidenceTrend = 'stable';
  if (confidenceScores.length >= 2) {
    const last = confidenceScores[confidenceScores.length - 1].score;
    const secondLast = confidenceScores[confidenceScores.length - 2].score;
    if (last > secondLast) confidenceTrend = 'up';
    else if (last < secondLast) confidenceTrend = 'down';
  }

  // Blockers
  const recentBlockers = updates
    .filter((u) => u.data?.blockers && u.week_number >= currentWeek - 2)
    .map((u) => u.data.blockers);

  // Wins
  const recentWins = updates
    .filter((u) => u.data?.wins && u.week_number >= currentWeek - 2)
    .map((u) => u.data.wins);

  return {
    weeksLogged,
    totalWeeks,
    consistency,
    podMeetings,
    totals,
    momentum,
    confidenceTrend,
    latestConfidence: confidenceScores.length > 0 ? confidenceScores[confidenceScores.length - 1].score : null,
    recentBlockers,
    recentWins,
  };
}

function buildCoachingMessage(name, analysis, currentWeek, program) {
  const lines = [];
  lines.push(`Hey ${name}! Here's your Week ${currentWeek} check-in.`);
  lines.push('');

  // Wins first
  if (analysis.recentWins.length > 0) {
    lines.push(`*Shoutout:* ${analysis.recentWins[0]}`);
    lines.push('');
  }

  // Progress snapshot
  lines.push('*Your progress so far:*');
  lines.push(`- ${analysis.weeksLogged}/${analysis.totalWeeks} weeks logged`);
  lines.push(`- ${analysis.podMeetings} pod meetings attended`);
  lines.push(`- ${analysis.totals.mockInterviews} mock interviews`);
  lines.push(`- ${analysis.totals.applications} applications sent`);
  if (analysis.totals.interviews > 0) {
    lines.push(`- ${analysis.totals.interviews} interviews scheduled`);
  }
  if (analysis.totals.offers > 0) {
    lines.push(`- ${analysis.totals.offers} offers received!`);
  }
  lines.push('');

  // Nudges
  const nudges = [];

  if (analysis.consistency < 0.7) {
    nudges.push('You have some weeks without updates. Even a quick check-in helps build the habit and keeps your pod accountable.');
  }

  if (analysis.totals.mockInterviews < Math.floor(currentWeek * 0.5)) {
    nudges.push('Mock interviews are one of the highest-impact activities. Try to schedule at least one this week with a pod member.');
  }

  if (analysis.totals.applications < currentWeek * 1.5) {
    nudges.push('Your application pace could use a boost. Block 30 minutes this week for a focused application sprint.');
  }

  if (analysis.totals.dsa > 0 && analysis.totals.applications === 0) {
    nudges.push('Great DSA practice! Balance it with some applications so your prep translates into real opportunities.');
  }

  if (analysis.momentum === 'down') {
    nudges.push('Your activity has dipped recently. That is normal mid-program. Pick one small action for today to rebuild momentum.');
  }

  if (analysis.confidenceTrend === 'down') {
    nudges.push('Your confidence has dipped. Remember, this is a marathon. Reach out to your pod if you need support.');
  }

  if (analysis.podMeetings < Math.floor(currentWeek * 0.6)) {
    nudges.push('Try to make your next pod meeting. The accountability and support from your peers makes a real difference.');
  }

  if (nudges.length > 0) {
    lines.push('*This week, consider:*');
    for (const nudge of nudges.slice(0, 3)) {
      lines.push(`- ${nudge}`);
    }
    lines.push('');
  }

  // Blockers acknowledgment
  if (analysis.recentBlockers.length > 0) {
    lines.push(`*On your blocker:* "${analysis.recentBlockers[0].substring(0, 100)}" - let your pod know so they can help.`);
    lines.push('');
  }

  lines.push('Log this week\'s update: learn.webuildblack.com/programs/' + program.slug + '/updates');
  lines.push('');
  lines.push('Keep going!');

  return lines.join('\n');
}

function buildPodSummary(podName, members, updates, currentWeek) {
  const totalApps = updates.reduce((s, u) => s + (u.data?.applications_sent || 0), 0);
  const totalMocks = updates.reduce((s, u) => s + (u.data?.mock_interviews || 0), 0);
  const totalDSA = updates.reduce((s, u) => s + (u.data?.dsa_problems || 0), 0);
  const weeksLogged = new Set(updates.map((u) => `${u.user_id}-${u.week_number}`)).size;
  const avgLogged = members.length > 0 ? (weeksLogged / members.length).toFixed(1) : '0';

  return [
    `*${podName} Pod - Week ${currentWeek} Summary*`,
    '',
    `${members.length} members | ${avgLogged} avg weeks logged`,
    `${totalApps} total applications | ${totalMocks} total mocks | ${totalDSA} total DSA`,
    '',
    'Keep pushing each other!',
  ].join('\n');
}

main().catch((err) => {
  logError('fatal', err);
  process.exit(1);
});
