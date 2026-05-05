import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    credits: { type: Number, required: true, min: 0 },
    gradePoint: { type: Number, required: true, min: 0, max: 10 }
  },
  { _id: false }
);

const semesterSchema = new mongoose.Schema(
  {
    semesterNumber: { type: Number, required: true, min: 1 },
    courses: { type: [courseSchema], required: true, default: [] },
    sgpa: { type: Number, required: true, min: 0, max: 10 }
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    enrollmentNo: { type: String, required: true, trim: true, unique: true },
    semesters: { type: [semesterSchema], required: true, default: [] },
    cgpa: { type: Number, required: true, min: 0, max: 10 }
  },
  { timestamps: true }
);

export default mongoose.model("Student", studentSchema);
