// ============================================
// NVIDIA NIM AI — lead enrichment via LLM
// ============================================
const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');
const { withRetry, sleep } = require('../utils/helpers');

/**
 * Enrich an array of leads with AI scoring and outreach suggestions.
 * Processes leads in batches to respect rate limits.
 *
 * @param {Array} leads - cleaned lead objects
 * @returns {Promise<Array>} - leads with ai_score, ai_summary, outreach_message
 */
async function enrichLeadsWithAI(leads) {
  if (!config.nvidia.enabled || !config.nvidia.apiKey) {
    logger.warn('⚠️ NVIDIA NIM AI enrichment is disabled or API key missing — skipping');
    return leads;
  }

  logger.info(`🤖 Enriching ${leads.length} leads with NVIDIA NIM AI...`);

  const BATCH_SIZE = 5;
  const enriched = [];

  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map((lead) => enrichSingleLead(lead))
    );

    for (let j = 0; j < batchResults.length; j++) {
      if (batchResults[j].status === 'fulfilled') {
        enriched.push(batchResults[j].value);
      } else {
        logger.warn(`AI enrichment failed for lead "${batch[j].name}": ${batchResults[j].reason?.message}`);
        enriched.push(batch[j]); // keep original without AI data
      }
    }

    // Rate limit pause between batches
    if (i + BATCH_SIZE < leads.length) {
      await sleep(1000);
    }
  }

  logger.info(`✅ AI enrichment complete: ${enriched.length} leads processed`);
  return enriched;
}

/**
 * Enrich a single lead with AI analysis.
 */
async function enrichSingleLead(lead) {
  const prompt = buildPrompt(lead);

  const response = await withRetry(
    () =>
      axios.post(
        `${config.nvidia.baseUrl}/chat/completions`,
        {
          model: config.nvidia.model,
          messages: [
            {
              role: 'system',
              content:
                'You are a lead quality analyst. Respond ONLY with valid JSON. No markdown, no explanation.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 300,
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${config.nvidia.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      ),
    { retries: 2, baseDelay: 2000, label: `AI enrich: ${lead.name}` }
  );

  const content = response.data.choices?.[0]?.message?.content || '';
  const parsed = parseAIResponse(content);

  return {
    ...lead,
    aiScore: parsed.ai_score || '',
    aiSummary: parsed.ai_summary || '',
    outreachMessage: parsed.outreach_message || '',
  };
}

/**
 * Build the analysis prompt for a lead.
 */
function buildPrompt(lead) {
  return `Analyze this business lead and respond with JSON only:

Business: ${lead.name}
Category: ${lead.category}
Rating: ${lead.rating}
Reviews: ${lead.reviews}
Phone: ${lead.phone}
Website: ${lead.website}
Address: ${lead.address}

Return JSON with these exact keys:
{
  "ai_score": <number 1-10, where 10 = highest quality lead>,
  "ai_summary": "<one sentence summary of lead quality and potential>",
  "outreach_message": "<short cold outreach message for this business, max 2 sentences>"
}`;
}

/**
 * Parse AI response — handles JSON embedded in text.
 */
function parseAIResponse(content) {
  try {
    // Try direct parse
    return JSON.parse(content);
  } catch {
    // Try extracting JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        logger.debug(`Failed to parse AI JSON: ${content.substring(0, 200)}`);
      }
    }
    return {};
  }
}

module.exports = { enrichLeadsWithAI };
