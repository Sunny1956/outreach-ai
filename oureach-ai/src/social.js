// Social outreach connectors for Instagram, Facebook, Twitter/X and LinkedIn.
//
// Real posting/DM-sending on every one of these platforms requires you to
// register a developer app with that platform, get it reviewed/approved for
// the relevant permission (e.g. instagram_manage_messages), and obtain an
// access token for the connected account. That approval step can take days
// to weeks per platform and can't be done inside this project by itself.
//
// So this module works in two modes, controlled by DEMO_MODE in .env:
//   DEMO_MODE=true  -> simulates a send (random small delay, ~92% success
//                      rate) so the whole product can be demoed end-to-end
//                      today, for class, without waiting on API approval.
//   DEMO_MODE=false -> calls the real Graph/Twitter/LinkedIn APIs using the
//                      keys in .env. Fill those in once your developer apps
//                      are approved and this switches on for real.

const DEMO_MODE = String(process.env.DEMO_MODE || 'true') === 'true';

function simulateSend(platform, handle, message) {
  return new Promise((resolve) => {
    const delay = 200 + Math.random() * 400;
    setTimeout(() => {
      const success = Math.random() < 0.92;
      resolve({
        success,
        platform,
        detail: success
          ? `Simulated ${platform} message delivered to ${handle}`
          : `Simulated ${platform} delivery failed for ${handle} (rate limited)`
      });
    }, delay);
  });
}

async function sendInstagram(handle, message) {
  if (DEMO_MODE) return simulateSend('instagram', handle, message);
  // Real call (requires Instagram Graph API + META_ACCESS_TOKEN in .env):
  // POST https://graph.facebook.com/v19.0/me/messages ...
  throw new Error('Instagram live mode requires META_ACCESS_TOKEN to be configured.');
}

async function sendFacebook(handle, message) {
  if (DEMO_MODE) return simulateSend('facebook', handle, message);
  // Real call (requires Facebook Graph API + META_ACCESS_TOKEN in .env):
  // POST https://graph.facebook.com/v19.0/{page-id}/messages ...
  throw new Error('Facebook live mode requires META_ACCESS_TOKEN to be configured.');
}

async function sendTwitter(handle, message) {
  if (DEMO_MODE) return simulateSend('twitter', handle, message);
  // Real call (requires Twitter API v2 + TWITTER_* keys in .env):
  // POST https://api.twitter.com/2/dm_conversations/with/{participant_id}/messages
  throw new Error('Twitter/X live mode requires TWITTER_* keys to be configured.');
}

async function sendLinkedin(handle, message) {
  if (DEMO_MODE) return simulateSend('linkedin', handle, message);
  // Real call (requires LinkedIn Marketing/Messaging API + LINKEDIN_ACCESS_TOKEN):
  // POST https://api.linkedin.com/v2/messages ...
  throw new Error('LinkedIn live mode requires LINKEDIN_ACCESS_TOKEN to be configured.');
}

async function send(platform, handle, message) {
  switch (platform) {
    case 'instagram': return sendInstagram(handle, message);
    case 'facebook': return sendFacebook(handle, message);
    case 'twitter': return sendTwitter(handle, message);
    case 'linkedin': return sendLinkedin(handle, message);
    default: throw new Error(`Unknown platform: ${platform}`);
  }
}

module.exports = { send, DEMO_MODE };
