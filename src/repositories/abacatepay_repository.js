class AbacatePayRepository {
  async createBilling(payload) {
    const rawRes = await fetch('https://api.abacatepay.com/v1/billing/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.ABACATEPAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await rawRes.json();

    console.log(`[AbacatePay] Status: ${rawRes.status}`, JSON.stringify(data, null, 2));

    if (!rawRes.ok) {
      throw new Error(`AbacatePay error ${rawRes.status}: ${JSON.stringify(data)}`);
    }

    return data;
  }
}

module.exports = new AbacatePayRepository();
