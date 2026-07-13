class WasenderClient {
  constructor({ baseUrl, apiKey, timeoutMs = 10000, fetchImpl = global.fetch }) {
    if (typeof fetchImpl !== 'function') {
      throw new Error('No hay una implementacion de fetch disponible');
    }
    this.baseUrl = String(
      baseUrl || process.env.WASENDER_API_BASE_URL || 'https://www.wasenderapi.com'
    ).replace(/\/+$/, '');
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
    this.fetchImpl = fetchImpl;
  }

  async sendText({ to, text }) {
    if (!this.apiKey) throw new Error('La conexion WasenderAPI no tiene API key');
    if (!to || !text) throw new Error('Destinatario y texto son obligatorios');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}/api/send-message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, text }),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        const error = new Error(data.message || `WasenderAPI respondio HTTP ${response.status}`);
        error.status = response.status;
        error.providerResponse = data;
        throw error;
      }
      return data;
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = { WasenderClient };
