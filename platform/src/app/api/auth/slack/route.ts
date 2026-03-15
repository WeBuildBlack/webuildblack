import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // 'login', 'signup', or courseSlug
  const error = searchParams.get('error');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || origin;

  const isAuthFlow = state === 'login' || state === 'signup';
  const isProgramRegister = state?.startsWith('program-register:') ?? false;
  const programSlug = isProgramRegister && state ? state.split(':')[1] : null;

  if (error || !code) {
    if (isAuthFlow) {
      return NextResponse.redirect(`${appUrl}/auth/login?error=slack_denied`);
    }
    return NextResponse.redirect(`${appUrl}/checkout/${state || ''}?error=slack_denied`);
  }

  // Exchange code for token
  const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/slack`,
    }),
  });

  const tokenData = await tokenRes.json();

  if (!tokenData.ok) {
    console.error('Slack OAuth failed:', tokenData.error);
    if (isAuthFlow) {
      return NextResponse.redirect(`${appUrl}/auth/login?error=slack_failed`);
    }
    return NextResponse.redirect(`${appUrl}/checkout/${state || ''}?error=slack_failed`);
  }

  // Get user identity
  const identityRes = await fetch('https://slack.com/api/users.identity', {
    headers: { Authorization: `Bearer ${tokenData.authed_user.access_token}` },
  });

  const identity = await identityRes.json();

  if (!identity.ok) {
    console.error('Slack identity failed:', identity.error);
    if (isAuthFlow) {
      return NextResponse.redirect(`${appUrl}/auth/login?error=slack_identity_failed`);
    }
    return NextResponse.redirect(`${appUrl}/checkout/${state || ''}?error=slack_identity_failed`);
  }

  // Check team ID matches WBB workspace
  const wbbTeamId = process.env.WBB_SLACK_TEAM_ID;
  const userTeamId = identity.team?.id;

  if (!wbbTeamId || userTeamId !== wbbTeamId) {
    if (isAuthFlow) {
      return NextResponse.redirect(`${appUrl}/auth/login?error=not_wbb_member`);
    }
    return NextResponse.redirect(`${appUrl}/checkout/${state || ''}?error=not_wbb_member`);
  }

  const slackEmail = identity.user?.email;
  const slackName = identity.user?.name;
  const slackUserId = identity.user?.id;

  if (!slackEmail) {
    if (isAuthFlow) {
      return NextResponse.redirect(`${appUrl}/auth/login?error=no_email`);
    }
    return NextResponse.redirect(`${appUrl}/checkout/${state || ''}?error=no_email`);
  }

  const supabase = createClient();
  const adminSupabase = createServiceClient();
  const slackPassword = `slack_${slackUserId}_${wbbTeamId}`;

  if (isAuthFlow || isProgramRegister) {
    // Try to sign in first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: slackEmail,
      password: slackPassword,
    });

    if (!signInError) {
      // Signed in successfully — update profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await adminSupabase
          .from('profiles')
          .update({
            is_wbb_member: true,
            slack_user_id: slackUserId,
            slack_team_id: userTeamId,
          })
          .eq('id', user.id);
      }
      if (programSlug) {
        return NextResponse.redirect(`${appUrl}/programs/${programSlug}`);
      }
      return NextResponse.redirect(`${appUrl}/dashboard`);
    }

    // Account doesn't exist — create one with admin client (bypasses email confirmation)
    const { data: newUser, error: createError } = await adminSupabase.auth.admin.createUser({
      email: slackEmail,
      password: slackPassword,
      email_confirm: true,
      user_metadata: {
        full_name: slackName,
        slack_user_id: slackUserId,
        is_wbb_member: true,
      },
    });

    if (createError) {
      console.error('Slack user creation failed:', createError.message);
      return NextResponse.redirect(`${appUrl}/auth/login?error=signup_failed`);
    }

    // Update profile
    if (newUser.user) {
      await adminSupabase
        .from('profiles')
        .update({
          is_wbb_member: true,
          slack_user_id: slackUserId,
          slack_team_id: userTeamId,
          full_name: slackName,
        })
        .eq('id', newUser.user.id);
    }

    // Now sign them in to set the session cookie
    await supabase.auth.signInWithPassword({
      email: slackEmail,
      password: slackPassword,
    });

    if (programSlug) {
      return NextResponse.redirect(`${appUrl}/programs/${programSlug}`);
    }
    return NextResponse.redirect(`${appUrl}/dashboard`);
  }

  // Original checkout flow
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/auth/login?next=/checkout/${state}?verify=slack`);
  }

  // Mark as WBB member
  await adminSupabase
    .from('profiles')
    .update({
      is_wbb_member: true,
      slack_user_id: slackUserId,
      slack_team_id: userTeamId,
    })
    .eq('id', user.id);

  // Auto-enroll in course (look up course UUID by slug)
  if (state) {
    const { data: course } = await adminSupabase
      .from('courses')
      .select('id')
      .eq('slug', state)
      .single();

    if (course) {
      await adminSupabase.from('enrollments').upsert({
        user_id: user.id,
        course_id: course.id,
        access_type: 'wbb_member',
      }, {
        onConflict: 'user_id,course_id',
      });
    }
  }

  return NextResponse.redirect(`${appUrl}/checkout/success`);
}
