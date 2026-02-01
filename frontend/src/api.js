const API_URL = import.meta.env.VITE_API_URL;

export const bookAppointment = async (payload) => {
  const response = await fetch(`${API_URL}/api/book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || "Booking failed");
  }

  return response.json();
};
