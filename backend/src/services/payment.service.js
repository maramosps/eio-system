/*
═══════════════════════════════════════════════════════════
  E.I.O - PAYMENT SERVICE
  Serviço de integração com Stripe e Mercado Pago
═══════════════════════════════════════════════════════════
*/

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const mercadopago = require('mercadopago');

// Configurar Mercado Pago
mercadopago.configure({
    access_token: process.env.MERCADOPAGO_ACCESS_TOKEN
});

/**
 * STRIPE - Criar sessão de checkout
 */
async function createStripeCheckoutSession(userId, email, successUrl, cancelUrl) {
    try {
        const session = await stripe.checkout.sessions.create({
            customer_email: email,
            client_reference_id: userId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'brl',
                        product_data: {
                            name: 'E.I.O Professional - Acesso Inicial',
                            description: 'Acesso completo ao sistema de automação E.I.O'
                        },
                        unit_amount: 29990 // R$ 299,90 em centavos
                    },
                    quantity: 1
                }
            ],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                userId,
                plan: 'professional'
            }
        });

        return { success: true, sessionUrl: session.url, sessionId: session.id };
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * STRIPE - Criar assinatura mensal
 */
async function createStripeSubscription(customerId, priceId) {
    try {
        const subscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: priceId }],
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent']
        });

        return { success: true, subscription };
    } catch (error) {
        console.error('Stripe subscription error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * STRIPE - Cancelar assinatura
 */
async function cancelStripeSubscription(subscriptionId) {
    try {
        const subscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
        });

        return { success: true, subscription };
    } catch (error) {
        console.error('Stripe cancel error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * MERCADO PAGO - Criar preferência de pagamento
 */
async function createMercadoPagoPreference(userId, email) {
    try {
        const preference = {
            items: [
                {
                    title: 'E.I.O Professional - Acesso Inicial',
                    description: 'Acesso completo ao sistema de automação E.I.O',
                    unit_price: 299.90,
                    quantity: 1,
                    currency_id: 'BRL'
                }
            ],
            payer: {
                email: email
            },
            back_urls: {
                success: `${process.env.FRONTEND_URL}/payment/success`,
                failure: `${process.env.FRONTEND_URL}/payment/failure`,
                pending: `${process.env.FRONTEND_URL}/payment/pending`
            },
            auto_return: 'approved',
            external_reference: userId,
            metadata: {
                userId,
                plan: 'professional'
            },
            notification_url: `${process.env.API_URL}/webhooks/mercadopago`
        };

        const response = await mercadopago.preferences.create(preference);

        return {
            success: true,
            preferenceId: response.body.id,
            init_point: response.body.init_point
        };
    } catch (error) {
        console.error('Mercado Pago preference error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * MERCADO PAGO - Criar assinatura
 */
async function createMercadoPagoSubscription(userId, email) {
    try {
        // Nota: A API de assinaturas do Mercado Pago requer configuração prévia de planos
        // Este é um exemplo simplificado

        const subscription = {
            reason: 'E.I.O Professional - Assinatura Mensal',
            auto_recurring: {
                frequency: 1,
                frequency_type: 'months',
                transaction_amount: 199.90,
                currency_id: 'BRL'
            },
            payer_email: email,
            back_url: `${process.env.FRONTEND_URL}/subscription/success`,
            external_reference: userId
        };

        const response = await mercadopago.preapproval.create(subscription);

        return {
            success: true,
            subscriptionId: response.body.id,
            init_point: response.body.init_point
        };
    } catch (error) {
        console.error('Mercado Pago subscription error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    // Stripe
    createStripeCheckoutSession,
    createStripeSubscription,
    cancelStripeSubscription,

    // Mercado Pago
    createMercadoPagoPreference,
    createMercadoPagoSubscription
};
