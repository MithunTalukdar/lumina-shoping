const SUPPORTED_INDIAN_LOCATIONS = [
  {
    city: "Kolkata",
    state: "West Bengal",
    lat: 22.5726,
    lng: 88.3639,
    deliveryDays: { min: 1, max: 2 },
    pincodePrefixes: ["700", "701"],
  },
  {
    city: "Mumbai",
    state: "Maharashtra",
    lat: 19.076,
    lng: 72.8777,
    deliveryDays: { min: 2, max: 3 },
    pincodePrefixes: ["400", "401"],
  },
  {
    city: "Delhi",
    state: "Delhi",
    lat: 28.6139,
    lng: 77.209,
    deliveryDays: { min: 2, max: 3 },
    pincodePrefixes: ["110"],
  },
  {
    city: "Bengaluru",
    state: "Karnataka",
    lat: 12.9716,
    lng: 77.5946,
    deliveryDays: { min: 2, max: 4 },
    pincodePrefixes: ["560"],
  },
  {
    city: "Chennai",
    state: "Tamil Nadu",
    lat: 13.0827,
    lng: 80.2707,
    deliveryDays: { min: 2, max: 4 },
    pincodePrefixes: ["600"],
  },
  {
    city: "Hyderabad",
    state: "Telangana",
    lat: 17.385,
    lng: 78.4867,
    deliveryDays: { min: 2, max: 4 },
    pincodePrefixes: ["500"],
  },
  {
    city: "Pune",
    state: "Maharashtra",
    lat: 18.5204,
    lng: 73.8567,
    deliveryDays: { min: 2, max: 4 },
    pincodePrefixes: ["411", "412"],
  },
  {
    city: "Ahmedabad",
    state: "Gujarat",
    lat: 23.0225,
    lng: 72.5714,
    deliveryDays: { min: 3, max: 5 },
    pincodePrefixes: ["380", "382"],
  },
  {
    city: "Jaipur",
    state: "Rajasthan",
    lat: 26.9124,
    lng: 75.7873,
    deliveryDays: { min: 3, max: 5 },
    pincodePrefixes: ["302", "303"],
  },
  {
    city: "Lucknow",
    state: "Uttar Pradesh",
    lat: 26.8467,
    lng: 80.9462,
    deliveryDays: { min: 3, max: 5 },
    pincodePrefixes: ["226", "227"],
  },
];

const LOCATION_ROTATION = {
  India: ["Kolkata", "Mumbai", "Delhi", "Bengaluru"],
  NRI: ["Hyderabad", "Pune", "Ahmedabad"],
  Dhaka: ["Chennai", "Jaipur", "Lucknow"],
};

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePhone(value) {
  return normalizeText(value).replace(/[^\d+]/g, "");
}

function isValidIndianPincode(value) {
  return /^[1-9]\d{5}$/.test(normalizeText(value));
}

function isValidIndianPhone(value) {
  return /^(\+91|91)?[6-9]\d{9}$/.test(normalizePhone(value));
}

function getLocationByCity(city) {
  const normalizedCity = normalizeText(city).toLowerCase();
  return SUPPORTED_INDIAN_LOCATIONS.find((entry) => entry.city.toLowerCase() === normalizedCity) || null;
}

function resolveCatalogLocation(seedLocation, index) {
  const normalizedSeed = normalizeText(seedLocation);
  const options = LOCATION_ROTATION[normalizedSeed] || LOCATION_ROTATION.India;
  return options[index % options.length];
}

function validateIndianAddress(input = {}) {
  const name = normalizeText(input.name);
  const phone = normalizePhone(input.phone);
  const addressLine = normalizeText(input.addressLine || input.address);
  const city = normalizeText(input.city);
  const pincode = normalizeText(input.pincode);
  const location = getLocationByCity(city);

  if (!name || !phone || !addressLine || !city || !pincode) {
    return {
      ok: false,
      message: "Name, phone, address, city, and pincode are required.",
    };
  }

  if (!location) {
    return {
      ok: false,
      message: "Only locations within India are allowed",
    };
  }

  if (!isValidIndianPhone(phone)) {
    return {
      ok: false,
      message: "Enter a valid Indian phone number.",
    };
  }

  if (!isValidIndianPincode(pincode)) {
    return {
      ok: false,
      message: "Enter a valid 6-digit Indian pincode.",
    };
  }

  const state = normalizeText(input.state || location.state);
  if (state.toLowerCase() !== location.state.toLowerCase()) {
    return {
      ok: false,
      message: "Only locations within India are allowed",
    };
  }

  return {
    ok: true,
    value: {
      name,
      phone,
      addressLine,
      city: location.city,
      state: location.state,
      pincode,
    },
  };
}

function buildDeliveryEstimate(city, referenceDate = new Date()) {
  const location = getLocationByCity(city) || getLocationByCity("Kolkata");
  const minDays = location.deliveryDays.min;
  const maxDays = location.deliveryDays.max;
  const etaStart = new Date(referenceDate);
  etaStart.setDate(etaStart.getDate() + minDays);
  const etaEnd = new Date(referenceDate);
  etaEnd.setDate(etaEnd.getDate() + maxDays);

  return {
    city: location.city,
    state: location.state,
    minDays,
    maxDays,
    label: `${minDays}-${maxDays} business days`,
    etaStart,
    etaEnd,
  };
}

function haversineDistanceKm(source, destination) {
  if (!source || !destination) {
    return Number.POSITIVE_INFINITY;
  }

  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latDelta = toRadians(destination.lat - source.lat);
  const lngDelta = toRadians(destination.lng - source.lng);
  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(toRadians(source.lat)) *
      Math.cos(toRadians(destination.lat)) *
      Math.sin(lngDelta / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

module.exports = {
  SUPPORTED_INDIAN_LOCATIONS,
  buildDeliveryEstimate,
  getLocationByCity,
  haversineDistanceKm,
  isValidIndianPhone,
  isValidIndianPincode,
  resolveCatalogLocation,
  validateIndianAddress,
};
