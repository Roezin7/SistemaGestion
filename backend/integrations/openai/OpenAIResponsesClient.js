class OpenAIResponsesClient {
  constructor({ apiKey = process.env.OPENAI_API_KEY, model = process.env.OPENAI_MODEL || 'gpt-5.6-luna',
    baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1', timeoutMs = 30000,
    fetchImpl = global.fetch } = {}) {
    this.apiKey = apiKey; this.model = model; this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.timeoutMs = timeoutMs; this.fetchImpl = fetchImpl;
  }

  async generateStructured({ instructions, input, schema, schemaName = 'agent_response' }) {
    if (!this.apiKey) throw new Error('OPENAI_API_KEY no está configurada');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/responses`, {
        method: 'POST', signal: controller.signal,
        headers: { Authorization: `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: this.model, instructions, input,
          max_output_tokens: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS) || 900,
          text: { format: { type: 'json_schema', name: schemaName, strict: true, schema } } }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.error?.message || `OpenAI respondió HTTP ${response.status}`);
        error.status = response.status; throw error;
      }
      const text = data.output_text || data.output?.flatMap((item) => item.content || [])
        .find((item) => item.type === 'output_text')?.text;
      if (!text) throw new Error('OpenAI no devolvió texto estructurado');
      return { data: JSON.parse(text), model: data.model || this.model, usage: data.usage || null, responseId: data.id };
    } finally { clearTimeout(timeout); }
  }
}
module.exports = { OpenAIResponsesClient };
