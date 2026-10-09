/* =====================================================================
   HUSSEIN’S SHAWARMA — SITE SETTINGS
   This is the only file you normally need to edit.
   - Menu items and prices ............ HS_CONFIG.menu
   - Featured items on the home page .. HS_CONFIG.featured
   - Phone, email, hours, social links  HS_CONFIG.business
   - Online ordering + BLOOM .......... HS_CONFIG.ordering
   Anything left as '' (empty) is hidden on the site.
   ===================================================================== */
window.HS_CONFIG = {

  business: {
    name: 'Hussein’s Shawarma',
    hoursText: '',        /* Shown in the footer, e.g. 'Mon–Sun 11am–10pm' */
    phone: '',            /* e.g. '(555) 123-4567' */
    email: '',            /* e.g. 'hello@husseinsshawarma.com' */
    instagram: '',        /* full link, e.g. 'https://instagram.com/yourname' */
    facebook: '',
    tiktok: '',
    menuPdfUrl: ''        /* optional link to a PDF menu */
  },

  images: {
    hero:   'images/hero.webp',
    beef:   'images/beef.webp',
    burger: 'images/burger.webp',
    wings:  'images/wings.webp',
    sides:  'images/sides.webp',
    roast:  'images/roast.webp'
  },
  alt: {
    hero:   'A shawarma wrap cut in half, showing sliced chicken, on a dark slate (illustrative photo)',
    beef:   'A beef shawarma wrap with thinly sliced seared beef on a wooden board (illustrative photo)',
    burger: 'A double cheeseburger with melted cheese on a toasted bun (illustrative photo)',
    wings:  'A bowl of crispy golden chicken wings (illustrative photo)',
    sides:  'French fries and onion rings in paper boxes (illustrative photo)',
    roast:  'A golden roasted whole chicken on a dark slate board (illustrative photo)'
  },

  /* Categories appear in this order. Item ids are used by the cart: keep them unique. */
  menu: [
    { id: 'shawarma', name: 'Shawarma', image: 'beef', items: [
      { id: 'chicken-shawarma', name: 'Chicken Shawarma', price: 7.99 },
      { id: 'beef-shawarma', name: 'Beef Shawarma', price: 7.99 }
    ]},
    { id: 'roast-chicken', name: 'Roast Chicken', image: 'roast', items: [
      { id: 'roast-quarter', name: 'Quarter', cartName: 'Roast Chicken, Quarter', price: 7.99, sides: 1,
        desc: 'Comes with pita bread, pickles, garlic sauce, and 1 side.' },
      { id: 'roast-half', name: 'Half', cartName: 'Roast Chicken, Half', price: 15.00, sides: 2,
        desc: 'Comes with pita bread, pickles, garlic sauce, and 2 sides.' },
      { id: 'roast-whole', name: 'Whole', cartName: 'Roast Chicken, Whole', price: 20.00, sides: 4,
        desc: 'Comes with pita bread, pickles, garlic sauce, and 4 sides.' }
    ]},
    { id: 'wings', name: 'Wings', image: 'wings', items: [
      { id: 'wings-6', name: '6 Pieces', cartName: 'Wings, 6 pieces', price: 7.99 },
      { id: 'wings-12', name: '12 Pieces', cartName: 'Wings, 12 pieces', price: 15.99 },
      { id: 'wings-24', name: '24 Pieces', cartName: 'Wings, 24 pieces', price: 31.99 }
    ]},
    { id: 'burgers', name: 'Burgers', image: 'burger', items: [
      { id: 'cheeseburger', name: 'Cheeseburger', price: 7.99 },
      { id: 'double-cheeseburger', name: 'Double Cheeseburger', price: 10.99 }
    ]},
    { id: 'appetizers', name: 'Appetizers', image: 'sides', items: [
      { id: 'fries', name: 'Box of French Fries', price: 6.49 },
      { id: 'onion-rings', name: 'Box of Onion Rings', price: 8.99 }
    ]},
    /* Sides: sold on their own AND offered as the choices for Roast Chicken plates.
       'group' sorts them into the short lists on the menu and in the side picker. */
    { id: 'sides', name: 'Sides', note: '$3.50 each',
      groups: ['Salads', 'Potatoes & Fries', 'Rice & More', 'Bread & Dips'], items: [
      { id: 'side-tabbouleh', name: 'Tabbouleh', group: 'Salads', price: 3.50 },
      { id: 'side-mediterranean-salad', name: 'Mediterranean Salad', group: 'Salads', price: 3.50 },
      { id: 'side-quinoa-salad', name: 'Quinoa Salad', group: 'Salads', price: 3.50 },
      { id: 'side-beet-salad', name: 'Beet Salad', group: 'Salads', price: 3.50 },
      { id: 'side-coleslaw', name: 'Coleslaw Salad', group: 'Salads', price: 3.50 },
      { id: 'side-potato-salad', name: 'Potato Salad', group: 'Salads', price: 3.50 },
      { id: 'side-mashed-potatoes', name: 'Mashed Potatoes', group: 'Potatoes & Fries', price: 3.50 },
      { id: 'side-spicy-potatoes', name: 'Spicy Potatoes', group: 'Potatoes & Fries', price: 3.50 },
      { id: 'side-french-fries', name: 'French Fries', group: 'Potatoes & Fries', price: 3.50 },
      { id: 'side-white-rice', name: 'White Rice', group: 'Rice & More', price: 3.50 },
      { id: 'side-brown-rice', name: 'Brown Rice', group: 'Rice & More', price: 3.50 },
      { id: 'side-mac-cheese', name: 'Mac & Cheese', group: 'Rice & More', price: 3.50 },
      { id: 'side-corn', name: 'Corn', group: 'Rice & More', price: 3.50 },
      { id: 'side-hummus', name: 'Hummus', group: 'Bread & Dips', price: 3.50 },
      { id: 'side-garlic-bread', name: 'Garlic Bread', group: 'Bread & Dips', price: 3.50 }
    ]}
  ],
  sideCategory: 'sides',

  /* Home page featured cards (by item id). Prices come from the menu above. */
  featured: [
    { id: 'chicken-shawarma', category: 'shawarma', image: 'hero' },
    { id: 'beef-shawarma', category: 'shawarma', image: 'beef' },
    { id: 'double-cheeseburger', category: 'burgers', image: 'burger' }
  ],

  ordering: {
    /* Keep false until BLOOM is connected. While false, the site shows a
       "preview" banner and orders are NOT sent or charged. */
    live: false,
    /* 'delivery' and/or 'pickup', in the order shown. */
    fulfillment: ['delivery', 'pickup'],
    /* Shown when a customer picks pickup. Leave '' to hide. */
    pickupAddress: '',
    /* Today's kitchen hours, 24-hour clock: { open: '11:00', close: '22:00' }.
       While null, scheduled orders offer the next 4 hours. */
    kitchenHours: null,
    /* Earliest a scheduled order can be, in minutes from now. */
    leadMinutes: 30,
    /* Leave null if BLOOM calculates them. */
    taxRate: null,        /* e.g. 0.08 for 8% */
    deliveryFee: null,    /* e.g. 2.99 */

    /* ---------------------------------------------------------------
       BLOOM CONNECTION — replace null with a function that sends the
       order to BLOOM and returns a Promise of:
         { orderNumber: 'A123', status: 'Received' }   (status optional)
       The order object it receives:
         { lines: [{ id, name, sides, qty, unitPrice, lineTotal }],
           subtotal, fulfillment, when, time,
           customer: { name, phone, email },
           address: { street, unit, city, zip, dropoff } | null,
           notes }
       Example:
         submitOrder: function (order) {
           return fetch('https://YOUR-BLOOM-ENDPOINT/orders', {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify(order)
           }).then(function (r) { if (!r.ok) throw new Error('Order failed'); return r.json(); });
         }
       --------------------------------------------------------------- */
    submitOrder: null
  }
};
