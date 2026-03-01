const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(
  './maBaseDeDonnees.sqlite',
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log('Connecté à la base de données SQLite.');

      db.run(
        `CREATE TABLE IF NOT EXISTS personnes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nom TEXT NOT NULL,
          adresse TEXT
        )`,
        (err) => {
          if (err) {
            console.error(err.message);
          } else {

            db.get("SELECT COUNT(*) as count FROM personnes", [], (err, row) => {
              if (err) {
                console.error(err.message);
                return;
              }

              if (row.count === 0) {
                const personnes = [
                  { nom: 'Bob', adresse: 'Rue 1' },
                  { nom: 'Alice', adresse: 'Rue 2' },
                  { nom: 'Charlie', adresse: 'Rue 3' }
                ];

                personnes.forEach((p) => {
                  db.run(
                    `INSERT INTO personnes (nom, adresse) VALUES (?, ?)`,
                    [p.nom, p.adresse]
                  );
                });

                console.log("Données initiales insérées.");
              }
            });

          }
        }
      );
    }
  }
);

module.exports = db;