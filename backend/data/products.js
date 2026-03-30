const { resolveCatalogLocation } = require("../utils/india");

const PRICE_BANDS = [400, 410, 420, 430, 440, 450, 460, 470, 480, 490, 500];
const DISCOUNT_BANDS = [0, 10, 12, 15, 18];

function buildOptimizedImage(rawUrl, variant) {
  try {
    const imageUrl = new URL(rawUrl);
    imageUrl.searchParams.set("auto", "format");
    imageUrl.searchParams.set("fm", "webp");
    imageUrl.searchParams.set("fit", "crop");
    imageUrl.searchParams.set("w", variant === 0 ? "900" : "780");
    imageUrl.searchParams.set("h", "1080");
    imageUrl.searchParams.set("q", "82");
    imageUrl.searchParams.set("crop", variant === 0 ? "faces" : variant === 1 ? "entropy" : "center");
    return imageUrl.toString();
  } catch {
    return rawUrl;
  }
}

function buildImageGallery(rawUrl) {
  return [0, 1, 2].map((variant) => buildOptimizedImage(rawUrl, variant));
}

function normalizeCatalogPrice(seedPrice, index) {
  const bandIndex = Math.abs(Math.round(seedPrice / 10) + index * 7) % PRICE_BANDS.length;
  return PRICE_BANDS[bandIndex];
}

function normalizeStock(seedStock, index) {
  return (index + 1) % 9 === 0 ? 0 : Math.max(4, Math.min(24, seedStock));
}

function resolveDiscountPercentage(seedPrice, reviewsCount, index) {
  const bandIndex = Math.abs(Math.round(seedPrice / 10) + reviewsCount + index) % DISCOUNT_BANDS.length;
  const nextDiscount = DISCOUNT_BANDS[bandIndex];
  return nextDiscount > 0 ? nextDiscount : undefined;
}

function buildBadges(index, rating, reviewsCount, stock) {
  if (stock <= 0) {
    return ["Out of Stock"];
  }

  const badges = [];

  if ((index + 1) % 4 === 0) {
    badges.push("New");
  }

  if (rating >= 4.8 || reviewsCount >= 100) {
    badges.push("Trending");
  }

  return badges;
}

function createProducts(gender, type, items) {
  return items.map((item, index) => {
    const price = normalizeCatalogPrice(item.price, index);
    const stock = normalizeStock(item.stock, index);
    const discountPercentage = resolveDiscountPercentage(item.price, item.reviewsCount, index);
    const images = buildImageGallery(item.image);
    const badges = buildBadges(index, item.rating, item.reviewsCount, stock);

    return {
      ...item,
      id: `${gender}-${type}-${index + 1}`,
      gender,
      type,
      price,
      stock,
      location: resolveCatalogLocation(item.location, index),
      image: images[0],
      images,
      originalPrice: discountPercentage ? Math.round((price / (1 - discountPercentage / 100)) / 10) * 10 : undefined,
      discountPercentage,
      badges,
    };
  });
}

const menClothingSeed = [
  {
    name: "Mercer Linen Shirt",
    category: "Shirts",
    description: "Breathable linen shirt with a crisp resort collar for warm weather dressing.",
    price: 2490,
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=80",
    rating: 4.8,
    location: "India",
    stock: 18,
    reviewsCount: 124,
  },
  {
    name: "District Crew T-Shirt",
    category: "T-Shirts",
    description: "Premium heavyweight tee with a modern fit and soft everyday comfort.",
    price: 1690,
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80",
    rating: 4.7,
    location: "India",
    stock: 26,
    reviewsCount: 89,
  },
  {
    name: "Selvedge Straight Jeans",
    category: "Jeans",
    description: "Dark-rinse denim with a structured straight silhouette and comfort stretch.",
    price: 3290,
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=900&q=80",
    rating: 4.6,
    location: "India",
    stock: 14,
    reviewsCount: 63,
  },
  {
    name: "Regent Tailored Suit",
    category: "Formal Suits",
    description: "Sharp two-piece suit with precise tailoring for formal office and event wear.",
    price: 8490,
    image: "https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?auto=format&fit=crop&w=900&q=80",
    rating: 4.9,
    location: "India",
    stock: 9,
    reviewsCount: 47,
  },
  {
    name: "Harbor Oxford Shirt",
    category: "Shirts",
    description: "Smart oxford shirt that moves easily from desk hours to evening plans.",
    price: 2890,
    image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80",
    rating: 4.7,
    location: "NRI",
    stock: 20,
    reviewsCount: 74,
  },
  {
    name: "Atlas Knit Tee",
    category: "T-Shirts",
    description: "Clean knit tee with a dense premium feel and a polished layered look.",
    price: 1890,
    image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80",
    rating: 4.8,
    location: "NRI",
    stock: 21,
    reviewsCount: 112,
  },
  {
    name: "Foundry Washed Denim",
    category: "Jeans",
    description: "Washed black jeans with a relaxed taper and clean street-ready finish.",
    price: 3490,
    image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=900&q=80",
    rating: 4.7,
    location: "NRI",
    stock: 15,
    reviewsCount: 67,
  },
  {
    name: "Boardroom Peak Suit",
    category: "Formal Suits",
    description: "Refined formal suit with a luxe texture and strong event-night presence.",
    price: 9290,
    image: "https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=900&q=80",
    rating: 4.9,
    location: "Dhaka",
    stock: 8,
    reviewsCount: 39,
  },
  {
    name: "Riviera Camp Shirt",
    category: "Shirts",
    description: "Relaxed camp shirt with breezy fabric and elevated summer styling.",
    price: 2590,
    image: "https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=900&q=80",
    rating: 4.6,
    location: "Dhaka",
    stock: 19,
    reviewsCount: 58,
  },
  {
    name: "Metro Everyday Tee",
    category: "T-Shirts",
    description: "Minimal everyday tee with a smooth hand feel and easy layering profile.",
    price: 1590,
    image: "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=900&q=80",
    rating: 4.5,
    location: "Dhaka",
    stock: 24,
    reviewsCount: 84,
  },
];

const womenClothingSeed = [
  {
    name: "Solstice Midi Dress",
    category: "Dresses",
    description: "Flowing midi dress with a flattering waist and graceful movement.",
    price: 3890,
    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80",
    rating: 4.8,
    location: "India",
    stock: 22,
    reviewsCount: 156,
  },
  {
    name: "Atelier Satin Top",
    category: "Tops",
    description: "Elegant satin top designed for a polished desk-to-dinner transition.",
    price: 2190,
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
    rating: 4.7,
    location: "India",
    stock: 19,
    reviewsCount: 94,
  },
  {
    name: "Moonline Pleated Skirt",
    category: "Skirts",
    description: "Soft pleated skirt with fluid movement and a subtle evening sheen.",
    price: 2790,
    image: "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?auto=format&fit=crop&w=900&q=80",
    rating: 4.6,
    location: "India",
    stock: 17,
    reviewsCount: 78,
  },
  {
    name: "Noor Embroidered Set",
    category: "Ethnic Wear",
    description: "Festive embroidered set with rich detailing for celebrations and weddings.",
    price: 6490,
    image: "https://images.unsplash.com/photo-1618244972963-dbad68f25f5d?auto=format&fit=crop&w=900&q=80",
    rating: 4.9,
    location: "India",
    stock: 11,
    reviewsCount: 52,
  },
  {
    name: "Eden Wrap Dress",
    category: "Dresses",
    description: "Wrap-front dress with a fluid drape made for brunches and soft evenings.",
    price: 4290,
    image: "https://images.unsplash.com/photo-1495385794356-15371f348c31?auto=format&fit=crop&w=900&q=80",
    rating: 4.8,
    location: "NRI",
    stock: 16,
    reviewsCount: 101,
  },
  {
    name: "Verve Peplum Top",
    category: "Tops",
    description: "Structured peplum top with refined tailoring and a premium silhouette.",
    price: 2390,
    image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=80",
    rating: 4.7,
    location: "NRI",
    stock: 18,
    reviewsCount: 83,
  },
  {
    name: "Willow Satin Skirt",
    category: "Skirts",
    description: "Satin slip skirt with a luminous finish and all-day comfort movement.",
    price: 2990,
    image: "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
    rating: 4.8,
    location: "NRI",
    stock: 20,
    reviewsCount: 68,
  },
  {
    name: "Zaria Festive Anarkali",
    category: "Ethnic Wear",
    description: "Statement anarkali set with rich texture and occasion-ready elegance.",
    price: 7090,
    image: "https://images.unsplash.com/photo-1583391733956-6c77a9a84a1f?auto=format&fit=crop&w=900&q=80",
    rating: 4.9,
    location: "Dhaka",
    stock: 9,
    reviewsCount: 44,
  },
  {
    name: "Mira Day Dress",
    category: "Dresses",
    description: "Lightweight day dress with a soft print and easy weekend appeal.",
    price: 3690,
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80",
    rating: 4.6,
    location: "Dhaka",
    stock: 21,
    reviewsCount: 76,
  },
  {
    name: "Halo Studio Top",
    category: "Tops",
    description: "Minimal top with a sleek neckline and clean premium finishing.",
    price: 2090,
    image: "https://images.unsplash.com/photo-1551163943-3f6a855d1153?auto=format&fit=crop&w=900&q=80",
    rating: 4.5,
    location: "Dhaka",
    stock: 23,
    reviewsCount: 57,
  },
];

const menShoesSeed = [
  {
    name: "Aero Street Sneakers",
    category: "Sneakers",
    description: "Low-profile sneakers with clean lines and cushioned everyday support.",
    price: 4590,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    rating: 4.8,
    location: "India",
    stock: 21,
    reviewsCount: 132,
  },
  {
    name: "Monarch Formal Oxfords",
    category: "Formal Shoes",
    description: "Refined leather oxfords with elegant stitching and a polished finish.",
    price: 6990,
    image: "https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=900&q=80",
    rating: 4.7,
    location: "India",
    stock: 12,
    reviewsCount: 76,
  },
  {
    name: "Pulse Run Trainers",
    category: "Running Shoes",
    description: "Responsive running shoes with breathable knit panels and rebound cushioning.",
    price: 5490,
    image: "https://images.unsplash.com/photo-1543508282-6319a3e2621f?auto=format&fit=crop&w=900&q=80",
    rating: 4.9,
    location: "India",
    stock: 16,
    reviewsCount: 108,
  },
  {
    name: "Ridge Leather Boots",
    category: "Boots",
    description: "Structured boots with rugged grip and premium leather texture.",
    price: 7890,
    image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80",
    rating: 4.6,
    location: "India",
    stock: 10,
    reviewsCount: 64,
  },
  {
    name: "Summit Mesh Sneakers",
    category: "Sneakers",
    description: "Breathable mesh sneakers with a sporty silhouette for active days.",
    price: 4890,
    image: "https://images.unsplash.com/photo-1600181516264-3ea807ff44b9?auto=format&fit=crop&w=900&q=80",
    rating: 4.8,
    location: "NRI",
    stock: 22,
    reviewsCount: 91,
  },
  {
    name: "Boardroom Penny Loafers",
    category: "Formal Shoes",
    description: "Hand-finished loafers with cushioned support for all-day formal wear.",
    price: 6590,
    image: "https://images.unsplash.com/photo-1614252369475-531eba835eb1?auto=format&fit=crop&w=900&q=80",
    rating: 4.7,
    location: "NRI",
    stock: 13,
    reviewsCount: 72,
  },
  {
    name: "Endurance Run Pro",
    category: "Running Shoes",
    description: "Lightweight runners built for speed sessions and high-mileage comfort.",
    price: 5890,
    image: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=900&q=80",
    rating: 4.8,
    location: "NRI",
    stock: 17,
    reviewsCount: 88,
  },
  {
    name: "Canyon Trail Boots",
    category: "Boots",
    description: "Trail-ready boots with durable grip and strong ankle support.",
    price: 8090,
    image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80",
    rating: 4.7,
    location: "Dhaka",
    stock: 11,
    reviewsCount: 51,
  },
  {
    name: "Metro Court Sneakers",
    category: "Sneakers",
    description: "Clean court sneakers with sleek panels and easy city styling.",
    price: 4390,
    image: "https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?auto=format&fit=crop&w=900&q=80",
    rating: 4.6,
    location: "Dhaka",
    stock: 20,
    reviewsCount: 61,
  },
  {
    name: "Regent Monk Straps",
    category: "Formal Shoes",
    description: "Modern monk straps with a sharp silhouette and premium formal finish.",
    price: 7190,
    image: "https://images.unsplash.com/photo-1614252235316-8c857d38b5f4?auto=format&fit=crop&w=900&q=80",
    rating: 4.8,
    location: "Dhaka",
    stock: 12,
    reviewsCount: 55,
  },
];

const womenShoesSeed = [
  {
    name: "Nova Sculpt Heels",
    category: "Heels",
    description: "Statement heels with elegant lift and comfortable event-ready lining.",
    price: 5290,
    image: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=80",
    rating: 4.8,
    location: "India",
    stock: 15,
    reviewsCount: 141,
  },
  {
    name: "Softstep Ballet Flats",
    category: "Flats",
    description: "Flexible flats with a padded footbed for easy all-day movement.",
    price: 2890,
    image: "https://images.unsplash.com/photo-1514996937319-344454492b37?auto=format&fit=crop&w=900&q=80",
    rating: 4.6,
    location: "India",
    stock: 24,
    reviewsCount: 86,
  },
  {
    name: "Orbit Knit Sneakers",
    category: "Sneakers",
    description: "Breathable knit sneakers with modern cushioning and a clean profile.",
    price: 4690,
    image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=900&q=80",
    rating: 4.7,
    location: "India",
    stock: 18,
    reviewsCount: 97,
  },
  {
    name: "Coastline Strap Sandals",
    category: "Sandals",
    description: "Airy strap sandals designed for warm-weather styling and light comfort.",
    price: 3190,
    image: "https://images.unsplash.com/photo-1562273138-f46be4ebdf33?auto=format&fit=crop&w=900&q=80",
    rating: 4.5,
    location: "India",
    stock: 20,
    reviewsCount: 58,
  },
  {
    name: "Lustre Block Heels",
    category: "Heels",
    description: "Block heels with balanced comfort and polished occasion appeal.",
    price: 5590,
    image: "https://images.unsplash.com/photo-1543163521-7a8b3f52d556?auto=format&fit=crop&w=900&q=80",
    rating: 4.8,
    location: "NRI",
    stock: 12,
    reviewsCount: 88,
  },
  {
    name: "Marina Everyday Flats",
    category: "Flats",
    description: "Lightweight flats with a cushioned sole and refined city-ready shape.",
    price: 2990,
    image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80",
    rating: 4.7,
    location: "NRI",
    stock: 19,
    reviewsCount: 71,
  },
  {
    name: "Glide Motion Sneakers",
    category: "Sneakers",
    description: "Easy-lift sneakers with flexible cushioning for everyday movement.",
    price: 4890,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    rating: 4.7,
    location: "NRI",
    stock: 16,
    reviewsCount: 79,
  },
  {
    name: "Zahra Occasion Heels",
    category: "Heels",
    description: "Dressy heels with a slim profile and shine for late-night events.",
    price: 5790,
    image: "https://images.unsplash.com/photo-1543163521-0d5cfb977c4b?auto=format&fit=crop&w=900&q=80",
    rating: 4.8,
    location: "Dhaka",
    stock: 11,
    reviewsCount: 63,
  },
  {
    name: "Willow Cross Sandals",
    category: "Sandals",
    description: "Cross-strap sandals with a soft sole and elevated warm-season finish.",
    price: 3390,
    image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=900&q=80",
    rating: 4.6,
    location: "Dhaka",
    stock: 18,
    reviewsCount: 53,
  },
  {
    name: "City Muse Flats",
    category: "Flats",
    description: "City flats with an elegant profile and easy day-to-night comfort.",
    price: 3090,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80",
    rating: 4.6,
    location: "Dhaka",
    stock: 17,
    reviewsCount: 49,
  },
];

const products = [
  ...createProducts("men", "clothing", menClothingSeed),
  ...createProducts("women", "clothing", womenClothingSeed),
  ...createProducts("men", "shoes", menShoesSeed),
  ...createProducts("women", "shoes", womenShoesSeed),
];

module.exports = { products };
