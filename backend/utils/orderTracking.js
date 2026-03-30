const { buildDeliveryEstimate, getLocationByCity } = require("./india");

const ORDER_STATUS_FLOW = [
  "placed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
];

const ORDER_STATUS_META = {
  placed: {
    label: "Order Placed",
    description: "Your payment was confirmed and the order entered our fulfillment queue.",
  },
  packed: {
    label: "Packed",
    description: "Your items were quality-checked, packed, and prepared for dispatch.",
  },
  shipped: {
    label: "Shipped",
    description: "The shipment left our India hub and is moving through the delivery network.",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    description: "Your delivery partner is on the final route to your shipping address.",
  },
  delivered: {
    label: "Delivered",
    description: "The order was delivered successfully.",
  },
  cancelled: {
    label: "Cancelled",
    description: "The order was cancelled before delivery completed.",
  },
};

const DEMO_PROGRESS_MINUTES = {
  packed: 3,
  shipped: 8,
  out_for_delivery: 15,
  delivered: 24,
};

function getStatusMeta(status) {
  return ORDER_STATUS_META[status] || ORDER_STATUS_META.placed;
}

function createTrackingSteps(referenceDate = new Date()) {
  return ORDER_STATUS_FLOW.map((status, index) => ({
    status,
    label: getStatusMeta(status).label,
    description: getStatusMeta(status).description,
    completedAt: index === 0 ? referenceDate : null,
  }));
}

function createNotification(status, order) {
  const baseChannels = ["email", "sms", "push"];
  const meta = getStatusMeta(status);

  return {
    id: `${status}-${Date.now()}`,
    status,
    title: meta.label,
    message:
      status === "out_for_delivery" && order.deliveryAgent?.name
        ? `${order.deliveryAgent.name} is bringing your order to ${order.shippingAddress.city}.`
        : `${meta.label} update for order #${order.orderNumber}.`,
    channels: baseChannels,
    createdAt: new Date(),
  };
}

function appendNotification(order, status) {
  if (!Array.isArray(order.notifications)) {
    order.notifications = [];
  }

  const alreadyExists = order.notifications.some((entry) => entry.status === status);
  if (!alreadyExists) {
    order.notifications.push(createNotification(status, order));
  }
}

function ensureTrackingDefaults(order) {
  let changed = false;

  if (!Array.isArray(order.trackingSteps) || order.trackingSteps.length === 0) {
    order.trackingSteps = createTrackingSteps(order.createdAt || new Date());
    changed = true;
  }

  if (!order.orderNumber) {
    const datePart = new Date(order.createdAt || Date.now()).toISOString().slice(0, 10).replace(/-/g, "");
    const suffix = String(order._id || "").slice(-6).toUpperCase();
    order.orderNumber = `LMN-${datePart}-${suffix}`;
    changed = true;
  }

  if (!order.estimatedDelivery?.label && order.shippingAddress?.city) {
    order.estimatedDelivery = buildDeliveryEstimate(order.shippingAddress.city, order.createdAt || new Date());
    changed = true;
  }

  appendNotification(order, "placed");

  return changed;
}

function setOrderStatus(order, nextStatus, source = "system") {
  if (order.status === nextStatus) {
    return false;
  }

  order.status = nextStatus;
  order.trackingMode = source === "manual" ? "manual" : order.trackingMode || "system";

  if (!Array.isArray(order.trackingSteps) || order.trackingSteps.length === 0) {
    order.trackingSteps = createTrackingSteps(order.createdAt || new Date());
  }

  const now = new Date();
  let changed = false;

  order.trackingSteps = order.trackingSteps.map((step) => {
    const stepIndex = ORDER_STATUS_FLOW.indexOf(step.status);
    const nextIndex = ORDER_STATUS_FLOW.indexOf(nextStatus);
    const shouldBeCompleted = stepIndex !== -1 && nextIndex !== -1 && stepIndex <= nextIndex;

    if (shouldBeCompleted && !step.completedAt) {
      changed = true;
      return {
        ...step,
        label: step.label || getStatusMeta(step.status).label,
        description: step.description || getStatusMeta(step.status).description,
        completedAt: now,
      };
    }

    return {
      ...step,
      label: step.label || getStatusMeta(step.status).label,
      description: step.description || getStatusMeta(step.status).description,
    };
  });

  appendNotification(order, nextStatus);
  return changed || true;
}

function interpolatePoint(source, destination, progress) {
  return {
    lat: source.lat + (destination.lat - source.lat) * progress,
    lng: source.lng + (destination.lng - source.lng) * progress,
  };
}

function setLatestAgentLocation(order, nextLocation) {
  const current = order.latestAgentLocation;
  const hasChanged =
    !current ||
    current.lat !== nextLocation.lat ||
    current.lng !== nextLocation.lng ||
    current.city !== nextLocation.city ||
    current.state !== nextLocation.state ||
    current.label !== nextLocation.label;

  if (hasChanged) {
    order.latestAgentLocation = nextLocation;
  }

  return hasChanged;
}

function updateSyntheticAgentLocation(order) {
  if (!(order.dispatchLocation || order.latestAgentLocation) || !order.shippingAddress?.city) {
    return false;
  }

  const origin = order.dispatchLocation || order.latestAgentLocation;
  const destinationCity = getLocationByCity(order.shippingAddress.city);
  if (!origin || !destinationCity) {
    return false;
  }

  const currentLocation = {
    lat: origin.lat,
    lng: origin.lng,
    city: origin.city,
    state: origin.state,
    updatedAt: new Date(),
    label: "Assigned hub",
  };

  if (order.status === "out_for_delivery") {
    const outForDeliveryStep = Array.isArray(order.trackingSteps)
      ? order.trackingSteps.find((step) => step.status === "out_for_delivery")
      : null;
    const startTime = outForDeliveryStep?.completedAt ? new Date(outForDeliveryStep.completedAt).getTime() : Date.now();
    const elapsed = Math.max(0, Date.now() - startTime);
    const progress = Math.min(1, elapsed / (15 * 60 * 1000));
    const nextPoint = interpolatePoint(origin, destinationCity, progress);

    return setLatestAgentLocation(order, {
      ...nextPoint,
      city: progress >= 0.85 ? order.shippingAddress.city : origin.city,
      state: progress >= 0.85 ? order.shippingAddress.state : origin.state,
      updatedAt: new Date(),
      label: progress >= 0.85 ? "Approaching destination" : "In transit",
    });
  }

  if (order.status === "delivered") {
    return setLatestAgentLocation(order, {
      lat: destinationCity.lat,
      lng: destinationCity.lng,
      city: destinationCity.city,
      state: destinationCity.state,
      updatedAt: new Date(),
      label: "Delivered",
    });
  }

  return setLatestAgentLocation(order, currentLocation);
}

async function syncOrderTracking(order) {
  if (!order) {
    return order;
  }

  let changed = ensureTrackingDefaults(order);

  if (order.trackingMode !== "manual" && order.status !== "cancelled" && order.status !== "delivered") {
    const createdAt = new Date(order.createdAt || Date.now()).getTime();
    const elapsedMinutes = Math.max(0, (Date.now() - createdAt) / 60000);

    let inferredStatus = "placed";
    if (elapsedMinutes >= DEMO_PROGRESS_MINUTES.delivered) {
      inferredStatus = "delivered";
    } else if (elapsedMinutes >= DEMO_PROGRESS_MINUTES.out_for_delivery) {
      inferredStatus = "out_for_delivery";
    } else if (elapsedMinutes >= DEMO_PROGRESS_MINUTES.shipped) {
      inferredStatus = "shipped";
    } else if (elapsedMinutes >= DEMO_PROGRESS_MINUTES.packed) {
      inferredStatus = "packed";
    }

    if (order.status !== inferredStatus) {
      setOrderStatus(order, inferredStatus, "system");
      changed = true;
    }
  }

  if (updateSyntheticAgentLocation(order)) {
    changed = true;
  }

  if (changed && typeof order.save === "function") {
    await order.save();
  }

  return order;
}

module.exports = {
  ORDER_STATUS_FLOW,
  ORDER_STATUS_META,
  appendNotification,
  createTrackingSteps,
  ensureTrackingDefaults,
  setOrderStatus,
  syncOrderTracking,
};
