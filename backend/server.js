require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "https://vardhansalon.com"],
  methods: ["GET", "POST"]
}));
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});

/* ---------- AVAILABILITY ---------- */
app.get("/api/availability", async (req, res) => {
  const { date } = req.query; // YYYY-MM-DD
  try {
    const result = await pool.query(
      `
      SELECT appointment_time
      FROM appointments
      WHERE appointment_time >= $1
        AND appointment_time < $1::date + interval '1 day'
      `,
      [date]
    );

    res.json({ busySlots: result.rows });
  } catch (err) {
    res.status(500).json({ message: "Availability check failed" });
  }
});

/* ---------- BOOK APPOINTMENT ---------- */
app.post("/api/book", async (req, res) => {
  const { name, phone, serviceId, startTime } = req.body;

  if (!name || !phone || !serviceId || !startTime) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  if (isNaN(Date.parse(startTime))) {
    return res.status(400).json({ message: "Invalid date format" });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const serviceRes = await client.query(
      "SELECT duration_minutes FROM services WHERE id = $1",
      [serviceId]
    );
    if (serviceRes.rows.length === 0) {
      throw new Error("Invalid service");
    }

    const duration = serviceRes.rows[0].duration_minutes;
    const endTime = new Date(
      new Date(startTime).getTime() + duration * 60000
    );

    const staffRes = await client.query(
      `
      SELECT id FROM staff
      WHERE id NOT IN (
        SELECT staff_id FROM appointments
        WHERE tstzrange(appointment_time, end_time)
              && tstzrange($1, $2)
      )
      LIMIT 1
      FOR UPDATE
      `,
      [startTime, endTime]
    );

    if (staffRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "No staff available" });
    }

    await client.query(
      `
      INSERT INTO appointments
      (customer_name, customer_phone, service_id, staff_id, appointment_time, end_time)
      VALUES ($1,$2,$3,$4,$5,$6)
      `,
      [name, phone, serviceId, staffRes.rows[0].id, startTime, endTime]
    );

    await client.query("COMMIT");
    res.json({ success: true, message: "Appointment booked" });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
