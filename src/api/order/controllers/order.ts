"use strict";

import { factories } from '@strapi/strapi';
// @ts-ignore
const stripe = require('stripe')(process.env.STRIPE_KEY);

export default factories.createCoreController('api::order.order', ({ strapi }) => ({
  async create(ctx: any) {
    const { products } = ctx.request.body;

    try {
      const lineItems = await Promise.all(
        products.map(async (product: any) => {
          
          // CAMBIO CLAVE: Usamos findMany con un filtro para buscar el ID numérico
          const results = await strapi
            .service('api::product.product')
            .find({
              filters: { id: product.id }
            });

          const item = results.results[0]; // Obtenemos el primer resultado

          if (!item) {
            throw new Error(`Producto con ID ${product.id} no encontrado en la base de datos`);
          }

          return {
            price_data: {
              currency: 'PEN',
              product_data: {
                name: item.productName,
              },
              unit_amount: Math.round(item.price * 100),
            },
            quantity: product.quantity || 1,
          };
        })
      );

      const session = await stripe.checkout.sessions.create({
        shipping_address_collection: { allowed_countries: ['PE'] },
        payment_method_types: ['card'],
        mode: 'payment',
        success_url: process.env.CLIENT_URL + '/success',
        cancel_url: process.env.CLIENT_URL + '/successError',
        line_items: lineItems,
      });

      // Guardar la orden
      await strapi
        .service('api::order.order')
        .create({
          data: {
            products,
            stripeId: session.id,
          },
        });

      return { stripeSession: session };
      
    } catch (error: any) {
      ctx.response.status = 500;
      return { error: error.message };
    }
  },
}));