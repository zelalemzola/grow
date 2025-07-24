const mongoose = require('mongoose');

const paymentFeeSchema = new mongoose.Schema({
  paySource: { type: String, required: true, unique: true, lowercase: true },
  percentage: { type: Number, required: true },
});

const PaymentFee = mongoose.models.PaymentFee || mongoose.model('PaymentFee', paymentFeeSchema);

// Ensure defaults for 'creditcard' and 'paypal'
async function ensureDefaultPaymentFees() {
  const defaults = [
    { paySource: 'creditcard', percentage: 3 },
    { paySource: 'paypal', percentage: 9 },
  ];
  for (const def of defaults) {
    await PaymentFee.updateOne(
      { paySource: def.paySource },
      { $setOnInsert: def },
      { upsert: true }
    );
  }
}

module.exports = { PaymentFee, ensureDefaultPaymentFees }; 