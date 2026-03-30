const express = require("express");

const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const { validateIndianAddress } = require("../utils/india");

const router = express.Router();

function serializeAddress(address) {
  return {
    id: address._id.toString(),
    name: address.name,
    phone: address.phone,
    addressLine: address.addressLine,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    isDefault: Boolean(address.isDefault),
  };
}

async function loadUser(userId) {
  return User.findById(userId);
}

function normalizeDefaultAddress(addresses, preferredId = null) {
  let hasDefault = false;

  addresses.forEach((address) => {
    const shouldBeDefault = preferredId
      ? address._id.toString() === preferredId
      : !hasDefault && Boolean(address.isDefault);

    address.isDefault = shouldBeDefault;
    if (shouldBeDefault) {
      hasDefault = true;
    }
  });

  if (!hasDefault && addresses.length > 0) {
    addresses[0].isDefault = true;
  }
}

router.get("/addresses", requireAuth, async (req, res) => {
  try {
    const user = await loadUser(req.authUser.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      addresses: (user.addresses || []).map(serializeAddress),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to load shipping addresses." });
  }
});

router.post("/addresses", requireAuth, async (req, res) => {
  try {
    const validation = validateIndianAddress(req.body || {});
    if (!validation.ok) {
      return res.status(400).json({ message: validation.message });
    }

    const user = await loadUser(req.authUser.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.addresses.push({
      ...validation.value,
      isDefault: Boolean(req.body?.isDefault) || user.addresses.length === 0,
    });

    normalizeDefaultAddress(user.addresses, req.body?.isDefault ? user.addresses[user.addresses.length - 1]._id.toString() : null);
    await user.save();

    return res.status(201).json({
      message: "Shipping address saved.",
      addresses: user.addresses.map(serializeAddress),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to save shipping address." });
  }
});

router.put("/addresses/:addressId", requireAuth, async (req, res) => {
  try {
    const validation = validateIndianAddress(req.body || {});
    if (!validation.ok) {
      return res.status(400).json({ message: validation.message });
    }

    const user = await loadUser(req.authUser.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      return res.status(404).json({ message: "Shipping address not found." });
    }

    address.name = validation.value.name;
    address.phone = validation.value.phone;
    address.addressLine = validation.value.addressLine;
    address.city = validation.value.city;
    address.state = validation.value.state;
    address.pincode = validation.value.pincode;
    address.isDefault = Boolean(req.body?.isDefault);

    normalizeDefaultAddress(user.addresses, address.isDefault ? address._id.toString() : null);
    await user.save();

    return res.json({
      message: "Shipping address updated.",
      addresses: user.addresses.map(serializeAddress),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to update shipping address." });
  }
});

router.delete("/addresses/:addressId", requireAuth, async (req, res) => {
  try {
    const user = await loadUser(req.authUser.id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const address = user.addresses.id(req.params.addressId);
    if (!address) {
      return res.status(404).json({ message: "Shipping address not found." });
    }

    const deletedId = address._id.toString();
    address.deleteOne();
    normalizeDefaultAddress(user.addresses.filter((entry) => entry._id.toString() !== deletedId));
    await user.save();

    return res.json({
      message: "Shipping address removed.",
      addresses: user.addresses.map(serializeAddress),
    });
  } catch (error) {
    return res.status(500).json({ message: "Unable to remove shipping address." });
  }
});

module.exports = router;
