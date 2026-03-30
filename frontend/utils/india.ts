export const INDIAN_LOCATION_OPTIONS = [
  {
    city: 'Kolkata',
    state: 'West Bengal',
    lat: 22.5726,
    lng: 88.3639,
    deliveryLabel: '1-2 business days',
  },
  {
    city: 'Mumbai',
    state: 'Maharashtra',
    lat: 19.076,
    lng: 72.8777,
    deliveryLabel: '2-3 business days',
  },
  {
    city: 'Delhi',
    state: 'Delhi',
    lat: 28.6139,
    lng: 77.209,
    deliveryLabel: '2-3 business days',
  },
  {
    city: 'Bengaluru',
    state: 'Karnataka',
    lat: 12.9716,
    lng: 77.5946,
    deliveryLabel: '2-4 business days',
  },
  {
    city: 'Chennai',
    state: 'Tamil Nadu',
    lat: 13.0827,
    lng: 80.2707,
    deliveryLabel: '2-4 business days',
  },
  {
    city: 'Hyderabad',
    state: 'Telangana',
    lat: 17.385,
    lng: 78.4867,
    deliveryLabel: '2-4 business days',
  },
  {
    city: 'Pune',
    state: 'Maharashtra',
    lat: 18.5204,
    lng: 73.8567,
    deliveryLabel: '2-4 business days',
  },
  {
    city: 'Ahmedabad',
    state: 'Gujarat',
    lat: 23.0225,
    lng: 72.5714,
    deliveryLabel: '3-5 business days',
  },
  {
    city: 'Jaipur',
    state: 'Rajasthan',
    lat: 26.9124,
    lng: 75.7873,
    deliveryLabel: '3-5 business days',
  },
  {
    city: 'Lucknow',
    state: 'Uttar Pradesh',
    lat: 26.8467,
    lng: 80.9462,
    deliveryLabel: '3-5 business days',
  },
] as const;

export type IndianCatalogLocation = typeof INDIAN_LOCATION_OPTIONS[number]['city'];

export interface ShippingAddressInput {
  id?: string;
  name: string;
  phone: string;
  addressLine: string;
  city: IndianCatalogLocation | '';
  state: string;
  pincode: string;
  isDefault?: boolean;
}

export function getIndianLocationMeta(city: string) {
  const normalizedCity = city.trim().toLowerCase();
  return INDIAN_LOCATION_OPTIONS.find((entry) => entry.city.toLowerCase() === normalizedCity) ?? null;
}

export function isValidIndianPincode(value: string) {
  return /^[1-9]\d{5}$/.test(value.trim());
}

export function isValidIndianPhone(value: string) {
  const normalized = value.trim().replace(/[^\d+]/g, '');
  return /^(\+91|91)?[6-9]\d{9}$/.test(normalized);
}

export function validateIndianAddressInput(input: ShippingAddressInput) {
  if (!input.name.trim() || !input.phone.trim() || !input.addressLine.trim() || !input.city || !input.pincode.trim()) {
    return 'Name, phone, address, city, and pincode are required.';
  }

  const cityMeta = getIndianLocationMeta(input.city);
  if (!cityMeta) {
    return 'Only locations within India are allowed';
  }

  if (!isValidIndianPhone(input.phone)) {
    return 'Enter a valid Indian phone number.';
  }

  if (!isValidIndianPincode(input.pincode)) {
    return 'Enter a valid 6-digit Indian pincode.';
  }

  return null;
}
