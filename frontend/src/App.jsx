import { useEffect, useState } from "react";
import { calculateCgpa, getAllStudents } from "./api";

const createCourse = () => ({ name: "", credits: "", gradePoint: "" });
const createSemester = (semesterNumber) => ({
  semesterNumber,
  courses: [createCourse()]
});

export default function App() {
  const [name, setName] = useState("");
  const [enrollmentNo, setEnrollmentNo] = useState("");
  const [semesters, setSemesters] = useState([createSemester(1)]);
  const [result, setResult] = useState(null);
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadStudents = async () => {
    setStudentsLoading(true);
    setStudentsError("");
    try {
      const allStudents = await getAllStudents();
      setStudents(allStudents);
    } catch (fetchError) {
      setStudentsError(fetchError.message);
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const addSemester = () => {
    setSemesters((prev) => [...prev, createSemester(prev.length + 1)]);
  };

  const addCourse = (semesterIndex) => {
    setSemesters((prev) =>
      prev.map((sem, index) =>
        index === semesterIndex ? { ...sem, courses: [...sem.courses, createCourse()] } : sem
      )
    );
  };

  const updateCourse = (semesterIndex, courseIndex, field, value) => {
    setSemesters((prev) =>
      prev.map((sem, sIndex) => {
        if (sIndex !== semesterIndex) return sem;
        return {
          ...sem,
          courses: sem.courses.map((course, cIndex) =>
            cIndex === courseIndex ? { ...course, [field]: value } : course
          )
        };
      })
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const payload = {
        name,
        enrollmentNo,
        semesters: semesters.map((semester) => ({
          semesterNumber: semester.semesterNumber,
          courses: semester.courses.map((course) => ({
            name: course.name,
            credits: Number(course.credits),
            gradePoint: Number(course.gradePoint)
          }))
        }))
      };

      const response = await calculateCgpa(payload);
      setResult(response);
      await loadStudents();
    } catch (submissionError) {
      setError(submissionError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1>Student CGPA Calculator</h1>
      <form onSubmit={handleSubmit}>
        <div className="row">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Student Name"
          />
          <input
            required
            value={enrollmentNo}
            onChange={(e) => setEnrollmentNo(e.target.value)}
            placeholder="Enrollment Number"
          />
        </div>

        {semesters.map((semester, semesterIndex) => (
          <section key={semesterIndex} className="semester">
            <h3>Semester {semester.semesterNumber}</h3>
            {semester.courses.map((course, courseIndex) => (
              <div className="row" key={courseIndex}>
                <input
                  required
                  value={course.name}
                  onChange={(e) => updateCourse(semesterIndex, courseIndex, "name", e.target.value)}
                  placeholder="Course Name"
                />
                <input
                  required
                  min="0"
                  step="0.5"
                  type="number"
                  value={course.credits}
                  onChange={(e) => updateCourse(semesterIndex, courseIndex, "credits", e.target.value)}
                  placeholder="Credits"
                />
                <input
                  required
                  min="0"
                  max="10"
                  step="0.1"
                  type="number"
                  value={course.gradePoint}
                  onChange={(e) => updateCourse(semesterIndex, courseIndex, "gradePoint", e.target.value)}
                  placeholder="Grade Point"
                />
              </div>
            ))}
            <button type="button" onClick={() => addCourse(semesterIndex)}>
              + Add Course
            </button>
          </section>
        ))}

        <div className="actions">
          <button type="button" onClick={addSemester}>
            + Add Semester
          </button>
          <button type="submit" disabled={loading}>
            {loading ? "Calculating..." : "Calculate CGPA"}
          </button>
        </div>
      </form>

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="result">
          <h2>Result</h2>
          <p>
            <strong>Name:</strong> {result.name}
          </p>
          <p>
            <strong>Enrollment:</strong> {result.enrollmentNo}
          </p>
          <p>
            <strong>CGPA:</strong> {result.cgpa}
          </p>
          {result.semesters.map((semester) => (
            <p key={semester.semesterNumber}>
              Semester {semester.semesterNumber} SGPA: {semester.sgpa}
            </p>
          ))}
        </div>
      )}

      <div className="stored-data">
        <div className="stored-data-header">
          <h2>Stored Students (MongoDB)</h2>
          <button type="button" onClick={loadStudents} disabled={studentsLoading}>
            {studentsLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {studentsError && <p className="error">{studentsError}</p>}

        {!studentsLoading && !studentsError && students.length === 0 && (
          <p>No student data found in database.</p>
        )}

        {!studentsLoading && students.length > 0 && (
          <div className="students-list">
            {students.map((student) => (
              <article key={student._id || student.enrollmentNo} className="student-card">
                <p>
                  <strong>Name:</strong> {student.name}
                </p>
                <p>
                  <strong>Enrollment:</strong> {student.enrollmentNo}
                </p>
                <p>
                  <strong>CGPA:</strong> {student.cgpa}
                </p>
                {(student.semesters || []).map((semester) => (
                  <p key={`${student.enrollmentNo}-${semester.semesterNumber}`}>
                    Semester {semester.semesterNumber} SGPA: {semester.sgpa}
                  </p>
                ))}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
