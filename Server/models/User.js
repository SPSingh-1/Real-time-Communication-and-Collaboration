import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneno: { type: String, required: true },
  password: { type: String, required: true },
}, { timestamps: true });

const User = mongoose.model('user', UserSchema);
export default User;