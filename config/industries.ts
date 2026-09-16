/**
 * Industry landing pages.
 *
 * Drives /product-photography/[industry]. Lower volume than the marketplace
 * guides but much higher intent, and the competing pages are mostly thin
 * listicles — so a page that names the real problem wins.
 *
 * Each entry has to say something true and specific about photographing that
 * category. A page that could be about anything ranks for nothing.
 */

export interface Industry {
  slug: string;
  name: string;
  /** Who is searching. */
  audience: string;
  metaTitle: string;
  metaDescription: string;
  headline: string;
  intro: string;
  /** Why this category is genuinely hard to photograph. */
  challenges: { title: string; body: string }[];
  /** Scene ids from config/scenes.ts that suit this category. */
  recommendedScenes: string[];
  /** Concrete prompt starters a seller can use immediately. */
  promptExamples: string[];
  /** Typical cost of the traditional alternative. */
  traditionalCost: string;
  faqs: { q: string; a: string }[];
}

export const INDUSTRIES: Industry[] = [
  {
    slug: "jewelry",
    name: "Jewelry",
    audience: "Jewelry sellers and independent makers",
    metaTitle: "AI Product Photography for Jewelry",
    metaDescription:
      "Jewelry is where generic AI tools fail hardest — warped settings, invented stones. Composite your real piece into studio scenes instead, pixel-identical.",
    headline: "Jewelry photography, without losing the stone",
    intro:
      "Jewelry is the hardest category for generative tools and the most expensive to shoot conventionally. A model asked to “imagine” a ring invents facets, warps the setting and changes the metal tone — and buyers notice immediately, because they are studying that image far more closely than they would a t-shirt.",
    challenges: [
      {
        title: "Reflective surfaces reveal every flaw",
        body: "Polished metal mirrors its environment. Generative tools render plausible-looking reflections that don't correspond to the actual piece, which reads as fake to anyone paying attention.",
      },
      {
        title: "Stones are unforgiving",
        body: "Facet counts, cut geometry and colour are the product. An approximated stone isn't a stylistic liberty — it's a misdescribed item and a returns problem.",
      },
      {
        title: "Scale is invisible",
        body: "Without a reference, a pendant could be any size. Scale ambiguity drives a large share of jewelry returns.",
      },
      {
        title: "Shoots cost more per item",
        body: "Macro lenses, controlled lighting and light tents make jewelry among the most expensive categories to photograph well.",
      },
    ],
    recommendedScenes: ["marble", "studio-white", "linen", "studio-gradient"],
    promptExamples: [
      "a gold signet ring — Marble Surface",
      "a silver pendant necklace — Natural Linen",
      "a pair of pearl earrings — Studio Gradient",
    ],
    traditionalCost: "$50–200 per piece, or $800–3,000 for a collection shoot",
    faqs: [
      {
        q: "Can AI generate jewelry photos accurately?",
        a: "Not if it generates the jewelry itself — facets, settings and metal tone come out approximated, which misrepresents the item. The approach that works is generating only the surroundings and compositing your actual photograph of the piece on top, so the jewelry is your own pixels.",
      },
      {
        q: "How do I photograph jewelry for Etsy?",
        a: "Shoot the piece once on a plain background under even light, then generate the scene variations. Etsy wants at least 2000px on the shortest side and crops thumbnails to landscape, so keep the first image wide and uncluttered.",
      },
      {
        q: "What background works best for jewelry?",
        a: "Marble and linen both read as premium without competing with the piece. Pure white is required for an Amazon main image. Keep the surroundings quiet — the item is small in frame and loses to a busy backdrop.",
      },
    ],
  },

  {
    slug: "skincare",
    name: "Skincare & Beauty",
    audience: "Skincare and cosmetics brands",
    metaTitle: "AI Product Photography for Skincare Brands",
    metaDescription:
      "Skincare packaging carries your brand. Generate spa, bathroom and marble scenes around your real bottle — label intact, never redrawn.",
    headline: "Skincare scenes that keep your label readable",
    intro:
      "In skincare the packaging is the brand. A generated bottle comes back with smeared typography and an invented logo — unusable, and legally risky if the label carries claims or ingredients.",
    challenges: [
      {
        title: "Labels must stay legible",
        body: "Generative models reliably mangle small text. Ingredient lists and claims are regulated copy; they cannot be approximated.",
      },
      {
        title: "Translucent containers are difficult",
        body: "Frosted glass, amber bottles and droppers interact with light in ways that are hard to fake convincingly.",
      },
      {
        title: "Seasonal refreshes multiply cost",
        body: "Brands reshoot for each campaign. Four shoots a year for a 20-SKU range gets expensive fast.",
      },
    ],
    recommendedScenes: ["bathroom-shelf", "marble", "linen", "studio-white"],
    promptExamples: [
      "an amber glass serum bottle — Bathroom Shelf",
      "a ceramic moisturiser jar — Marble Surface",
      "a cleanser tube — Natural Linen",
    ],
    traditionalCost: "$300–1,500 per campaign shoot",
    faqs: [
      {
        q: "Will AI ruin my product label?",
        a: "It will if the tool generates the product. Compositing avoids the problem entirely: your bottle is cut from your own photo and placed into the generated scene, so the label is exactly the pixels you shot.",
      },
      {
        q: "What backgrounds suit skincare?",
        a: "Spa bathroom shelves, marble and natural linen are the conventions the category has settled on, because they signal calm and cleanliness. Amazon still requires pure white for the main image.",
      },
    ],
  },

  {
    slug: "furniture",
    name: "Furniture & Homeware",
    audience: "Furniture and home goods retailers",
    metaTitle: "AI Product Photography for Furniture",
    metaDescription:
      "Furniture shoots need a rented room. Place your actual piece into styled interiors instead — real wood grain and upholstery, generated surroundings.",
    headline: "Room scenes without renting the room",
    intro:
      "Furniture is the category where conventional photography is most punishing: the item is large, hard to move, and the shot needs an entire styled interior around it.",
    challenges: [
      {
        title: "Logistics dominate the cost",
        body: "Photographing a sofa means transporting a sofa. Studio hire, styling and a crew make this the priciest category per image.",
      },
      {
        title: "Materials must stay true",
        body: "Wood grain, weave and upholstery texture are what the buyer is evaluating. Generated approximations misrepresent the product.",
      },
      {
        title: "Buyers need to see it in context",
        body: "A piece floating on white doesn't convey scale or style fit, and room sets are exactly what's expensive to build.",
      },
    ],
    recommendedScenes: ["desk-workspace", "kitchen-counter", "concrete", "studio-gradient"],
    promptExamples: [
      "a walnut side table — Desk Workspace",
      "a linen armchair — Concrete & Shadow",
      "an oak shelf unit — Kitchen Counter",
    ],
    traditionalCost: "$1,000–5,000 per room set",
    faqs: [
      {
        q: "Can I put my furniture into a generated room?",
        a: "Yes. The piece is segmented from one photograph and composited into a generated interior, so the grain, weave and finish are your own — only the room is generated.",
      },
      {
        q: "How do I show scale in furniture photos?",
        a: "Generated room scenes give scale reference through familiar objects. Publish dimensions alongside, since no image fully removes the ambiguity.",
      },
    ],
  },

  {
    slug: "apparel",
    name: "Apparel & Accessories",
    audience: "Clothing and accessory brands",
    metaTitle: "AI Product Photography for Apparel",
    metaDescription:
      "Generate seasonal and lifestyle backdrops around your actual garment — real fabric, real print placement, no reshoot per campaign.",
    headline: "Seasonal apparel campaigns from one shoot",
    intro:
      "Apparel lives on frequent campaign refreshes: new season, new backdrop, new mood. The garment doesn't change — the world around it does, and that is precisely the part that can be generated.",
    challenges: [
      {
        title: "Print and pattern must survive",
        body: "Graphics, stripes and logos distort badly when generated. Print placement is a product attribute, not a detail.",
      },
      {
        title: "Fabric behaviour is hard to fake",
        body: "Drape, sheen and knit structure tell buyers what they're getting, and they are exactly what generative models smooth away.",
      },
      {
        title: "Campaign cadence is relentless",
        body: "Four seasonal shoots a year across a range compounds quickly.",
      },
    ],
    recommendedScenes: ["concrete", "studio-gradient", "outdoor-nature", "beach-summer"],
    promptExamples: [
      "a folded cotton t-shirt — Concrete & Shadow",
      "a canvas tote bag — Beach & Summer",
      "a wool scarf — Autumn Warmth",
    ],
    traditionalCost: "$500–3,000 per seasonal shoot",
    faqs: [
      {
        q: "Does this work for clothing on models?",
        a: "It works best for flat-lay, hanging and mannequin shots, where the garment is a clean, separable subject. On-model photography involves a person, and generating or altering people raises consent and likeness issues we deliberately avoid.",
      },
    ],
  },

  {
    slug: "food-beverage",
    name: "Food & Beverage",
    audience: "Food, drink and packaged goods brands",
    metaTitle: "AI Product Photography for Food & Beverage",
    metaDescription:
      "Kitchen, café and seasonal scenes around your real packaging — label intact, no food stylist, no studio day.",
    headline: "Kitchen scenes without the kitchen",
    intro:
      "Packaged food and drink sells on context: the jar on a counter, the bottle on a table. That context is a styled set and a stylist — for packaging that never changes between shots.",
    challenges: [
      {
        title: "Packaging text is regulated",
        body: "Nutrition panels, allergen warnings and claims are legally controlled copy. They cannot be approximated.",
      },
      {
        title: "Set styling is a specialist skill",
        body: "Food sets need props, surfaces and a stylist who knows the category.",
      },
      {
        title: "Seasonal turnover is constant",
        body: "Summer, festive and back-to-school each want their own look, several times a year.",
      },
    ],
    recommendedScenes: ["kitchen-counter", "linen", "festive-winter", "autumn-warm"],
    promptExamples: [
      "a jar of honey — Kitchen Counter",
      "a coffee bag — Natural Linen",
      "a bottle of olive oil — Autumn Warmth",
    ],
    traditionalCost: "$800–3,000 per styled shoot",
    faqs: [
      {
        q: "Can I generate images of the food itself?",
        a: "You can generate a scene, but we would not recommend generating the food you're selling — an invented product misrepresents what arrives. For packaged goods, compositing the real pack into a generated setting keeps the claim honest.",
      },
    ],
  },

  {
    slug: "candles",
    name: "Candles & Home Fragrance",
    audience: "Candle makers and home fragrance brands",
    metaTitle: "AI Product Photography for Candles",
    metaDescription:
      "Warm, seasonal candle scenes around your actual vessel and label — the category where atmosphere sells and reshoots multiply.",
    headline: "Atmosphere is the product",
    intro:
      "Candles sell on mood, and mood is entirely a function of the scene. The vessel itself barely changes — which makes this a category where generating the surroundings covers almost the whole job.",
    challenges: [
      {
        title: "Warm light is the whole look",
        body: "Candlelight, bokeh and glow are what the buyer is responding to, and they are hard to stage repeatedly.",
      },
      {
        title: "Glass and wax are fiddly",
        body: "Translucency and reflection make vessels difficult to render convincingly from scratch.",
      },
      {
        title: "Q4 is everything",
        body: "Gifting season demands festive imagery on a deadline, across the whole range.",
      },
    ],
    recommendedScenes: ["festive-winter", "linen", "marble", "autumn-warm"],
    promptExamples: [
      "an amber glass candle — Festive Winter",
      "a ceramic candle vessel — Natural Linen",
      "a reed diffuser — Marble Surface",
    ],
    traditionalCost: "$300–1,200 per seasonal shoot",
    faqs: [
      {
        q: "How do I get festive candle photos without a Christmas set?",
        a: "Generate the seasonal scene around your real vessel. The Festive Winter preset produces warm bokeh and pine detail while the candle itself stays exactly as photographed.",
      },
    ],
  },

  {
    slug: "electronics",
    name: "Electronics & Tech",
    audience: "Consumer electronics and accessory sellers",
    metaTitle: "AI Product Photography for Electronics",
    metaDescription:
      "Clean desk and studio scenes around your real device — ports, branding and finish unaltered, because spec accuracy matters here.",
    headline: "Devices where the details are the spec",
    intro:
      "Electronics buyers scrutinise port layout, button placement and finish, because those details are the specification. A generated device with the wrong number of ports is a returns problem.",
    challenges: [
      {
        title: "Ports and buttons are specifications",
        body: "Generative models add, remove and relocate them. On a product page, that is a misdescription.",
      },
      {
        title: "Brushed and glossy finishes are difficult",
        body: "Metal and glass reflections are exactly what models approximate badly.",
      },
      {
        title: "Accessory ranges are large",
        body: "Cases and cables run to hundreds of SKUs, which makes per-item photography impractical.",
      },
    ],
    recommendedScenes: ["desk-workspace", "concrete", "studio-gradient", "studio-white"],
    promptExamples: [
      "a pair of wireless earbuds — Desk Workspace",
      "a mechanical keyboard — Concrete & Shadow",
      "a phone case — Studio Gradient",
    ],
    traditionalCost: "$200–1,000 per shoot",
    faqs: [
      {
        q: "Will AI change my product's ports or buttons?",
        a: "Not with this approach. The device is cut from your own photograph and composited into the scene, so every port and button is exactly where you shot it. We verify afterwards that none of those pixels changed.",
      },
    ],
  },

  {
    slug: "home-goods",
    name: "Home Goods",
    audience: "Homeware and kitchenware sellers",
    metaTitle: "AI Product Photography for Home Goods",
    metaDescription:
      "Lifestyle scenes for ceramics, textiles and kitchenware — your real product, styled interiors generated around it.",
    headline: "Lifestyle context for everyday objects",
    intro:
      "Home goods convert on context. A mug on white is a mug; a mug on a morning kitchen counter is a life. The difference is a styled set — which is the expensive part and the generatable part.",
    challenges: [
      {
        title: "Plain white undersells",
        body: "Everyday objects need context to feel desirable, but context means props and a set.",
      },
      {
        title: "Wide ranges, low margins",
        body: "Homeware catalogues are broad and margins are thin, so per-item photography rarely pays back.",
      },
      {
        title: "Glaze and texture matter",
        body: "Ceramic glaze and textile weave are what distinguishes a premium item from a cheap one.",
      },
    ],
    recommendedScenes: ["kitchen-counter", "linen", "marble", "studio-gradient"],
    promptExamples: [
      "a stoneware mug — Kitchen Counter",
      "a linen tea towel — Natural Linen",
      "a ceramic vase — Marble Surface",
    ],
    traditionalCost: "$400–2,000 per shoot",
    faqs: [
      {
        q: "What's the fastest way to photograph a large homeware catalogue?",
        a: "Shoot each item once on a plain background, then run a batch: paste your product list as a spreadsheet, pick a scene, and generate every SKU in one run. Each row is billed and refunded independently.",
      },
    ],
  },
];

export function getIndustry(slug: string): Industry | undefined {
  return INDUSTRIES.find((industry) => industry.slug === slug);
}

export const INDUSTRY_SLUGS = INDUSTRIES.map((industry) => industry.slug);
