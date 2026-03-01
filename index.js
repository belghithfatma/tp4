const express = require('express');
const db = require('./database');

const cors = require('cors');
const rateLimit = require('express-rate-limit');

const session = require('express-session');
const Keycloak = require('keycloak-connect');

const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");

const app = express();
const PORT = 3000;


app.use(express.json());

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Trop de requêtes effectuées depuis cette IP, veuillez réessayer après 15 minutes."
  }
});
app.use(limiter);

const memoryStore = new session.MemoryStore();

app.use(session({
  secret: 'api-secret',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

const keycloak = new Keycloak({ store: memoryStore }, './keycloak-config.json');
app.use(keycloak.middleware());

const swaggerDocument = YAML.load("./openapi.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/', (req, res) => {
  res.json("Registre de personnes! Choisissez le bon routage!");
});


app.get('/secure', keycloak.protect(), (req, res) => {
  res.json({ message: 'Vous êtes authentifié !' });
});


app.get('/personnes', keycloak.protect(), (req, res) => {
  db.all("SELECT * FROM personnes", [], (err, rows) => {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ message: "success", data: rows });
  });
});


app.get('/personnes/:id', keycloak.protect(), (req, res) => {
  const id = req.params.id;
  db.get("SELECT * FROM personnes WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!row) return res.status(404).json({ message: "Personne non trouvée" });
    res.json({ message: "success", data: row });
  });
});


app.post('/personnes', keycloak.protect(), (req, res) => {
  const { nom, adresse } = req.body;
  if (!nom) return res.status(400).json({ error: "Le nom est obligatoire" });

  db.run(
    `INSERT INTO personnes (nom, adresse) VALUES (?, ?)`,
    [nom, adresse],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.status(201).json({ message: "created", data: { id: this.lastID } });
    }
  );
});

app.put('/personnes/:id', keycloak.protect(), (req, res) => {
  const id = req.params.id;
  const { nom, adresse } = req.body;

  db.run(
    `UPDATE personnes SET nom = ?, adresse = ? WHERE id = ?`,
    [nom, adresse, id],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ message: "Personne non trouvée" });
      res.json({ message: "updated" });
    }
  );
});

app.delete('/personnes/:id', keycloak.protect(), (req, res) => {
  const id = req.params.id;
  db.run(`DELETE FROM personnes WHERE id = ?`, [id], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ message: "Personne non trouvée" });
    res.status(204).send();
  });
});


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger: http://localhost:${PORT}/api-docs`);
});