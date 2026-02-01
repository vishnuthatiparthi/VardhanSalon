import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

function App() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedService, setSelectedService] = useState({ id: 1 });
  const [selectedTime, setSelectedTime] = useState("10:00");

  const handleBooking = async () => {
    if (!name || !phone || !selectedService || !selectedTime) {
      alert("Please fill all fields");
      return;
    }

    const payload = {
      name,
      phone,
      serviceId: selectedService.id,
      startTime: new Date(`2026-02-10T${selectedTime}:00`).toISOString()
    };

    try {
      const response = await fetch(`${API_URL}/api/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Booking failed");
      }

      const data = await response.json();
      alert(data.message || "Booked Successfully!");
    } catch (err) {
      console.error(err);
      alert(err.message || "Server error");
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Vardhan Salon Booking</h1>

      <input
        placeholder="Name"
        value={name}
        onChange={e => setName(e.target.value)}
      />

      <input
        placeholder="Phone"
        value={phone}
        onChange={e => setPhone(e.target.value)}
      />

      <input
        type="time"
        value={selectedTime}
        onChange={e => setSelectedTime(e.target.value)}
      />

      <button onClick={handleBooking}>Book Now</button>
    </div>
  );
}

export default App;
