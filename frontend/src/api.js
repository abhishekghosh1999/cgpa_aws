const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const calculateCgpa = async (payload) => {
  const response = await fetch(`${API_BASE_URL}/api/students/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || "Could not calculate CGPA.");
  }

  return response.json();
};

export const getAllStudents = async () => {
  const response = await fetch(`${API_BASE_URL}/api/students`);

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || "Could not fetch students.");
  }

  return response.json();
};
