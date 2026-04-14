const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
    content: { type: String, required: true },
    date: { type: Date, default: Date.now }
});

const leadSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    source: { type: String, required: true },
    status: { 
        type: String, 
        enum: ['new', 'contacted', 'converted'],
        default: 'new'
    },
    priority: {
        type: String,
        enum: ['high', 'medium', 'low'],
        default: 'medium'
    },
    followUpDate: { type: Date },
    notes: [noteSchema]
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);
