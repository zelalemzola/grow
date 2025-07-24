const mongoose = require('mongoose');

const opexSchema = new mongoose.Schema({
  value: { type: Number, required: true },
});

const Opex = mongoose.models.Opex || mongoose.model('Opex', opexSchema);

// Ensure default OPEX value
async function ensureDefaultOpex() {
  const existing = await Opex.findOne();
  if (!existing) {
    await Opex.create({ value: 3000 });
  }
}

module.exports = { Opex, ensureDefaultOpex }; 