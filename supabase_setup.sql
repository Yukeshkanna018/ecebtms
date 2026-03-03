-- Create tables for Toastmasters Scheduler

-- 1. Members Table
CREATE TABLE IF NOT EXISTS members (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    roll_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    attendance_order INTEGER,
    photo_url TEXT
);

-- 2. Schedule Table
CREATE TABLE IF NOT EXISTS schedule (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    date DATE NOT NULL,
    role_id TEXT NOT NULL,
    original_member_id BIGINT REFERENCES members(id),
    current_member_id BIGINT REFERENCES members(id),
    status TEXT DEFAULT 'scheduled',
    is_substitution BOOLEAN DEFAULT FALSE,
    replaced_by_id BIGINT REFERENCES members(id)
);

-- 3. Daily Icebreaker
CREATE TABLE IF NOT EXISTS daily_icebreaker (
    date DATE PRIMARY KEY,
    game_name TEXT NOT NULL
);

-- 4. Daily Theme
CREATE TABLE IF NOT EXISTS daily_theme (
    date DATE PRIMARY KEY,
    theme TEXT NOT NULL
);

-- 5. Icebreaker Bank
CREATE TABLE IF NOT EXISTS icebreaker_bank (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT UNIQUE NOT NULL,
    description TEXT
);

-- 6. Holidays
CREATE TABLE IF NOT EXISTS holidays (
    date DATE PRIMARY KEY,
    reason TEXT
);

-- 7. Announcements
CREATE TABLE IF NOT EXISTS announcements (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title TEXT NOT NULL,
    content TEXT,
    date DATE DEFAULT CURRENT_DATE,
    type TEXT DEFAULT 'info'
);

-- 8. Queries (from contact form)
CREATE TABLE IF NOT EXISTS queries (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT,
    roll_no TEXT,
    message TEXT,
    date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pending'
);

-- 9. Schedule History (for undo)
CREATE TABLE IF NOT EXISTS schedule_history (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    operation_type TEXT,
    original_schedule JSONB,
    original_icebreakers JSONB,
    holiday_date DATE,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_icebreaker ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_theme ENABLE ROW LEVEL SECURITY;
ALTER TABLE icebreaker_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_history ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (Simplified for demo, adjust for production)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access' AND tablename = 'members') THEN
        CREATE POLICY "Public Read Access" ON members FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access' AND tablename = 'schedule') THEN
        CREATE POLICY "Public Read Access" ON schedule FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access' AND tablename = 'daily_icebreaker') THEN
        CREATE POLICY "Public Read Access" ON daily_icebreaker FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access' AND tablename = 'daily_theme') THEN
        CREATE POLICY "Public Read Access" ON daily_theme FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access' AND tablename = 'icebreaker_bank') THEN
        CREATE POLICY "Public Read Access" ON icebreaker_bank FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access' AND tablename = 'holidays') THEN
        CREATE POLICY "Public Read Access" ON holidays FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access' AND tablename = 'announcements') THEN
        CREATE POLICY "Public Read Access" ON announcements FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Read Access' AND tablename = 'queries') THEN
        CREATE POLICY "Public Read Access" ON queries FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Insert Access' AND tablename = 'queries') THEN
        CREATE POLICY "Public Insert Access" ON queries FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Admin Access' AND tablename = 'members') THEN
        CREATE POLICY "Public Admin Access" ON members FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Admin Access' AND tablename = 'schedule') THEN
        CREATE POLICY "Public Admin Access" ON schedule FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Admin Access' AND tablename = 'daily_icebreaker') THEN
        CREATE POLICY "Public Admin Access" ON daily_icebreaker FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Admin Access' AND tablename = 'daily_theme') THEN
        CREATE POLICY "Public Admin Access" ON daily_theme FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Admin Access' AND tablename = 'icebreaker_bank') THEN
        CREATE POLICY "Public Admin Access" ON icebreaker_bank FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Admin Access' AND tablename = 'holidays') THEN
        CREATE POLICY "Public Admin Access" ON holidays FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Admin Access' AND tablename = 'announcements') THEN
        CREATE POLICY "Public Admin Access" ON announcements FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Admin Access' AND tablename = 'queries') THEN
        CREATE POLICY "Public Admin Access" ON queries FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public Admin Access' AND tablename = 'schedule_history') THEN
        CREATE POLICY "Public Admin Access" ON schedule_history FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 10. Seed Members
INSERT INTO members (roll_no, name, attendance_order, photo_url) VALUES 
('25UEC002', 'NAVANEETHA KRISHNAN.R', 1, 'https://picsum.photos/seed/25UEC002/200/200'),
('25UEC004', 'ALLEN VICTOR.A', 2, 'https://picsum.photos/seed/25UEC004/200/200'),
('25UEC006', 'HARSHITHAA SHREE.R', 3, 'https://picsum.photos/seed/25UEC006/200/200'),
('25UEC008', 'KARTHICK PANDIAN.M', 4, 'https://picsum.photos/seed/25UEC008/200/200'),
('25UEC010', 'KABIL VISHWA.TM', 5, 'https://picsum.photos/seed/25UEC010/200/200'),
('25UEC012', 'HARI PRASATH.G', 6, 'https://picsum.photos/seed/25UEC012/200/200'),
('25UEC014', 'SHARMILA.J', 7, 'https://picsum.photos/seed/25UEC014/200/200'),
('25UEC016', 'HEMA VARSHINI.A', 8, 'https://picsum.photos/seed/25UEC016/200/200'),
('25UEC018', 'HARSHINI.S', 9, 'https://picsum.photos/seed/25UEC018/200/200'),
('25UEC020', 'KARTHIKEYAN.P', 10, 'https://picsum.photos/seed/25UEC020/200/200'),
('25UEC022', 'DHARUNYA SHREE.G', 11, 'https://picsum.photos/seed/25UEC022/200/200'),
('25UEC023', 'HIBSA FARITH.S.H', 12, 'https://picsum.photos/seed/25UEC023/200/200'),
('25UEC024', 'DHAKSHANA.K', 13, 'https://picsum.photos/seed/25UEC024/200/200'),
('25UEC026', 'ABISHEK.S', 14, 'https://picsum.photos/seed/25UEC026/200/200'),
('25UEC028', 'HARSHINI.S.D', 15, 'https://picsum.photos/seed/25UEC028/200/200'),
('25UEC030', 'HARICHARAN.S.P', 16, 'https://picsum.photos/seed/25UEC030/200/200'),
('25UEC032', 'SAKTHI DIVASHKAR.M', 17, 'https://picsum.photos/seed/25UEC032/200/200'),
('25UEC036', 'HARISH KARTHICK.R', 18, 'https://picsum.photos/seed/25UEC036/200/200'),
('25UEC038', 'BALAJI.N', 19, 'https://picsum.photos/seed/25UEC038/200/200'),
('25UEC040', 'NITESH VARMAN.M', 20, 'https://picsum.photos/seed/25UEC040/200/200'),
('25UEC042', 'MAHENDRAN.N.P', 21, 'https://picsum.photos/seed/25UEC042/200/200'),
('25UEC044', 'VENKATAPRIYA.S', 22, 'https://picsum.photos/seed/25UEC044/200/200'),
('25UEC046', 'YUVASRI.K', 23, 'https://picsum.photos/seed/25UEC046/200/200'),
('25UEC048', 'SUJITHA.J.T', 24, 'https://picsum.photos/seed/25UEC048/200/200'),
('25UEC050', 'PADMASINDUJA.K', 25, 'https://picsum.photos/seed/25UEC050/200/200'),
('25UEC051', 'LAKSHMI.L', 26, 'https://picsum.photos/seed/25UEC051/200/200'),
('25UEC052', 'BOOPESH.K.V', 27, 'https://picsum.photos/seed/25UEC052/200/200'),
('25UEC054', 'SENTHAMILSELVI.M', 28, 'https://picsum.photos/seed/25UEC054/200/200'),
('25UEC056', 'KHAN MOHAMAD.S', 29, 'https://picsum.photos/seed/25UEC056/200/200'),
('25UEC057', 'SWETHA ROSE.S', 30, 'https://picsum.photos/seed/25UEC057/200/200'),
('25UEC058', 'VIMAL.V.S', 31, 'https://picsum.photos/seed/25UEC058/200/200'),
('25UEC059', 'RAHUL.P', 32, 'https://picsum.photos/seed/25UEC059/200/200'),
('25UEC062', 'MOHAMADYUNUS.R', 33, 'https://picsum.photos/seed/25UEC062/200/200'),
('25UEC064', 'PRIYADHARSHINI.K', 34, 'https://picsum.photos/seed/25UEC064/200/200'),
('25UEC066', 'HARIHARAN.S', 35, 'https://picsum.photos/seed/25UEC066/200/200'),
('25UEC067', 'YETHEESHWAR.B.R', 36, 'https://picsum.photos/seed/25UEC067/200/200'),
('25UEC068', 'LATHIKA.S', 37, 'https://picsum.photos/seed/25UEC068/200/200'),
('25UEC069', 'DEVIPRIYA.T', 38, 'https://picsum.photos/seed/25UEC069/200/200'),
('25UEC074', 'SANTHOSHKANNA.S', 39, 'https://picsum.photos/seed/25UEC074/200/200'),
('25UEC075', 'ABISHEK MILTON.T', 40, 'https://picsum.photos/seed/25UEC075/200/200'),
('25UEC076', 'DIVYESH SANKAR.N.K', 41, 'https://picsum.photos/seed/25UEC076/200/200'),
('25UEC082', 'GOKUL.S', 42, 'https://picsum.photos/seed/25UEC082/200/200'),
('25UEC083', 'YOGAHARANI.A', 43, 'https://picsum.photos/seed/25UEC083/200/200'),
('25UEC085', 'MAGATHI.M', 44, 'https://picsum.photos/seed/25UEC085/200/200'),
('25UEC086', 'SHRUTI.K', 45, 'https://picsum.photos/seed/25UEC086/200/200'),
('25UEC089', 'MATTHEW PAULS.A', 46, 'https://picsum.photos/seed/25UEC089/200/200'),
('25UEC092', 'GURU VIGNESHWARAN.S', 47, 'https://picsum.photos/seed/25UEC092/200/200'),
('25UEC096', 'BRINTHA.J', 48, 'https://picsum.photos/seed/25UEC096/200/200'),
('25UEC102', 'MAHALAKSHMI.G', 49, 'https://picsum.photos/seed/25UEC102/200/200'),
('25UEC103', 'UMA MAHESWARI.M', 50, 'https://picsum.photos/seed/25UEC103/200/200'),
('25UEC107', 'YOGESH.K', 51, 'https://picsum.photos/seed/25UEC107/200/200'),
('25UEC108', 'GAUTHAM.S', 52, 'https://picsum.photos/seed/25UEC108/200/200'),
('25UEC109', 'SRIMATHI.B', 53, 'https://picsum.photos/seed/25UEC109/200/200'),
('25UEC110', 'PRINCE VICTOR.A', 54, 'https://picsum.photos/seed/25UEC110/200/200'),
('25UEC111', 'PRADHIKSHA.M.P', 55, 'https://picsum.photos/seed/25UEC111/200/200'),
('25UEC113', 'DINESH PANDI.R', 56, 'https://picsum.photos/seed/25UEC113/200/200'),
('25UEC115', 'YAZHINI.M', 57, 'https://picsum.photos/seed/25UEC115/200/200'),
('25UEC116', 'HARSHVARDHAN.S', 58, 'https://picsum.photos/seed/25UEC116/200/200'),
('25UEC117', 'MOHAMAD SALMANKHAN.N', 59, 'https://picsum.photos/seed/25UEC117/200/200'),
('25UEC120', 'DEEPIKASRI.R.K', 60, 'https://picsum.photos/seed/25UEC120/200/200')
ON CONFLICT (roll_no) DO NOTHING;

-- Seed Holidays
INSERT INTO holidays (date, reason) VALUES 
('2026-03-01', 'Sunday'),
('2026-03-07', 'Annual Day'),
('2026-03-08', 'Hostel Day'),
('2026-03-12', 'Cycle Test I'),
('2026-03-13', 'Cycle Test I'),
('2026-03-14', 'Cycle Test I'),
('2026-03-15', 'Sunday'),
('2026-03-16', 'Cycle Test I'),
('2026-03-17', 'Cycle Test I'),
('2026-03-18', 'Cycle Test I'),
('2026-03-19', 'Telugu New Year'),
('2026-03-20', 'Additional Holiday'),
('2026-03-21', 'Ramzan'),
('2026-03-22', 'Sunday'),
('2026-03-28', 'Funtura 26'),
('2026-03-29', 'Sunday'),
('2026-04-02', 'Parent Teachers Meeting'),
('2026-04-03', 'Good Friday'),
('2026-04-04', 'Holiday'),
('2026-04-05', 'Sunday'),
('2026-04-06', 'Panguni Pongal'),
('2026-04-07', 'Panguni Pongal'),
('2026-04-11', 'Sustainathon 26'),
('2026-04-12', 'Sunday'),
('2026-04-14', 'Tamil New Year'),
('2026-04-18', 'Ethnic Day'),
('2026-04-19', 'Sunday'),
('2026-04-25', 'Seminar Day'),
('2026-04-26', 'Sunday'),
('2026-04-27', 'End Semester Feedback'),
('2026-04-30', 'Model Practical Examination')
ON CONFLICT (date) DO NOTHING;

-- Seed Icebreaker Bank
INSERT INTO icebreaker_bank (name, description) VALUES 
('Electric Pulse', 'A high-energy reaction game.'),
('Guess the Name', 'Identify the member from clues.'),
('Get the Signature', 'Networking and social bingo.'),
('Enact the Word', 'Charades-style communication game.')
ON CONFLICT (name) DO NOTHING;

-- 11. Initial Announcements
INSERT INTO announcements (title, content, date, type) VALUES 
('Welcome to ECE_B Toastmasters', 'We are excited to launch our new digital platform.', CURRENT_DATE, 'info')
ON CONFLICT DO NOTHING;
