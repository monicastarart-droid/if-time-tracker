const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ifbmjahpaemywlzxngju.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { user_id, email } = JSON.parse(event.body);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', user_id)
      .single();

    let customerId = sub?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({ email });
      customerId = customer.id;
      await supabase
        .from('subscriptions')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user_id);
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: 'https://iftimetracker.com',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url })
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
