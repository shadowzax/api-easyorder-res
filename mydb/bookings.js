
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dataFolder = path.join(__dirname, "..", "data");

if (!fs.existsSync(dataFolder)) {
    fs.mkdirSync(dataFolder, { recursive: true });
}

const dbPath = path.join(dataFolder, "bookings.sqlite");

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error(err.message);
    } else {
        console.log("Connected to bookings database.");
    }
});

const defaultProfilePicture = "https://i.ibb.co/HRbkkLw/3177440-1.jpg";

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT UNIQUE,
            phone_number TEXT NOT NULL UNIQUE,
            profile_picture TEXT DEFAULT '${defaultProfilePicture}',
            password TEXT NOT NULL,
            account_type TEXT DEFAULT 'user',
            nationality TEXT NOT NULL DEFAULT '',
            sharm_area TEXT NOT NULL DEFAULT '',
            language TEXT NOT NULL DEFAULT 'ar',
            special_requests TEXT NOT NULL DEFAULT '',
            booking_code TEXT UNIQUE,
            account_status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const requiredColumns = {
        name: "TEXT",
        email: "TEXT",
        phone_number: "TEXT",
        profile_picture: `TEXT DEFAULT '${defaultProfilePicture}'`,
        password: "TEXT",
        account_type: "TEXT DEFAULT 'user'",
        nationality: "TEXT NOT NULL DEFAULT ''",
        sharm_area: "TEXT NOT NULL DEFAULT ''",
        language: "TEXT NOT NULL DEFAULT 'ar'",
        special_requests: "TEXT NOT NULL DEFAULT ''",
        booking_code: "TEXT",
        account_status: "TEXT DEFAULT 'active'",
        created_at: "DATETIME DEFAULT CURRENT_TIMESTAMP"
    };

    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
            console.error(err.message);
            return;
        }

        const existingColumns = columns.map(column => column.name);
        const columnEntries = Object.entries(requiredColumns);

        const addNextColumn = (index) => {
            if (index >= columnEntries.length) {
                db.run(`
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_booking_code
                    ON users(booking_code)
                    WHERE booking_code IS NOT NULL
                `, (err) => {
                    if (err) {
                        console.error(err.message);
                    }
                });

                return;
            }

            const [name, type] = columnEntries[index];

            if (existingColumns.includes(name)) {
                addNextColumn(index + 1);
                return;
            }

            db.run(
                `ALTER TABLE users ADD COLUMN ${name} ${type}`,
                (err) => {
                    if (err) {
                        console.error(err.message);
                        return;
                    }

                    addNextColumn(index + 1);
                }
            );
        };

        addNextColumn(0);
    });
});

module.exports = {
    db
};
