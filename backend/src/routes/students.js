import express from "express";
import Student from "../models/Student.js";
import { uploadStudentReportToS3 } from "../services/s3Reports.js";

const router = express.Router();

const round2 = (value) => Math.round(value * 100) / 100;

const calculateSemesterSgpa = (courses) => {
  let totalCredits = 0;
  let weightedPoints = 0;

  courses.forEach((course) => {
    totalCredits += Number(course.credits);
    weightedPoints += Number(course.credits) * Number(course.gradePoint);
  });

  return totalCredits > 0 ? round2(weightedPoints / totalCredits) : 0;
};

const calculateCgpa = (semesters) => {
  let totalCredits = 0;
  let totalWeightedPoints = 0;

  semesters.forEach((semester) => {
    semester.courses.forEach((course) => {
      const credits = Number(course.credits);
      const gradePoint = Number(course.gradePoint);
      totalCredits += credits;
      totalWeightedPoints += credits * gradePoint;
    });
  });

  return totalCredits > 0 ? round2(totalWeightedPoints / totalCredits) : 0;
};

router.post("/calculate", async (req, res) => {
  try {
    const { name, enrollmentNo, semesters } = req.body;

    if (!name || !enrollmentNo || !Array.isArray(semesters) || semesters.length === 0) {
      return res.status(400).json({ message: "Name, enrollment number, and semesters are required." });
    }

    const normalizedSemesters = semesters.map((semester) => ({
      semesterNumber: Number(semester.semesterNumber),
      courses: (semester.courses || []).map((course) => ({
        name: course.name,
        credits: Number(course.credits),
        gradePoint: Number(course.gradePoint)
      }))
    }));

    const withSgpa = normalizedSemesters.map((semester) => ({
      ...semester,
      sgpa: calculateSemesterSgpa(semester.courses)
    }));

    const cgpa = calculateCgpa(withSgpa);

    const savedStudent = await Student.findOneAndUpdate(
      { enrollmentNo: enrollmentNo.trim() },
      {
        name: name.trim(),
        enrollmentNo: enrollmentNo.trim(),
        semesters: withSgpa,
        cgpa
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    let reportUrl = null;
    try {
      reportUrl = await uploadStudentReportToS3(savedStudent);
    } catch (uploadError) {
      console.warn("S3 report upload failed:", uploadError.message);
    }

    res.status(200).json({
      ...savedStudent.toObject(),
      reportUrl
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to calculate CGPA.", error: error.message });
  }
});

router.get("/", async (_req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch students.", error: error.message });
  }
});

export default router;
