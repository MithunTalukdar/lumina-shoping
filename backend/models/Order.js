const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    addressLine: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const geoPointSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    lat: {
      type: Number,
      required: true,
    },
    lng: {
      type: Number,
      required: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    label: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    _id: false,
  }
);

const deliveryEstimateSchema = new mongoose.Schema(
  {
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    minDays: {
      type: Number,
      required: true,
      min: 1,
    },
    maxDays: {
      type: Number,
      required: true,
      min: 1,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    etaStart: {
      type: Date,
      required: true,
    },
    etaEnd: {
      type: Date,
      required: true,
    },
  },
  {
    _id: false,
  }
);

const deliveryAgentSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    _id: false,
  }
);

const trackingStepSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["placed", "packed", "shipped", "out_for_delivery", "delivered"],
      required: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const notificationSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["placed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    channels: {
      type: [String],
      default: ["email", "sms", "push"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
    },
    lineTotal: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    shipping: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    tax: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    orderNumber: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["placed", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"],
      default: "placed",
    },
    trackingMode: {
      type: String,
      enum: ["system", "manual"],
      default: "system",
    },
    shippingAddress: {
      type: addressSchema,
      required: true,
    },
    estimatedDelivery: {
      type: deliveryEstimateSchema,
      required: true,
    },
    deliveryAgent: {
      type: deliveryAgentSchema,
      default: null,
    },
    dispatchLocation: {
      type: geoPointSchema,
      default: null,
    },
    latestAgentLocation: {
      type: geoPointSchema,
      default: null,
    },
    trackingSteps: {
      type: [trackingStepSchema],
      default: [],
    },
    notifications: {
      type: [notificationSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);
