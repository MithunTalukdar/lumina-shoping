function toId(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value.toString === "function") {
    return value.toString();
  }

  return "";
}

function serializeOrder(order) {
  return {
    id: toId(order._id),
    orderNumber: order.orderNumber,
    userId: toId(order.userId),
    items: Array.isArray(order.items)
      ? order.items.map((item) => ({
          productId: item.productId,
          name: item.name,
          description: item.description,
          image: item.image,
          category: item.category,
          location: item.location,
          price: item.price,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        }))
      : [],
    subtotal: order.subtotal,
    shipping: order.shipping,
    tax: order.tax,
    total: order.total,
    status: order.status,
    shippingAddress: order.shippingAddress,
    estimatedDelivery: order.estimatedDelivery,
    deliveryAgent: order.deliveryAgent,
    latestAgentLocation: order.latestAgentLocation,
    trackingSteps: Array.isArray(order.trackingSteps)
      ? order.trackingSteps.map((step) => ({
          status: step.status,
          label: step.label,
          description: step.description,
          completedAt: step.completedAt,
        }))
      : [],
    notifications: Array.isArray(order.notifications)
      ? order.notifications.map((entry) => ({
          id: entry.id,
          status: entry.status,
          title: entry.title,
          message: entry.message,
          channels: entry.channels,
          createdAt: entry.createdAt,
        }))
      : [],
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function canAccessOrder(order, authUser) {
  if (!order) {
    return false;
  }

  if (authUser.role === "admin") {
    return true;
  }

  if (authUser.role === "delivery_agent") {
    return order.deliveryAgent?.email === authUser.email;
  }

  return toId(order.userId) === authUser.id;
}

module.exports = {
  canAccessOrder,
  serializeOrder,
  toId,
};
