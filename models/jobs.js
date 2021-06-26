import mongoose from "mongoose";
import bcrypt from "bcrypt";
const jobSchema = new mongoose.Schema({
  jobTitle: {
    type: String,
    required: true,
    unique: true,
  },
  category: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  ctcpamin: {
    type: Number,
    required: true,
  },
  ctcpamax: {
    type: Number,
  },
  postedBy: {
    type: String,
    required: true,
  },
  applicants: [{ type: String, required: true }],
});

export const Job = mongoose.model("Job", jobSchema);
