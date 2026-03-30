const bcrypt = require("bcryptjs");

const DeliveryAgent = require("../models/DeliveryAgent");
const User = require("../models/User");
const { getLocationByCity } = require("./india");

const DELIVERY_AGENT_SEED = [
  {
    name: "Aarav Sen",
    email: "kolkata-rider@lumina.dev",
    phone: "+919830001111",
    city: "Kolkata",
    serviceCities: ["Kolkata", "Lucknow"],
  },
  {
    name: "Riya Mehta",
    email: "mumbai-rider@lumina.dev",
    phone: "+919820002222",
    city: "Mumbai",
    serviceCities: ["Mumbai", "Pune", "Ahmedabad"],
  },
  {
    name: "Vihaan Rao",
    email: "south-rider@lumina.dev",
    phone: "+919880003333",
    city: "Bengaluru",
    serviceCities: ["Bengaluru", "Chennai", "Hyderabad"],
  },
  {
    name: "Ishita Kapoor",
    email: "north-rider@lumina.dev",
    phone: "+919910004444",
    city: "Delhi",
    serviceCities: ["Delhi", "Jaipur"],
  },
];

async function ensureDeliveryAgent(seed) {
  const existingUser = await User.findOne({ email: seed.email });
  let user = existingUser;

  if (!user) {
    const passwordHash = await bcrypt.hash(process.env.DELIVERY_AGENT_PASSWORD || "Deliver@12345", 12);
    user = await User.create({
      name: seed.name,
      email: seed.email,
      passwordHash,
      role: "delivery_agent",
    });
  }

  const location = getLocationByCity(seed.city);
  if (!location) {
    return;
  }

  await DeliveryAgent.findOneAndUpdate(
    { userId: user._id },
    {
      userId: user._id,
      name: seed.name,
      email: seed.email,
      phone: seed.phone,
      availability: "available",
      serviceCities: seed.serviceCities,
      currentLocation: {
        city: location.city,
        state: location.state,
        lat: location.lat,
        lng: location.lng,
        updatedAt: new Date(),
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );
}

async function seedDeliveryAgents() {
  await Promise.all(DELIVERY_AGENT_SEED.map((seed) => ensureDeliveryAgent(seed)));
}

module.exports = {
  seedDeliveryAgents,
};
