const mongoose = require('mongoose');

const cogsProductSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String },
  productCost: { type: Number, required: true },
});

const COGSProduct = mongoose.models.COGSProduct || mongoose.model('COGSProduct', cogsProductSchema);

module.exports = { COGSProduct }; 