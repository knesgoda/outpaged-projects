import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      channel, 
      message, 
      taskId, 
      taskTitle, 
      taskUrl,
      type = 'notification' 
    } = await req.json();
    
    const slackWebhookUrl = Deno.env.get('SLACK_WEBHOOK_URL');
    
    if (!slackWebhookUrl) {
      throw new Error('SLACK_WEBHOOK_URL not configured');
    }

    let blocks: any[] = [];

    switch (type) {
      case 'task_assigned':
        blocks = [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🎯 *New Task Assigned*\n\n*${taskTitle}*\n${message}`
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'View Task'
                },
                url: taskUrl,
                style: 'primary'
              }
            ]
          }
        ];
        break;

      case 'task_completed':
        blocks = [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `✅ *Task Completed*\n\n*${taskTitle}*\n${message}`
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'View Task'
                },
                url: taskUrl
              }
            ]
          }
        ];
        break;

      case 'mention':
        blocks = [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `💬 *You were mentioned*\n\n${message}\n\nTask: *${taskTitle}*`
            }
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: 'View Context'
                },
                url: taskUrl,
                style: 'primary'
              }
            ]
          }
        ];
        break;

      case 'sprint_complete':
        blocks = [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `🎉 *Sprint Completed*\n\n${message}`
            }
          }
        ];
        break;

      default:
        blocks = [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: message
            }
          }
        ];
    }

    const slackPayload = {
      channel: channel || '#general',
      blocks: blocks,
      unfurl_links: false,
      unfurl_media: false
    };

    const response = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Slack API error:', response.status, errorText);
      throw new Error(`Slack API error: ${response.status}`);
    }

    console.log('Slack notification sent successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error sending Slack notification:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
