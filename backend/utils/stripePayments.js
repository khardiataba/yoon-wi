const STRIPE_SECRET_KEY = String(process.env.STRIPE_SECRET_KEY || "").trim()
const STRIPE_CURRENCY = String(process.env.STRIPE_CURRENCY || "xof").trim().toLowerCase()

const getStripeConfig = () => ({
  enabled: Boolean(STRIPE_SECRET_KEY),
  secretKey: STRIPE_SECRET_KEY,
  currency: STRIPE_CURRENCY
})

const createCheckoutSession = async ({
  amount,
  serviceRequestId,
  serviceLabel,
  customerEmail,
  successUrl,
  cancelUrl
}) => {
  if (!STRIPE_SECRET_KEY) {
    throw new Error("Stripe n'est pas configure sur le serveur")
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Montant de paiement invalide")
  }

  const body = new URLSearchParams()
  body.append("payment_method_types[]", "card")
  body.append("mode", "payment")
  body.append("success_url", successUrl)
  body.append("cancel_url", cancelUrl)
  body.append("line_items[0][price_data][currency]", STRIPE_CURRENCY)
  body.append("line_items[0][price_data][product_data][name]", serviceLabel)
  body.append("line_items[0][price_data][unit_amount]", String(Math.round(amount)))
  body.append("line_items[0][price_data][unit_amount_decimal]", String(Math.round(amount)))
  body.append("line_items[0][price_data][tax_behavior]", "exclusive")
  body.append("line_items[0][quantity]", "1")
  if (customerEmail) {
    body.append("customer_email", customerEmail)
  }
  body.append("metadata[serviceRequestId]", String(serviceRequestId))
  body.append("metadata[type]", "platform_contribution")

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: body.toString()
  })

  const data = await response.json()
  if (!response.ok) {
    const errorMessage = data?.error?.message || "Erreur Stripe inconnue"
    throw new Error(`Stripe: ${errorMessage}`)
  }

  return data
}

module.exports = {
  getStripeConfig,
  createCheckoutSession
}
