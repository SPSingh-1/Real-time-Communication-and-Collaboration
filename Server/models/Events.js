import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '', trim: true },
  date: { type: Date, required: true },
  time: { type: String, required: true }, // like "10:00"
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });



const Events = mongoose.model('Event', EventSchema);

export default Events;
