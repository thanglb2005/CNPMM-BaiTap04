const mongoose = require('mongoose');

const { Schema } = mongoose;

const UserPointSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'ID người dùng là bắt buộc'],
      unique: true,
    },
    currentBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimeEarned: {
      type: Number,
      default: 0,
      min: 0,
    },
    lifetimeRedeemed: {
      type: Number,
      default: 0,
      min: 0,
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
      default: 'bronze',
    },
    tierPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextTierAt: {
      type: Number,
      default: 1000,
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes
UserPointSchema.index({ currentBalance: -1 });
UserPointSchema.index({ tier: 1 });

// Tier thresholds
const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 1000,
  gold: 5000,
  platinum: 20000,
  diamond: 50000,
};

// Calculate tier from total points
UserPointSchema.statics.calculateTier = function (lifetimeEarned) {
  if (lifetimeEarned >= TIER_THRESHOLDS.diamond) return 'diamond';
  if (lifetimeEarned >= TIER_THRESHOLDS.platinum) return 'platinum';
  if (lifetimeEarned >= TIER_THRESHOLDS.gold) return 'gold';
  if (lifetimeEarned >= TIER_THRESHOLDS.silver) return 'silver';
  return 'bronze';
};

// Get next tier info
UserPointSchema.statics.getNextTier = function (currentTier) {
  const tiers = ['bronze', 'silver', 'gold', 'platinum', 'diamond'];
  const currentIndex = tiers.indexOf(currentTier);
  if (currentIndex === tiers.length - 1) return null;
  return {
    nextTier: tiers[currentIndex + 1],
    pointsNeeded: TIER_THRESHOLDS[tiers[currentIndex + 1]],
  };
};

// Get tier thresholds
UserPointSchema.statics.getTierThresholds = function () {
  return { ...TIER_THRESHOLDS };
};

// Add points to user balance
UserPointSchema.methods.addPoints = async function (points, description = '') {
  const LoyaltyHistory = mongoose.model('LoyaltyHistory');
  const { POINT_TRANSACTION_TYPES } = require('./loyaltyHistory.model');

  const newBalance = this.currentBalance + points;
  this.currentBalance = newBalance;
  this.lifetimeEarned += points;
  this.tier = UserPointSchema.statics.calculateTier(this.lifetimeEarned);
  this.lastUpdatedAt = new Date();

  // Calculate points needed for next tier
  const nextTierInfo = UserPointSchema.statics.getNextTier(this.tier);
  this.nextTierAt = nextTierInfo ? nextTierInfo.pointsNeeded : null;
  this.tierPoints = nextTierInfo
    ? nextTierInfo.pointsNeeded - this.lifetimeEarned
    : 0;

  await this.save();

  // Log the transaction
  await LoyaltyHistory.create({
    userId: this.userId,
    type: POINT_TRANSACTION_TYPES.EARN_PURCHASE,
    points,
    balanceAfter: newBalance,
    description,
  });

  return this;
};

// Deduct points from user balance
UserPointSchema.methods.deductPoints = async function (points, description = '', orderId = null) {
  const LoyaltyHistory = mongoose.model('LoyaltyHistory');
  const { POINT_TRANSACTION_TYPES } = require('./loyaltyHistory.model');

  if (this.currentBalance < points) {
    throw new Error('Số dư điểm không đủ');
  }

  const newBalance = this.currentBalance - points;
  this.currentBalance = newBalance;
  this.lifetimeRedeemed += points;
  this.lastUpdatedAt = new Date();

  await this.save();

  // Log the transaction
  await LoyaltyHistory.create({
    userId: this.userId,
    type: POINT_TRANSACTION_TYPES.REDEEM_ORDER,
    points: -points,
    balanceAfter: newBalance,
    description,
    orderId,
  });

  return this;
};

// Get or create user point record
UserPointSchema.statics.getOrCreate = async function (userId) {
  let userPoint = await this.findOne({ userId });
  if (!userPoint) {
    userPoint = await this.create({ userId });
  }
  return userPoint;
};

const UserPoint = mongoose.model('UserPoint', UserPointSchema);

module.exports = {
  UserPoint,
  UserPointSchema,
  TIER_THRESHOLDS,
};
