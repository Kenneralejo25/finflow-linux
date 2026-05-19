const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// SQLite Database Setup
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initializeDatabase();
  }
});

// Create tables and seed initial data if empty
function initializeDatabase() {
  db.serialize(() => {
    // Transactions Table
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
        category TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        description TEXT
      )
    `);

    // Savings Goals Table
    db.run(`
      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        target_amount REAL NOT NULL,
        current_amount REAL DEFAULT 0,
        target_date TEXT NOT NULL
      )
    `);

    // Seed Transactions if empty
    db.get("SELECT COUNT(*) AS count FROM transactions", (err, row) => {
      if (err) return console.error(err);
      if (row.count === 0) {
        console.log("Seeding default transactions...");
        const stmt = db.prepare(`
          INSERT INTO transactions (type, category, amount, date, description)
          VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run('income', 'Sueldo', 3200.00, '2026-05-01', 'Salario mensual principal');
        stmt.run('income', 'Freelance', 450.00, '2026-05-08', 'Desarrollo Landing Page');
        stmt.run('expense', 'Alquiler', 900.00, '2026-05-02', 'Pago del apartamento');
        stmt.run('expense', 'Alimentación', 350.00, '2026-05-05', 'Compras supermercado');
        stmt.run('expense', 'Servicios', 120.00, '2026-05-06', 'Luz, agua e internet');
        stmt.run('expense', 'Suscripciones', 45.00, '2026-05-10', 'Netflix y Spotify');
        stmt.run('expense', 'Entretenimiento', 150.00, '2026-05-15', 'Salida con amigos');
        stmt.finalize();
      }
    });

    // Seed Goals if empty
    db.get("SELECT COUNT(*) AS count FROM goals", (err, row) => {
      if (err) return console.error(err);
      if (row.count === 0) {
        console.log("Seeding default savings goals...");
        const stmt = db.prepare(`
          INSERT INTO goals (name, target_amount, current_amount, target_date)
          VALUES (?, ?, ?, ?)
        `);
        stmt.run('Fondo de Emergencias', 5000.00, 1500.00, '2026-12-31');
        stmt.run('Viaje a Japón', 4000.00, 1200.00, '2027-06-30');
        stmt.finalize();
      }
    });
  });
}

// --- API ROUTES ---

// 1. Transactions Endpoints

// Get all transactions
app.get('/api/transactions', (req, res) => {
  db.all('SELECT * FROM transactions ORDER BY date DESC, id DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Add a transaction
app.post('/api/transactions', (req, res) => {
  const { type, category, amount, date, description } = req.body;

  if (!type || !category || !amount || !date) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const query = `INSERT INTO transactions (type, category, amount, date, description) VALUES (?, ?, ?, ?, ?)`;
  db.run(query, [type, category, amount, date, description], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      id: this.lastID,
      type,
      category,
      amount,
      date,
      description
    });
  });
});

// Delete a transaction
app.delete('/api/transactions/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM transactions WHERE id = ?', id, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Transacción no encontrada' });
    }
    res.json({ message: 'Transacción eliminada con éxito', id });
  });
});

// 2. Goals Endpoints

// Get all goals
app.get('/api/goals', (req, res) => {
  db.all('SELECT * FROM goals ORDER BY target_date ASC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Add a goal
app.post('/api/goals', (req, res) => {
  const { name, target_amount, current_amount, target_date } = req.body;

  if (!name || !target_amount || !target_date) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const query = `INSERT INTO goals (name, target_amount, current_amount, target_date) VALUES (?, ?, ?, ?)`;
  db.run(query, [name, target_amount, current_amount || 0, target_date], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      id: this.lastID,
      name,
      target_amount,
      current_amount: current_amount || 0,
      target_date
    });
  });
});

// Update a goal's savings progress
app.put('/api/goals/:id', (req, res) => {
  const { id } = req.params;
  const { current_amount } = req.body;

  if (current_amount === undefined) {
    return res.status(400).json({ error: 'Falta la cantidad actual' });
  }

  const query = `UPDATE goals SET current_amount = ? WHERE id = ?`;
  db.run(query, [current_amount, id], function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Meta no encontrada' });
    }
    res.json({ message: 'Progreso de la meta actualizado', id, current_amount });
  });
});

// Delete a goal
app.delete('/api/goals/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM goals WHERE id = ?', id, function (err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Meta no encontrada' });
    }
    res.json({ message: 'Meta eliminada con éxito', id });
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Fallback for 404
app.use((req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`FinFlow backend running on port ${PORT}`);
});
