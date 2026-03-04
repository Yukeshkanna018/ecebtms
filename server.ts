import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { addDays, format, isWeekend, parseISO } from "date-fns";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const membersList = [
  { rollNo: "25UEC002", name: "NAVANEETHA KRISHNAN.R" },
  { rollNo: "25UEC004", name: "ALLEN VICTOR.A" },
  { rollNo: "25UEC006", name: "HARSHITHAA SHREE.R" },
  { rollNo: "25UEC008", name: "KARTHICK PANDIAN.M" },
  { rollNo: "25UEC010", name: "KABIL VISHWA.TM" },
  { rollNo: "25UEC012", name: "HARI PRASATH.G" },
  { rollNo: "25UEC014", name: "SHARMILA.J" },
  { rollNo: "25UEC016", name: "HEMA VARSHINI.A" },
  { rollNo: "25UEC018", name: "HARSHINI.S" },
  { rollNo: "25UEC020", name: "KARTHIKEYAN.P" },
  { rollNo: "25UEC022", name: "DHARUNYA SHREE.G" },
  { rollNo: "25UEC023", name: "HIBSA FARITH.S.H" },
  { rollNo: "25UEC024", name: "DHAKSHANA.K" },
  { rollNo: "25UEC026", name: "ABISHEK.S" },
  { rollNo: "25UEC028", name: "HARSHINI.S.D" },
  { rollNo: "25UEC030", name: "HARICHARAN.S.P" },
  { rollNo: "25UEC032", name: "SAKTHI DIVASHKAR.M" },
  { rollNo: "25UEC036", name: "HARISH KARTHICK.R" },
  { rollNo: "25UEC038", name: "BALAJI.N" },
  { rollNo: "25UEC040", name: "NITESH VARMAN.M" },
  { rollNo: "25UEC042", name: "MAHENDRAN.N.P" },
  { rollNo: "25UEC044", name: "VENKATAPRIYA.S" },
  { rollNo: "25UEC046", name: "YUVASRI.K" },
  { rollNo: "25UEC048", name: "SUJITHA.J.T" },
  { rollNo: "25UEC050", name: "PADMASINDUJA.K" },
  { rollNo: "25UEC051", name: "LAKSHMI.L" },
  { rollNo: "25UEC052", name: "BOOPESH.K.V" },
  { rollNo: "25UEC054", name: "SENTHAMILSELVI.M" },
  { rollNo: "25UEC056", name: "KHAN MOHAMAD.S" },
  { rollNo: "25UEC057", name: "SWETHA ROSE.S" },
  { rollNo: "25UEC058", name: "VIMAL.V.S" },
  { rollNo: "25UEC059", name: "RAHUL.P" },
  { rollNo: "25UEC062", name: "MOHAMADYUNUS.R" },
  { rollNo: "25UEC064", name: "PRIYADHARSHINI.K" },
  { rollNo: "25UEC066", name: "HARIHARAN.S" },
  { rollNo: "25UEC067", name: "YATHEESHWAR.B.R" },
  { rollNo: "25UEC068", name: "LATHIKA.S" },
  { rollNo: "25UEC069", name: "DEVIPRIYA.T" },
  { rollNo: "25UEC074", name: "SANTHOSHKANNA.S" },
  { rollNo: "25UEC075", name: "ABISHEK MILTON.T" },
  { rollNo: "25UEC076", name: "DIVYESH SANKAR.N.K" },
  { rollNo: "25UEC082", name: "GOKUL.S" },
  { rollNo: "25UEC083", name: "YOGAHARANI.A" },
  { rollNo: "25UEC085", name: "MAGATHI.M" },
  { rollNo: "25UEC086", name: "SHRUTI.K" },
  { rollNo: "25UEC089", name: "MATTHEW PAULS.A" },
  { rollNo: "25UEC092", name: "GURU VIGNESHWARAN.S" },
  { rollNo: "25UEC096", name: "BIRUNTHA.J" },
  { rollNo: "25UEC102", name: "MAHALAKSHMI.G" },
  { rollNo: "25UEC103", name: "UMA MAHESWARI.M" },
  { rollNo: "25UEC107", name: "YOGESH.K" },
  { rollNo: "25UEC108", name: "GAUTHAM.S" },
  { rollNo: "25UEC109", name: "SRIMATHI.B" },
  { rollNo: "25UEC110", name: "PRINCE VICTOR.A" },
  { rollNo: "25UEC111", name: "PRADHIKSHA.M.P" },
  { rollNo: "25UEC113", name: "DINESH PANDI.R" },
  { rollNo: "25UEC115", name: "YAZHINI.M" },
  { rollNo: "25UEC116", name: "HARSHVARDHAN.S" },
  { rollNo: "25UEC117", name: "MOHAMAD SALMANKHAN.N" },
  { rollNo: "25UEC120", name: "DEEPIKASRI.R.K" },
];

const ROLES_LIST = [
  "TMOD", "GE", "TTM", "TIMER", "AH_COUNTER", "GRAMMARIAN",
  "SPEAKER_1", "SPEAKER_2", "SPEAKER_3",
  "EVALUATOR_1", "EVALUATOR_2", "EVALUATOR_3",
  "TT_SPEAKER_1", "TT_SPEAKER_2", "TT_SPEAKER_3",
  "BACKUP_1", "BACKUP_2", "BACKUP_3"
];

const FEB_SCHEDULE_DATA: Record<string, string[]> = {
  "2026-02-11": ["NAVANEETHA KRISHNAN.R", "ALLEN VICTOR.A", "HARSHITHAA SHREE.R", "KARTHICK PANDIAN.M", "KABIL VISHWA.TM", "HARI PRASATH.G", "SHARMILA.J", "HEMA VARSHINI.A", "HARSHINI.S", "KARTHIKEYAN.P", "DHARUNYA SHREE.G", "HIBSA FARITH.S.H", "DHAKSHANA.K", "ABISHEK.S", "HARSHINI.S.D"],
  "2026-02-12": ["HARICHARAN.S.P", "SAKTHI DIVASHKAR.M", "HARISH KARTHICK.R", "BALAJI.N", "NITESH VARMAN.M", "MAHENDRAN.N.P", "VENKATAPRIYA.S", "YUVASRI.K", "SUJITHA.J.T", "PADMASINDUJA.K", "LAKSHMI.L", "BOOPESH.K.V", "SENTHAMILSELVI.M", "KHAN MOHAMAD.S", "SWETHA ROSE.S"],
  "2026-02-13": ["VIMAL.V.S", "RAHUL.P", "MOHAMADYUNUS.R", "PRIYADHARSHINI.K", "HARIHARAN.S", "YATHEESHWAR.B.R", "LATHIKA.S", "DEVIPRIYA.T", "SANTHOSHKANNA.S", "ABISHEK MILTON.T", "DIVYESH SANKAR.N.K", "GOKUL.S", "YOGAHARANI.A", "MAGATHI.M", "SHRUTI.K"],
  "2026-02-16": ["MATTHEW PAULS.A", "GURU VIGNESHWARAN.S", "BIRUNTHA.J", "MAHALAKSHMI.G", "UMA MAHESWARI.M", "YOGESH.K", "GAUTHAM.S", "SRIMATHI.B", "PRINCE VICTOR.A", "PRADHIKSHA.M.P", "DINESH PANDI.R", "YAZHINI.M", "HARSHVARDHAN.S", "MOHAMAD SALMANKHAN.N", "DEEPIKASRI.R.K"],
  "2026-02-17": ["DHAKSHANA.K", "ABISHEK.S", "HARSHINI.S.D", "KARTHIKEYAN.P", "DHARUNYA SHREE.G", "HIBSA FARITH.S.H", "NAVANEETHA KRISHNAN.R", "ALLEN VICTOR.A", "HARSHITHAA SHREE.R", "SHARMILA.J", "HEMA VARSHINI.A", "HARSHINI.S", "KARTHICK PANDIAN.M", "KABIL VISHWA.TM", "HARI PRASATH.G"],
  "2026-02-18": ["SENTHAMILSELVI.M", "KHAN MOHAMAD.S", "SWETHA ROSE.S", "PADMASINDUJA.K", "LAKSHMI.L", "BOOPESH.K.V", "HARICHARAN.S.P", "SAKTHI DIVASHKAR.M", "HARISH KARTHICK.R", "VENKATAPRIYA.S", "YUVASRI.K", "SUJITHA.J.T", "BALAJI.N", "NITESH VARMAN.M", "MAHENDRAN.N.P"],
  "2026-02-19": ["YOGAHARANI.A", "MAGATHI.M", "SHRUTI.K", "ABISHEK MILTON.T", "DIVYESH SANKAR.N.K", "GOKUL.S", "VIMAL.V.S", "RAHUL.P", "MOHAMADYUNUS.R", "LATHIKA.S", "DEVIPRIYA.T", "SANTHOSHKANNA.S", "PRIYADHARSHINI.K", "HARIHARAN.S", "YATHEESHWAR.B.R"],
  "2026-02-20": ["HARSHVARDHAN.S", "MOHAMAD SALMANKHAN.N", "DEEPIKASRI.R.K", "PRADHIKSHA.M.P", "DINESH PANDI.R", "YAZHINI.M", "MATTHEW PAULS.A", "GURU VIGNESHWARAN.S", "BIRUNTHA.J", "GAUTHAM.S", "SRIMATHI.B", "PRINCE VICTOR.A", "MAHALAKSHMI.G", "UMA MAHESWARI.M", "YOGESH.K"],
  "2026-02-21": ["KARTHICK PANDIAN.M", "KABIL VISHWA.TM", "HARI PRASATH.G", "NAVANEETHA KRISHNAN.R", "ALLEN VICTOR.A", "HARSHITHAA SHREE.R", "KARTHIKEYAN.P", "DHARUNYA SHREE.G", "HIBSA FARITH.S.H", "DHAKSHANA.K", "ABISHEK.S", "HARSHINI.S.D", "SHARMILA.J", "HEMA VARSHINI.A", "HARSHINI.S"],
  "2026-02-24": ["BALAJI.N", "NITESH VARMAN.M", "MAHENDRAN.N.P", "HARICHARAN.S.P", "SAKTHI DIVASHKAR.M", "HARISH KARTHICK.R", "PADMASINDUJA.K", "LAKSHMI.L", "BOOPESH.K.V", "SENTHAMILSELVI.M", "KHAN MOHAMAD.S", "SWETHA ROSE.S", "VENKATAPRIYA.S", "YUVASRI.K", "SUJITHA.J.T"],
  "2026-02-25": ["PRIYADHARSHINI.K", "HARIHARAN.S", "YATHEESHWAR.B.R", "VIMAL.V.S", "RAHUL.P", "MOHAMADYUNUS.R", "ABISHEK MILTON.T", "DIVYESH SANKAR.N.K", "GOKUL.S", "YOGAHARANI.A", "MAGATHI.M", "SHRUTI.K", "LATHIKA.S", "DEVIPRIYA.T", "SANTHOSHKANNA.S"],
  "2026-02-26": ["MAHALAKSHMI.G", "UMA MAHESWARI.M", "YOGESH.K", "MATTHEW PAULS.A", "GURU VIGNESHWARAN.S", "BIRUNTHA.J", "PRADHIKSHA.M.P", "DINESH PANDI.R", "YAZHINI.M", "GAUTHAM.S", "SRIMATHI.B", "PRINCE VICTOR.A", "HARSHVARDHAN.S", "MOHAMAD SALMANKHAN.N", "DEEPIKASRI.R.K"],
  "2026-02-27": ["SHARMILA.J", "HEMA VARSHINI.A", "HARSHINI.S", "DHAKSHANA.K", "ABISHEK.S", "HARSHINI.S.D", "KARTHIKEYAN.P", "DHARUNYA SHREE.G", "HIBSA FARITH.S.H", "HARSHITHAA SHREE.R", "DEEPIKASRI.R.K", "GAUTHAM.S", "SANTHOSHKANNA.S", "PRINCE VICTOR.A", "HIBSA FARITH.S.H"]
};

let db: any;

async function startServer() {
  try {
    db = new Database("toastmasters.db");

    db.exec(`
      CREATE TABLE IF NOT EXISTS members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rollNo TEXT UNIQUE,
        name TEXT,
        attendance_order INTEGER,
        photo_url TEXT
      );

      CREATE TABLE IF NOT EXISTS schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        roleId TEXT,
        originalMemberId INTEGER,
        currentMemberId INTEGER,
        status TEXT DEFAULT 'scheduled',
        isSubstitution INTEGER DEFAULT 0,
        replacedById INTEGER,
        FOREIGN KEY(originalMemberId) REFERENCES members(id),
        FOREIGN KEY(currentMemberId) REFERENCES members(id),
        FOREIGN KEY(replacedById) REFERENCES members(id)
      );

      CREATE TABLE IF NOT EXISTS daily_icebreaker (
        date TEXT PRIMARY KEY,
        game_name TEXT
      );

      CREATE TABLE IF NOT EXISTS daily_theme (
        date TEXT PRIMARY KEY,
        theme TEXT
      );

      CREATE TABLE IF NOT EXISTS icebreaker_bank (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        description TEXT
      );

      CREATE TABLE IF NOT EXISTS holidays (
        date TEXT PRIMARY KEY,
        reason TEXT
      );

      CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        content TEXT,
        date TEXT,
        type TEXT DEFAULT 'info'
      );

      CREATE TABLE IF NOT EXISTS queries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        rollNo TEXT,
        message TEXT,
        date TEXT,
        status TEXT DEFAULT 'pending'
      );

      CREATE TABLE IF NOT EXISTS schedule_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operation_type TEXT,
        original_schedule TEXT,
        original_icebreakers TEXT,
        holiday_date TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed members
    try {
      db.prepare("DELETE FROM members").run();
      const insertMember = db.prepare("INSERT OR IGNORE INTO members (rollNo, name, attendance_order, photo_url) VALUES (?, ?, ?, ?)");
      membersList.forEach((m, i) => {
        const photoUrl = `https://picsum.photos/seed/${m.rollNo}/200/200`;
        insertMember.run(m.rollNo, m.name, i + 1, photoUrl);
      });
    } catch (e) { }

    // Seed announcements
    try {
      const count = db.prepare("SELECT count(*) as count FROM announcements").get() as { count: number };
      if (count.count === 0) {
        const insertAnnouncement = db.prepare("INSERT INTO announcements (title, content, date, type) VALUES (?, ?, ?, ?)");
        insertAnnouncement.run("Welcome to ECE_B Toastmasters", "We are excited to launch our new digital platform.", format(new Date(), "yyyy-MM-dd"), "info");
      }
    } catch (e) { }

    // Seed holidays
    try {
      db.prepare("DELETE FROM holidays").run();
      const holidays = [
        // March
        { date: "2026-03-01", reason: "Sunday" },
        { date: "2026-03-07", reason: "Annual Day" },
        { date: "2026-03-08", reason: "Hostel Day" },
        { date: "2026-03-12", reason: "Cycle Test I" },
        { date: "2026-03-13", reason: "Cycle Test I" },
        { date: "2026-03-14", reason: "Cycle Test I" },
        { date: "2026-03-15", reason: "Sunday" },
        { date: "2026-03-16", reason: "Cycle Test I" },
        { date: "2026-03-17", reason: "Cycle Test I" },
        { date: "2026-03-18", reason: "Cycle Test I" },
        { date: "2026-03-19", reason: "Telugu New Year" },
        { date: "2026-03-20", reason: "Additional Holiday" },
        { date: "2026-03-21", reason: "Ramzan" },
        { date: "2026-03-22", reason: "Sunday" },
        { date: "2026-03-28", reason: "Funtura' 26" },
        { date: "2026-03-29", reason: "Sunday" },
        // April
        { date: "2026-04-02", reason: "Parent Teachers Meeting" },
        { date: "2026-04-03", reason: "Good Friday" },
        { date: "2026-04-04", reason: "Holiday" },
        { date: "2026-04-05", reason: "Sunday" },
        { date: "2026-04-06", reason: "Panguni Pongal" },
        { date: "2026-04-07", reason: "Panguni Pongal" },
        { date: "2026-04-11", reason: "Sustainathon' 26" },
        { date: "2026-04-12", reason: "Sunday" },
        { date: "2026-04-14", reason: "Tamil New Year" },
        { date: "2026-04-18", reason: "Ethnic Day" },
        { date: "2026-04-19", reason: "Sunday" },
        { date: "2026-04-25", reason: "Seminar Day" },
        { date: "2026-04-26", reason: "Sunday" },
        { date: "2026-04-27", reason: "End Semester Feedback" },
        { date: "2026-04-30", reason: "Model Practical Examination" },
      ];
      const insertHoliday = db.prepare("INSERT OR IGNORE INTO holidays (date, reason) VALUES (?, ?)");
      holidays.forEach(h => insertHoliday.run(h.date, h.reason));
    } catch (e) { }

    // Seed icebreaker bank
    try {
      const count = db.prepare("SELECT count(*) as count FROM icebreaker_bank").get() as { count: number };
      if (count.count === 0) {
        const insertGame = db.prepare("INSERT INTO icebreaker_bank (name, description) VALUES (?, ?)");
        const defaultGames = [
          { name: 'Electric Pulse', description: 'A high-energy reaction game.' },
          { name: 'Guess the Name', description: 'Identify the member from clues.' },
          { name: 'Get the Signature', description: 'Networking and social bingo.' },
          { name: 'Enact the Word', description: 'Charades-style communication game.' }
        ];
        defaultGames.forEach(g => insertGame.run(g.name, g.description));
      }
    } catch (e) { }

    // Seed February schedule exactly from screenshot
    try {
      db.prepare("DELETE FROM schedule").run();
      const members = db.prepare("SELECT id, name, attendance_order FROM members").all() as any[];
      const insertSched = db.prepare("INSERT INTO schedule (date, roleId, originalMemberId, currentMemberId, status) VALUES (?, ?, ?, ?, 'completed')");

      const dates = Object.keys(FEB_SCHEDULE_DATA).sort();
      dates.forEach((date, dayIdx) => {
        const names = FEB_SCHEDULE_DATA[date];
        // Roles 0-14
        names.forEach((name, i) => {
          const member = members.find(m => m.name === name);
          if (member) {
            insertSched.run(date, ROLES_LIST[i], member.id, member.id);
          }
        });

        // Add Backups (Roles 15-17) using fixed batch rotation
        const firstMember = members.find(m => m.name === names[0]);
        let backupNames: string[] = [];
        if (firstMember) {
          const order = firstMember.attendance_order;
          // Batch 4 (1-15) -> Backup Batch 1
          if (order >= 1 && order <= 15) backupNames = ["HARICHARAN.S.P", "SAKTHI DIVASHKAR.M", "HARISH KARTHICK.R"];
          // Batch 1 (16-30) -> Backup Batch 2
          else if (order >= 16 && order <= 30) backupNames = ["VIMAL.V.S", "RAHUL.P", "MOHAMADYUNUS.R"];
          // Batch 2 (31-45) -> Backup Batch 3
          else if (order >= 31 && order <= 45) backupNames = ["MATTHEW PAULS.A", "GURU VIGNESHWARAN.S", "BIRUNTHA.J"];
          // Batch 3 (46-60) -> Backup Batch 4
          else if (order >= 46 && order <= 60) backupNames = ["NAVANEETHA KRISHNAN.R", "ALLEN VICTOR.A", "HARSHITHAA SHREE.R"];
        }

        backupNames.forEach((backupName, i) => {
          const backupMember = members.find(m => m.name === backupName);
          if (backupMember) {
            insertSched.run(date, ROLES_LIST[15 + i], backupMember.id, backupMember.id);
          }
        });
      });
    } catch (e) { }

  } catch (err) {
    console.error("Database initialization failed, using in-memory DB:", err);
    db = new Database(":memory:");
  }

  const app = express();
  app.use(express.json());

  app.get("/api/members", (req, res) => {
    try {
      const members = db.prepare("SELECT * FROM members ORDER BY attendance_order").all();
      res.json(members);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/schedule", (req, res) => {
    try {
      const schedule = db.prepare(`
        SELECT s.*, m1.name as originalMemberName, m2.name as currentMemberName, m3.name as replacedByName, di.game_name as icebreaker, dt.theme as theme
        FROM schedule s
        JOIN members m1 ON s.originalMemberId = m1.id
        JOIN members m2 ON s.currentMemberId = m2.id
        LEFT JOIN members m3 ON s.replacedById = m3.id
        LEFT JOIN daily_icebreaker di ON s.date = di.date
        LEFT JOIN daily_theme dt ON s.date = dt.date
        ORDER BY s.date, s.id
      `).all();
      res.json(schedule);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/theme", (req, res) => {
    try {
      const { date, theme } = req.body;
      db.prepare("INSERT OR REPLACE INTO daily_theme (date, theme) VALUES (?, ?)").run(date, theme);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/icebreaker", (req, res) => {
    try {
      const { date, gameName } = req.body;
      db.prepare("INSERT OR REPLACE INTO daily_icebreaker (date, game_name) VALUES (?, ?)").run(date, gameName);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/icebreaker-bank", (req, res) => {
    try {
      const games = db.prepare("SELECT * FROM icebreaker_bank ORDER BY name").all();
      res.json(games);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/icebreaker-bank", (req, res) => {
    try {
      const { name, description } = req.body;
      db.prepare("INSERT INTO icebreaker_bank (name, description) VALUES (?, ?)").run(name, description);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/icebreaker-bank/:id", (req, res) => {
    try {
      const { id } = req.params;
      db.prepare("DELETE FROM icebreaker_bank WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/announcements", (req, res) => {
    try {
      const announcements = db.prepare("SELECT * FROM announcements ORDER BY date DESC").all();
      res.json(announcements);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/queries", (req, res) => {
    try {
      const queries = db.prepare("SELECT * FROM queries ORDER BY date DESC").all();
      res.json(queries);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/queries", (req, res) => {
    try {
      const { name, rollNo, message } = req.body;
      db.prepare("INSERT INTO queries (name, rollNo, message, date) VALUES (?, ?, ?, ?)").run(name, rollNo, message, format(new Date(), "yyyy-MM-dd"));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/queries/resolve", (req, res) => {
    try {
      const { id } = req.body;
      db.prepare("UPDATE queries SET status = 'resolved' WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/shift-schedule", (req, res) => {
    try {
      const { startDate, reason } = req.body;

      // 1. Capture current state for undo
      const originalSchedule = db.prepare("SELECT * FROM schedule WHERE date >= ?").all(startDate);
      const originalIcebreakers = db.prepare("SELECT * FROM daily_icebreaker WHERE date >= ?").all(startDate);

      db.prepare("INSERT INTO schedule_history (operation_type, original_schedule, original_icebreakers, holiday_date) VALUES (?, ?, ?, ?)")
        .run('shift', JSON.stringify(originalSchedule), JSON.stringify(originalIcebreakers), startDate);

      // 2. Add to holidays
      db.prepare("INSERT OR IGNORE INTO holidays (date, reason) VALUES (?, ?)").run(startDate, reason || "Unexpected Holiday");

      // 3. Get all unique dates from schedule >= startDate in DESCENDING order
      const dates = db.prepare("SELECT DISTINCT date FROM schedule WHERE date >= ? ORDER BY date DESC").all(startDate) as { date: string }[];

      const holidayDates = db.prepare("SELECT date FROM holidays").all().map((h: any) => h.date);

      for (const d of dates) {
        let nextDate = addDays(parseISO(d.date), 1);
        while (isWeekend(nextDate) || holidayDates.includes(format(nextDate, "yyyy-MM-dd"))) {
          nextDate = addDays(nextDate, 1);
        }
        const nextDateStr = format(nextDate, "yyyy-MM-dd");

        // Update schedule
        db.prepare("UPDATE schedule SET date = ? WHERE date = ?").run(nextDateStr, d.date);
        // Update icebreakers
        db.prepare("UPDATE daily_icebreaker SET date = ? WHERE date = ?").run(nextDateStr, d.date);
      }

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/undo-shift", (req, res) => {
    try {
      const lastHistory = db.prepare("SELECT * FROM schedule_history ORDER BY id DESC LIMIT 1").get() as any;
      if (!lastHistory) return res.status(400).json({ error: "No history to undo" });

      const originalSchedule = JSON.parse(lastHistory.original_schedule);
      const originalIcebreakers = JSON.parse(lastHistory.original_icebreakers);
      const holidayDate = lastHistory.holiday_date;

      // Find the range of dates to clear
      // We clear everything from the holiday date onwards to be safe
      db.prepare("DELETE FROM schedule WHERE date >= ?").run(holidayDate);
      db.prepare("DELETE FROM daily_icebreaker WHERE date >= ?").run(holidayDate);
      db.prepare("DELETE FROM holidays WHERE date = ?").run(holidayDate);

      // Restore schedule
      const insertSched = db.prepare("INSERT INTO schedule (date, roleId, originalMemberId, currentMemberId, status, isSubstitution, replacedById) VALUES (?, ?, ?, ?, ?, ?, ?)");
      originalSchedule.forEach((e: any) => {
        insertSched.run(e.date, e.roleId, e.originalMemberId, e.currentMemberId, e.status, e.isSubstitution, e.replacedById);
      });

      // Restore icebreakers
      const insertIce = db.prepare("INSERT INTO daily_icebreaker (date, game_name) VALUES (?, ?)");
      originalIcebreakers.forEach((i: any) => {
        insertIce.run(i.date, i.game_name);
      });

      // Delete history entry
      db.prepare("DELETE FROM schedule_history WHERE id = ?").run(lastHistory.id);

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/has-undo", (req, res) => {
    try {
      const lastHistory = db.prepare("SELECT count(*) as count FROM schedule_history").get() as { count: number };
      res.json({ hasUndo: lastHistory.count > 0 });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/generate-schedule", (req, res) => {
    try {
      const { startDate } = req.body;
      let currentDate = parseISO(startDate);
      const members = db.prepare("SELECT id FROM members ORDER BY attendance_order").all();

      if (members.length === 0) {
        return res.status(400).json({ error: "No members found to generate schedule" });
      }

      const holidays = db.prepare("SELECT date FROM holidays").all().map((h: any) => h.date);

      // Determine the next day number
      const existingDays = db.prepare("SELECT DISTINCT date FROM schedule ORDER BY date").all();
      let dayCount = existingDays.length;

      const isStartOfMonth = currentDate.getDate() === 1;
      const daysToGenerate = isStartOfMonth ? 31 : 12;
      const targetMonth = currentDate.getMonth();

      for (let i = 0; i < daysToGenerate; i++) {
        if (isStartOfMonth && currentDate.getMonth() !== targetMonth) break;

        while (isWeekend(currentDate) || holidays.includes(format(currentDate, "yyyy-MM-dd"))) {
          currentDate = addDays(currentDate, 1);
          if (isStartOfMonth && currentDate.getMonth() !== targetMonth) break;
        }

        if (isStartOfMonth && currentDate.getMonth() !== targetMonth) break;

        const dateStr = format(currentDate, "yyyy-MM-dd");

        const exists = db.prepare("SELECT count(*) as count FROM schedule WHERE date = ?").get(dateStr) as { count: number };
        if (exists.count === 0) {
          // Batch and Cycle logic
          const batchIdx = dayCount % 4;
          const cycleIdx = Math.floor(dayCount / 4);

          // Permutations for the 5 sets of roles to avoid repetition
          const setPerms = [
            [0, 1, 2, 3, 4],
            [4, 3, 0, 2, 1],
            [1, 0, 3, 4, 2],
            [2, 4, 1, 0, 3],
            [3, 2, 4, 1, 0]
          ];

          const currentPerm = setPerms[cycleIdx % 5];
          const batchMembers = members.slice(batchIdx * 15, (batchIdx + 1) * 15);

          // If we don't have enough members in the last batch, just use linear rotation for safety
          if (batchMembers.length < 15) {
            ROLES_LIST.forEach((roleId, rIdx) => {
              const member = members[(dayCount * 15 + rIdx) % members.length];
              db.prepare("INSERT INTO schedule (date, roleId, originalMemberId, currentMemberId) VALUES (?, ?, ?, ?)").run(dateStr, roleId, member.id, member.id);
            });
          } else {
            const roleGroups = [
              [0, 1, 2],    // TMOD, GE, TTM
              [3, 4, 5],    // Timer, Ah Counter, Grammarian
              [6, 7, 8],    // Speakers
              [9, 10, 11],  // Evaluators
              [12, 13, 14]  // TT Speakers
            ];

            roleGroups.forEach((roleIndices, setIdx) => {
              const memberSetIdx = currentPerm[setIdx];
              roleIndices.forEach((roleIdx, i) => {
                const member = batchMembers[memberSetIdx * 3 + i];
                db.prepare("INSERT INTO schedule (date, roleId, originalMemberId, currentMemberId) VALUES (?, ?, ?, ?)").run(dateStr, ROLES_LIST[roleIdx], member.id, member.id);
              });
            });

            // Add Backups: First 3 members of the NEXT batch
            const nextBatchIdx = (batchIdx + 1) % 4;
            const nextBatchMembers = members.slice(nextBatchIdx * 15, (nextBatchIdx + 1) * 15);
            for (let i = 0; i < 3; i++) {
              const backupMember = nextBatchMembers[i];
              db.prepare("INSERT INTO schedule (date, roleId, originalMemberId, currentMemberId) VALUES (?, ?, ?, ?)").run(dateStr, ROLES_LIST[15 + i], backupMember.id, backupMember.id);
            }
          }
          dayCount++;
        }

        currentDate = addDays(currentDate, 1);
      }

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/mark-absent", (req, res) => {
    try {
      const { scheduleId } = req.body;
      const entry = db.prepare("SELECT * FROM schedule WHERE id = ?").get(scheduleId) as any;
      if (!entry) return res.status(404).json({ error: "Entry not found" });

      const today = new Date().toISOString().split('T')[0];
      if (entry.date < today) {
        return res.status(400).json({ error: "Cannot modify past attendance" });
      }

      // If the role being marked absent is already a backup role, just mark it absent
      if (entry.roleId.startsWith('BACKUP_')) {
        db.prepare("UPDATE schedule SET status = 'absent' WHERE id = ?").run(scheduleId);
        return res.json({ success: true });
      }

      // Find available backups for this date in order (BACKUP_1, BACKUP_2, BACKUP_3)
      const backups = db.prepare("SELECT * FROM schedule WHERE date = ? AND roleId IN ('BACKUP_1', 'BACKUP_2', 'BACKUP_3') ORDER BY roleId ASC").all(entry.date) as any[];

      let availableBackup = null;
      for (const b of backups) {
        // A backup is available if their status is not 'absent'
        if (b.status !== 'absent') {
          availableBackup = b;
          break;
        }
      }

      const defaultStatus = entry.date < today ? 'completed' : 'scheduled';

      if (availableBackup) {
        const backupMemberId = availableBackup.originalMemberId;
        const absenteeMemberId = entry.originalMemberId;

        // 1. Assign backup to this role for today
        db.prepare("UPDATE schedule SET currentMemberId = ?, isSubstitution = 1, replacedById = ?, status = ? WHERE id = ?")
          .run(backupMemberId, absenteeMemberId, defaultStatus, scheduleId);

        // 2. Mark the backup's own placeholder slot as 'absent' so they aren't picked again today
        db.prepare("UPDATE schedule SET status = 'absent' WHERE id = ?").run(availableBackup.id);

        // 3. Implement "Swap and Shift": Absentee takes the backup's role on the NEXT meeting day
        const nextMeeting = db.prepare("SELECT date FROM schedule WHERE date > ? ORDER BY date ASC LIMIT 1").get(entry.date) as { date: string };
        if (nextMeeting) {
          const backupNextRole = db.prepare("SELECT id FROM schedule WHERE date = ? AND originalMemberId = ?").get(nextMeeting.date, backupMemberId) as { id: number };
          if (backupNextRole) {
            db.prepare("UPDATE schedule SET currentMemberId = ?, isSubstitution = 1, replacedById = ? WHERE id = ?")
              .run(absenteeMemberId, backupMemberId, backupNextRole.id);
          }
        }
      } else {
        // If no backup found, the role remains vacant/absent.
        db.prepare("UPDATE schedule SET status = 'absent' WHERE id = ?").run(scheduleId);
      }

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/delete-month-schedule", (req, res) => {
    try {
      const { month, year } = req.body;
      if (!month || !year) return res.status(400).json({ error: "Month and Year are required" });

      const monthStr = month.toString().padStart(2, '0');
      const datePattern = `${year}-${monthStr}-%`;

      // We only delete scheduled entries, not completed ones to preserve history
      db.prepare("DELETE FROM schedule WHERE date LIKE ? AND status = 'scheduled'").run(datePattern);
      db.prepare("DELETE FROM daily_icebreaker WHERE date LIKE ?").run(datePattern);
      db.prepare("DELETE FROM daily_theme WHERE date LIKE ?").run(datePattern);

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/mark-present", (req, res) => {
    try {
      const { scheduleId } = req.body;
      const entry = db.prepare("SELECT * FROM schedule WHERE id = ?").get(scheduleId) as any;
      if (!entry) return res.status(404).json({ error: "Entry not found" });

      const today = new Date().toISOString().split('T')[0];
      if (entry.date < today) {
        return res.status(400).json({ error: "Cannot modify past attendance" });
      }

      const newStatus = entry.date < today ? 'completed' : 'scheduled';

      // If this role was being filled by a substitute, revert the "Swap and Shift"
      if (entry.isSubstitution) {
        const backupMemberId = entry.currentMemberId;
        const absenteeMemberId = entry.originalMemberId;

        // 1. Find the backup's placeholder on today and restore it
        const backupPlaceholder = db.prepare("SELECT id FROM schedule WHERE date = ? AND originalMemberId = ? AND roleId LIKE 'BACKUP_%'").get(entry.date, backupMemberId) as any;
        if (backupPlaceholder) {
          db.prepare("UPDATE schedule SET status = ? WHERE id = ?").run(newStatus, backupPlaceholder.id);
        }

        // 2. Revert the absentee's role on the next day back to the backup
        const nextMeeting = db.prepare("SELECT date FROM schedule WHERE date > ? ORDER BY date ASC LIMIT 1").get(entry.date) as { date: string };
        if (nextMeeting) {
          db.prepare("UPDATE schedule SET currentMemberId = originalMemberId, isSubstitution = 0, replacedById = NULL WHERE date = ? AND originalMemberId = ?")
            .run(nextMeeting.date, backupMemberId);
        }
      }

      // Revert today's role to original member
      db.prepare("UPDATE schedule SET currentMemberId = originalMemberId, isSubstitution = 0, replacedById = NULL, status = ? WHERE id = ?")
        .run(newStatus, scheduleId);

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/update-schedule", (req, res) => {
    try {
      const { scheduleId, memberId } = req.body;
      db.prepare("UPDATE schedule SET currentMemberId = ?, isSubstitution = 1, replacedById = ? WHERE id = ?").run(memberId, memberId, scheduleId);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => console.error(err));
