
PRAGMA foreign_keys=ON;

--

CREATE TABLE classrooms (
    classroom_id integer NOT NULL PRIMARY KEY,
    facility_id integer,
    room_number TEXT,
    capacity integer
);



CREATE TABLE facilities (
    facility_id integer NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT
);



CREATE TABLE facility_bookings (
    booking_id integer NOT NULL PRIMARY KEY,
    facility_id integer,
    booked_by integer,
    TEXT TEXT,
    start_time TEXT without TEXT zone,
    end_time TEXT without TEXT zone,
    booking_action TEXT
);

--
-- Name: facility_bookings_booking_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--
--
-- Name: facility_bookings_booking_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--
--
-- Name: facility_staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE facility_staff (
    staff_id integer NOT NULL PRIMARY KEY,
    full_name TEXT NOT NULL,
    role TEXT
);

--
-- Name: facility_staff_staff_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--
--
-- Name: facility_staff_staff_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--
--
-- Name: staff_a_bookings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW staff_a_bookings AS
 SELECT facility_bookings.booking_id,
    facility_bookings.facility_id,
    facility_bookings.booked_by,
    facility_bookings.TEXT,
    facility_bookings.start_time,
    facility_bookings.end_time,
    facility_bookings.booking_action
   FROM facility_bookings
  WHERE ((facility_bookings.facility_id >= 1) AND (facility_bookings.facility_id <= 4));

--
-- Name: staff_b_bookings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW staff_b_bookings AS
 SELECT facility_bookings.booking_id,
    facility_bookings.facility_id,
    facility_bookings.booked_by,
    facility_bookings.TEXT,
    facility_bookings.start_time,
    facility_bookings.end_time,
    facility_bookings.booking_action
   FROM facility_bookings
  WHERE (facility_bookings.facility_id = 5);

--
-- Name: staff_c_bookings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW staff_c_bookings AS
 SELECT facility_bookings.booking_id,
    facility_bookings.facility_id,
    facility_bookings.booked_by,
    facility_bookings.TEXT,
    facility_bookings.start_time,
    facility_bookings.end_time,
    facility_bookings.booking_action
   FROM facility_bookings
  WHERE (facility_bookings.facility_id = 6);

--
-- Name: staff_d_bookings; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW staff_d_bookings AS
 SELECT facility_bookings.booking_id,
    facility_bookings.facility_id,
    facility_bookings.booked_by,
    facility_bookings.TEXT,
    facility_bookings.start_time,
    facility_bookings.end_time,
    facility_bookings.booking_action
   FROM facility_bookings
  WHERE (facility_bookings.facility_id = 7);

--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE students (
    student_id integer NOT NULL PRIMARY KEY,
    full_name TEXT NOT NULL,
    age integer,
    class_name TEXT
);

--
-- Name: students_student_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--
--
-- Name: students_student_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--
--
-- Name: teachers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE teachers (
    teacher_id integer NOT NULL PRIMARY KEY,
    full_name TEXT NOT NULL,
    subject TEXT
);

--
-- Name: teachers_teacher_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--
--
-- Name: teachers_teacher_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--
--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE users (
    user_id integer NOT NULL PRIMARY KEY,
    username TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    initial_password text
);

--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--
--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--
--
-- Name: classrooms classroom_id; Type: DEFAULT; Schema: public; Owner: -
--
--
-- Name: facilities facility_id; Type: DEFAULT; Schema: public; Owner: -
--
--
-- Name: facility_bookings booking_id; Type: DEFAULT; Schema: public; Owner: -
--
--
-- Name: facility_staff staff_id; Type: DEFAULT; Schema: public; Owner: -
--
--
-- Name: students student_id; Type: DEFAULT; Schema: public; Owner: -
--
--
-- Name: teachers teacher_id; Type: DEFAULT; Schema: public; Owner: -
--
--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: -
--
--
-- Data for Name: classrooms; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO classrooms (classroom_id, facility_id, room_number, capacity) VALUES (1, 1, 'CR101', 30);
INSERT INTO classrooms (classroom_id, facility_id, room_number, capacity) VALUES (2, 2, 'CR102', 30);
INSERT INTO classrooms (classroom_id, facility_id, room_number, capacity) VALUES (3, 3, 'CR103', 30);
INSERT INTO classrooms (classroom_id, facility_id, room_number, capacity) VALUES (4, 4, 'CR104', 30);

--
-- Data for Name: facilities; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO facilities (facility_id, name, type) VALUES (1, 'Classroom 1', 'Classroom');
INSERT INTO facilities (facility_id, name, type) VALUES (2, 'Classroom 2', 'Classroom');
INSERT INTO facilities (facility_id, name, type) VALUES (3, 'Classroom 3', 'Classroom');
INSERT INTO facilities (facility_id, name, type) VALUES (4, 'Classroom 4', 'Classroom');
INSERT INTO facilities (facility_id, name, type) VALUES (5, 'Badminton Court', 'Court');
INSERT INTO facilities (facility_id, name, type) VALUES (6, 'Swimming Pool', 'Pool');
INSERT INTO facilities (facility_id, name, type) VALUES (7, 'Gym', 'Gym');

--
-- Data for Name: facility_bookings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO facility_bookings (booking_id, facility_id, booked_by, TEXT, start_time, end_time, booking_action) VALUES (1, 5, 115, '2025-08-06', '09:00:00', '10:00:00', 'Add');
INSERT INTO facility_bookings (booking_id, facility_id, booked_by, TEXT, start_time, end_time, booking_action) VALUES (2, 5, 116, '2025-08-09', '15:00:00', '16:00:00', 'Add');

--
-- Data for Name: facility_staff; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO facility_staff (staff_id, full_name, role) VALUES (1, 'Staff A', 'Administrator');
INSERT INTO facility_staff (staff_id, full_name, role) VALUES (2, 'Staff B', 'Coordinator');
INSERT INTO facility_staff (staff_id, full_name, role) VALUES (3, 'Staff C', 'Operator');
INSERT INTO facility_staff (staff_id, full_name, role) VALUES (4, 'Staff D', 'Supervisor');

--
-- Data for Name: students; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO students (student_id, full_name, age, class_name) VALUES (1, 'Student 1', 7, 'Class A');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (2, 'Student 2', 8, 'Class B');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (3, 'Student 3', 9, 'Class C');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (4, 'Student 4', 10, 'Class D');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (5, 'Student 5', 11, 'Class ');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (6, 'Student 6', 6, 'Class F');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (7, 'Student 7', 7, 'Class A');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (8, 'Student 8', 8, 'Class B');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (9, 'Student 9', 9, 'Class C');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (10, 'Student 10', 10, 'Class D');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (11, 'Student 11', 11, 'Class ');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (12, 'Student 12', 6, 'Class F');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (13, 'Student 13', 7, 'Class A');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (14, 'Student 14', 8, 'Class B');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (15, 'Student 15', 9, 'Class C');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (16, 'Student 16', 10, 'Class D');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (17, 'Student 17', 11, 'Class ');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (18, 'Student 18', 6, 'Class F');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (19, 'Student 19', 7, 'Class A');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (20, 'Student 20', 8, 'Class B');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (21, 'Student 21', 9, 'Class C');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (22, 'Student 22', 10, 'Class D');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (23, 'Student 23', 11, 'Class ');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (24, 'Student 24', 6, 'Class F');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (25, 'Student 25', 7, 'Class A');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (26, 'Student 26', 8, 'Class B');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (27, 'Student 27', 9, 'Class C');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (28, 'Student 28', 10, 'Class D');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (29, 'Student 29', 11, 'Class ');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (30, 'Student 30', 6, 'Class F');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (31, 'Student 31', 7, 'Class A');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (32, 'Student 32', 8, 'Class B');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (33, 'Student 33', 9, 'Class C');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (34, 'Student 34', 10, 'Class D');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (35, 'Student 35', 11, 'Class ');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (36, 'Student 36', 6, 'Class F');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (37, 'Student 37', 7, 'Class A');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (38, 'Student 38', 8, 'Class B');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (39, 'Student 39', 9, 'Class C');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (40, 'Student 40', 10, 'Class D');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (41, 'Student 41', 11, 'Class ');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (42, 'Student 42', 6, 'Class F');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (43, 'Student 43', 7, 'Class A');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (44, 'Student 44', 8, 'Class B');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (45, 'Student 45', 9, 'Class C');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (46, 'Student 46', 10, 'Class D');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (47, 'Student 47', 11, 'Class ');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (48, 'Student 48', 6, 'Class F');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (49, 'Student 49', 7, 'Class A');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (50, 'Student 50', 8, 'Class B');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (51, 'Student 51', 9, 'Class C');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (52, 'Student 52', 10, 'Class D');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (53, 'Student 53', 11, 'Class ');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (54, 'Student 54', 6, 'Class F');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (55, 'Student 55', 7, 'Class A');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (56, 'Student 56', 8, 'Class B');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (57, 'Student 57', 9, 'Class C');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (58, 'Student 58', 10, 'Class D');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (59, 'Student 59', 11, 'Class ');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (60, 'Student 60', 6, 'Class F');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (61, 'Student 61', 7, 'Class A');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (62, 'Student 62', 8, 'Class B');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (63, 'Student 63', 9, 'Class C');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (64, 'Student 64', 10, 'Class D');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (65, 'Student 65', 11, 'Class ');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (66, 'Student 66', 6, 'Class F');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (67, 'Student 67', 7, 'Class A');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (68, 'Student 68', 8, 'Class B');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (69, 'Student 69', 9, 'Class C');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (70, 'Student 70', 10, 'Class D');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (71, 'Student 71', 11, 'Class ');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (72, 'Student 72', 6, 'Class F');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (73, 'Student 73', 7, 'Class A');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (74, 'Student 74', 8, 'Class B');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (75, 'Student 75', 9, 'Class C');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (76, 'Student 76', 10, 'Class D');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (77, 'Student 77', 11, 'Class ');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (78, 'Student 78', 6, 'Class F');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (79, 'Student 79', 7, 'Class A');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (80, 'Student 80', 8, 'Class B');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (81, 'Student 81', 9, 'Class C');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (82, 'Student 82', 10, 'Class D');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (83, 'Student 83', 11, 'Class ');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (84, 'Student 84', 6, 'Class F');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (85, 'Student 85', 7, 'Class A');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (86, 'Student 86', 8, 'Class B');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (87, 'Student 87', 9, 'Class C');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (88, 'Student 88', 10, 'Class D');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (89, 'Student 89', 11, 'Class ');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (90, 'Student 90', 6, 'Class F');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (91, 'Student 91', 7, 'Class A');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (92, 'Student 92', 8, 'Class B');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (93, 'Student 93', 9, 'Class C');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (94, 'Student 94', 10, 'Class D');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (95, 'Student 95', 11, 'Class ');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (96, 'Student 96', 6, 'Class F');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (97, 'Student 97', 7, 'Class A');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (98, 'Student 98', 8, 'Class B');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (99, 'Student 99', 9, 'Class C');
INSERT INTO students (student_id, full_name, age, class_name) VALUES (100, 'Student 100', 10, 'Class D');

--
-- Data for Name: teachers; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO teachers (teacher_id, full_name, subject) VALUES (1, 'Teacher 1', 'Subject 1');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (2, 'Teacher 2', 'Subject 2');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (3, 'Teacher 3', 'Subject 3');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (4, 'Teacher 4', 'Subject 4');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (5, 'Teacher 5', 'Subject 5');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (6, 'Teacher 6', 'Subject 1');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (7, 'Teacher 7', 'Subject 2');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (8, 'Teacher 8', 'Subject 3');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (9, 'Teacher 9', 'Subject 4');
INSERT INTO teachers (teacher_id, full_name, subject) VALUES (10, 'Teacher 10', 'Subject 5');

--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO users (user_id, username, password, role, initial_password) VALUES (1, 'student001', 'scrypt:32768:8:1$gUb4AU1TzAXmqxtV$b260a0f34726f26ef2d8f87d6d0219dc995467957f266e7d7767a55752a50931f737e6e10129e358fb75dfd70ef1b8638908c4568e0727a261750f5605857193', 'student', '001');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (2, 'student002', 'scrypt:32768:8:1$IiorllzIR7J8hpif$db2d0315c4ca4c144a5239845e5527a8d6d3f4cba5f7e8a0ea8f279808db9e065891ab3c7bb4da99dc8f1e905dd6d520c72e36c8f2ed8d9239089a1cba5116a8', 'student', '002');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (32, 'student032', 'scrypt:32768:8:1$pB2zewN3s9blnkve$c56ba7443b3de64971960b37fdf7b7265469f00497021e878fab8bf07cb285f6b309e1d98f173d13f09f4435bc215477dc4852a342894a7464a2ef2b606c33a6', 'student', '032');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (33, 'student033', 'scrypt:32768:8:1$F2ZvuQkSyG4YmgXS$e7d49acc95998544d033e2d45c08612bca1f0861618c09ca5b71d9cf5a8b9510e8e1ea64e2a927d18193a796a49fe93576c7f5b6815a3c34d419062d5099cbae', 'student', '033');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (34, 'student034', 'scrypt:32768:8:1$7K87CjPMAEPDNvai$02f064b4e39b986d3b31bac0857706f190d262c203e8d280d55575891424a0c8c01080b84f26a95bc66c5789cb819db9d9feb09149bce11cc58bc83729fe812c', 'student', '034');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (35, 'student035', 'scrypt:32768:8:1$h9fhGj1OKfSSXuHb$1a0106fedad23e51b21f4b83ffd30f8f551e30d0e9d8b2f111010c8e8f53c3b82d4d3e8fa7555e32a9bc44dbbe1f740a40d1ec5c94ef0b284f0d7fd0c1b0e8c6', 'student', '035');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (36, 'student036', 'scrypt:32768:8:1$kNsxaINLCBCwU5Fh$c89509f9ef4271c4e49d43562c49cdc340003c0ebcea77f9993b004cd28fa153d921612646fcb600b4a30182bd30494a92c9dcd58f50a36475718fff8cc800b0', 'student', '036');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (37, 'student037', 'scrypt:32768:8:1$sZJelH1Mz5sHOr7W$0754e8818545cd6dbb192292d5b8ce98b0a70bfc785e4b25e62aeb6f6a4343e49a11016fc21ca72bcc6b8a223edafbdac77a99110bfb33b0c4c989231e4c5f54', 'student', '037');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (38, 'student038', 'scrypt:32768:8:1$lFjjrEhU5Fvh0RwH$ae2fb6224c34a71f45c5c4e1b38992e3b185c98c5b9b7c535738e44d961be4df37a7e0a683eb2318ff873578efcd8ce5b750c48b368e2e1d1f6661c37b2e6e78', 'student', '038');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (39, 'student039', 'scrypt:32768:8:1$rKyClieq4gOCw5tn$eb216fa6062f28812ea7139f68f8ebbfda527835637dd3523da310d176a26d0cf3fadba4735677fe472a0d15d15584c7095e094993a5231849e47937cd9d31c5', 'student', '039');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (40, 'student040', 'scrypt:32768:8:1$kaidRTqdnCzudN1l$b102ae3a8c7492a50cb09caaedf0933cd54effa7b2a992b7f16c660ae5de81cc8218142c5577b4b6dd8f7abb1e97486929217b89839fac9713b6df553c0da215', 'student', '040');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (41, 'student041', 'scrypt:32768:8:1$RkeJL9dU9Uh60sBz$c767df5cdf3268fe6d006742f7786621bd30eacb20b29b2fc79768187867e546ca164e9ad8278550203fc6676e7dd987cb715aa5d88a2b00e5c9df5b193a4ea5', 'student', '041');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (42, 'student042', 'scrypt:32768:8:1$2KzgPvG8cRFIgpbB$5b0a17a9acf994be0ee181e246d693b29c2aa61f2e77c293d8017dfc8c385c26eab2b7b156c6e512b5384e1ae63df318f43186de840c3b26d0c767ad08d67545', 'student', '042');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (43, 'student043', 'scrypt:32768:8:1$E636XNJzXcSdSzXy$d740ad2170fcd9c8ea8f948afa95addd15eb304eb1c88570a422ce4a70e1794efe5ba40a6c73d2fcfe963cafa29fea6c4cc8b662da7768c0464a617d6bd4e640', 'student', '043');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (44, 'student044', 'scrypt:32768:8:1$zPG5XZzGgsOyU7A5$8656769829918aa88398660155ed0fb3e0a327a3ae87305a27b98b23849e4165a093108c7f9237a8a825d9dff4010e8dc63c8cc110234103d2a5784cec78b857', 'student', '044');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (45, 'student045', 'scrypt:32768:8:1$hNV9x9yCwRBkhLlk$b467df946af3ccf94f4336898ea8452896839e1149aeae26f903d2b61e128c3e8e62c1b04af35abb6e458c4db3be464e9ad2e439a40045f28e16a663af547831', 'student', '045');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (46, 'student046', 'scrypt:32768:8:1$0jldtpUUM5DmtIVj$6221ce16435c81fb4c48124de4497e8d40d09780c6cdc4ebce6a1b8e29272aead847f6cce153129e831e3d4152b3148b32069b573f0f0b20915d7f398c0a76d2', 'student', '046');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (47, 'student047', 'scrypt:32768:8:1$3VD7uus8doDhZ9OG$c7338e7b220d5adc73a336dbea6629b7bcffa650c49ac90c2c665b880156a04ef4f1f7746c2ebbe1abdee032923d9279e86a0201a74886ea5a9dfc0e012345e8', 'student', '047');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (48, 'student048', 'scrypt:32768:8:1$jZPs3s3jWOBzN5bF$046c59357a1e38a2bce742def6e8d1b09983bcf8ef5c62aa63b8de26311ebe4b39f99042e08a585b42ace63421b1876b47c9e62d2e447905514621ecec8079b1', 'student', '048');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (49, 'student049', 'scrypt:32768:8:1$7v7n21fRdfVGnqUl$cff51200b6408d1691e11547f7df306595719f5f07da098a17c9a1a5bf653d1e710feb5be5a7a967169650de4cce155fceb0871a4532dc5a82c8c2a5c977e0aa', 'student', '049');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (50, 'student050', 'scrypt:32768:8:1$3RQFVRYgbTlXDwjA$cda1dd1059cb2d5dc6b6f995d26a25a05189513649163cf7aaf0662ba8dbe37cc354116997720d0d35ba58b37cbc5acb78a1e07fcae67d5aa591a1ac2b602866', 'student', '050');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (51, 'student051', 'scrypt:32768:8:1$8kv1qVwdcgVQwLM8$1c4399aa870eb5c0cdf2dc8ca7a3cbf557b2bdbfd66e720a7e78b48398d5470c1bbbfc6bdcc9e9352414283bc7072d87f31b2ab1a850d7a2e0c965ae7e6c4cf9', 'student', '051');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (52, 'student052', 'scrypt:32768:8:1$xdUwXlq34NBhMMZ8$cd98e76ba920baa7e0d13a351bceeb4582b9d80d67f39a3ff33603c03348f0573f05832fa65b7c07ead149ab39d2c37cf6d1651691c3df47ce3d4b9797fa04be', 'student', '052');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (53, 'student053', 'scrypt:32768:8:1$GlIQilJm79io9U0L$2cacd4751b26bc64db55ec3b4c0f77fd1545d1bbb1a83f1d65e3ff7836820636030d0573821bad7d610d0b1f703ebe4e70aa5a899b58afa89228c444cbec9c2f', 'student', '053');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (54, 'student054', 'scrypt:32768:8:1$c8Ca9V0tCwRAG8to$da8da726a9df3367fb67f6dc35b2c1033fb597c63d06c0f0113d6663ca2ce15b0afdba335cea36c6e9c4ca45361ba7ecc0a2c58d24f6ce7b916f512562fb42bc', 'student', '054');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (55, 'student055', 'scrypt:32768:8:1$E0AQUz9oNa2MZrhf$a4ead1313d626122cf2364eaf0c52be9c1eaac5e37731039caaef3a71c4ef9d6b096a6d14ed987f212d09c66bdf18f654a458167cb4b7593a13846b2cbfc0382', 'student', '055');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (3, 'student003', 'scrypt:32768:8:1$4JqqaTOy0PbrQa3i$5bb1447c7aa77c716a88d8710e1b293c393f981e268dfeb0b6578e6d4f7e703a16a7620d4314a6b66314455525b528b08d780782c7cf053f97f5679ec6fa967d', 'student', '003');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (4, 'student004', 'scrypt:32768:8:1$sNwZLXUWgYOjxsqQ$30db50826e44d1c6360abb9e8d66fd6fd50eec5455582e1d104a127b76096e5322846125034a33f4133e8f95c5db2cf0adcbb8e5c4682e4a55b3384dc2b7fb2e', 'student', '004');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (5, 'student005', 'scrypt:32768:8:1$omk97DY09kxv4NTg$0078439dc035bc6099c493ea52c051785f4d9fe43ab9bebaf1b9134f48c0f63ae181b8142b9ba7e56a483872ada2ed9b49cb82e57e8aa31d9830007b514140b4', 'student', '005');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (6, 'student006', 'scrypt:32768:8:1$7GavUONtk86Jzag2$0c6ce19cc76f6f03e065bb33f0e0638109ba54547afe378af6df12bc042bfa8cc896ddf3afd444e301186b664eb0ffccb405b14028e184f8ad8c61b98a8529e8', 'student', '006');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (7, 'student007', 'scrypt:32768:8:1$wZaZTd7dAr42h5Mz$d360db9a4b31f467ac7e1811ffbd3ced0c30d9e94c49fb585eff79d06c09fb0f5ef9977d17531359f6f63f69030688283cb49ea2140724b1bf23245f386e10d5', 'student', '007');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (8, 'student008', 'scrypt:32768:8:1$7LnkMTAh2AXRQVbj$7690985a7df96633ae6e36a696af29b1e4841c30efaa4eb5b4e53bdbf0087687108b69d77f5529e4a8cbe0c88099a4db631579480753215b9633698508227f71', 'student', '008');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (9, 'student009', 'scrypt:32768:8:1$2r1jkIryE24JtjkC$ddb80802e200db14a99f6a21425532fd31966cdc34690f41b4bdb39124ddb33e71e7e43d6eb6827cb3266a54acc9472300684114b4d9b9762cb7759fa32a3016', 'student', '009');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (10, 'student010', 'scrypt:32768:8:1$32ZQGD7heOvDIOhb$b81cc01f82167c73b1599dec9267b01b326bcb9faf314d34f0085fbad87f0a34520f8fc6cf3ae70098d7b1564e8bc2b97274e4d067e6cbf2f21b677925fb56d9', 'student', '010');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (11, 'student011', 'scrypt:32768:8:1$BDTjWssBZNNH2L1W$9318a3e39803c993f63fd46caf6a09e059cfbce20865161f95597d6fae1b20d51445cc2bdcf1f22c9ed8dc66f408064e1492b083191edd54df774e63588ff11b', 'student', '011');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (12, 'student012', 'scrypt:32768:8:1$KPojzLd1BDDPEMFz$1922ec54cf60b8af7329829dfc7f451d71890eadf4b818ddd743e9b35230a4afb440b166436983639d60fbaa62a13f9d1cfaf6e445cf2046da7e6b40500f2d08', 'student', '012');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (13, 'student013', 'scrypt:32768:8:1$nYFfcZul7ZdFPo6b$4c7715bb045499880163e6b9ddd9c90a35db0429fecec9f7d416fe6533c020ea787c00f63dac49c530060f6a6feb825233de7448a476de10004a34fb597657fb', 'student', '013');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (14, 'student014', 'scrypt:32768:8:1$nbRheYjW7k9RryaA$fa250f20afca71f8021556d33dca6d6b7090cce504a1cc8368e5cfacdb23c41089f1c1e6118dda801c6a03bf3a3ff8c9bd9cac2ccd0ec71299ecafaf333d76f4', 'student', '014');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (15, 'student015', 'scrypt:32768:8:1$qxrdC9RdWUKqTlou$6a28839a6838abd7f811f6ef3d7f421184f80485350f9751b24c321c62808c8d7354281db3a527fdfe3513ab5bddd85e9b6a41a131323fefa9d2053069eef26d', 'student', '015');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (16, 'student016', 'scrypt:32768:8:1$02LoTyzJo0SdQ3GZ$8ebd9388e94d9a2ef4e7b0232aa47fd74127bc7be8c0c5712445b96dd36a5657d0f2f91e42974a773b775418543775cb25818a8d23e87612e19e25fc4d24d363', 'student', '016');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (17, 'student017', 'scrypt:32768:8:1$wAM3VQYtKpn7fRzz$bbaad27805f4a827cb7d8311d2a870935a6548eabb0bde5d004634c238f76af653924ecba8bd26cbead113fcef5ec1416c2ab3d2de58ce005d75d87b8e090338', 'student', '017');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (18, 'student018', 'scrypt:32768:8:1$UKVbgZ0nnWmkDzkp$6a88575ff6dfe96f205b0db79d33bfc48810f95fab596d659f2a284de48db08b82afa42e28a682375f92cae3ac63cea15c01adaff8290513fd4f4d6a3f869d11', 'student', '018');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (19, 'student019', 'scrypt:32768:8:1$rZHLjXkzUtx0K7fE$8f0f1828fbc5bc71a325d778e3a88b2692b5699e35d7b7d3f522aaa07b38acca286b003cbda171e9d8db3cb803154845c321893b9ebcfad68422e3274c0412cb', 'student', '019');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (20, 'student020', 'scrypt:32768:8:1$LW5jFZ2Blkxi9tdn$883429159b5f2b1eb3d4036f175d11c80287b11bf55853f95220d475b0e4f31842844ac114fddad1b045159cd1dd6fc04e81cf075dbbad12ddce6cab64af80e8', 'student', '020');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (21, 'student021', 'scrypt:32768:8:1$P99aKSgSK7GmqK1W$1592b7fb97de739cd3b85dda8e8a80a75c60fa3eaa18a8b87ed972a3794c810a1944f44b34f11ca8c1d8af2ca5e90e736f1dd2c0e7eb355b9a3836a80975ec02', 'student', '021');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (22, 'student022', 'scrypt:32768:8:1$ltxIuQh9ocWqUopY$c320954ed1826975ff0848d8d5bfb5eb3bc5151bbed5dc269a4db72d6809fdeecc42b80e3b5a719e0e37a018221ea371401812c728951ff13573bf4e53f3cd00', 'student', '022');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (23, 'student023', 'scrypt:32768:8:1$AgeBEQEnKTjpGDJo$ade3017f55fa4905b105e512c24ca88b3211b7ce82490e608dd53a1b32212e45e12c57a3db4735fedbac3116f8a61548bbfed67b84f51816906ec70e3b6bddc3', 'student', '023');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (24, 'student024', 'scrypt:32768:8:1$3fbaaVfs28w3nCFD$5b38fee3f105a358bb09bea05a368c0b6a820d40b439f58e998f29208b16c2cf90aa9b1a012306451453dcfcbe226a9ae199aacc1b2bddba28fa80f7bb041a30', 'student', '024');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (25, 'student025', 'scrypt:32768:8:1$lvJr74PIZTMdCbsY$61f0343672d2d5a45769b34085deda594eb218413a1df6e311d363f75f57750ff1dd23a13aa7f696b5147c46d899fac8141358c9fb0c4fc33c45208a94074c9b', 'student', '025');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (26, 'student026', 'scrypt:32768:8:1$xUHYMAwX6rRBFys5$969b4962a3236f9b8a45814c2bced86510a55417afe1229d2237f31a906317299dca1b7784c7817a441888a067cb29b9fd3759c4cc514605943cca5cf4f8ed9f', 'student', '026');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (27, 'student027', 'scrypt:32768:8:1$MRGA1sSXdBo1C13Q$65d3569c67655335b599720761f0064812e486c7a1bb9332e630c8d7e029e98a1c636b5bcf5a6bdf1c17afb270c9e0b5830b070d75776a2d6ec4c88fc6775095', 'student', '027');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (28, 'student028', 'scrypt:32768:8:1$aw0KMGR59rrC5a5U$48b409efd117f864400f534ffb967346157cb511efdebc8f403b484d5058488272c74044fafa2600a67df85730adfde97c8ff13cf2dcb048256a345214abc4aa', 'student', '028');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (29, 'student029', 'scrypt:32768:8:1$Fc2TKHtoN4VpItQO$2449a171cb8060a34f7cb9f3add75c453c2bb72d1537e71ed0a1152da78197d537071cceeef65de758e7a6925ba0890d293da1a0ceba242b2bec4d0a6e663673', 'student', '029');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (30, 'student030', 'scrypt:32768:8:1$v3cxktVASYwGbOaz$6883d13a6cde097e6ba20bacbcf3b317b0bb422c71921ec4090ae757514d859cec7b5c56cdbbbcb79fbe4894ba0d3f20b10f4671c15aba17175d7bfa46d06513', 'student', '030');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (31, 'student031', 'scrypt:32768:8:1$DKdYAlmqp9GsYDWY$7dbfbab02c7e6cc5f3c4165ad5ec496ff45c12528e8187347316ec4fb3602ea6bf0b6a63d7bb2cd28ea3ec5b238df2ddc947570ad912b4703fa7ec439289a792', 'student', '031');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (116, 'aaron_admin', 'scrypt:32768:8:1$h9tS1RZlt3BffDNj$193454c618fa8ae11fa6d05d1a073830bb48222a9ba85793ec85cbaa840d1204b0f0d213f38ca97da7c43a7710737f2d3c5bbc7f649d674b49d07179120879f0', 'admin', '001');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (117, 'azwee_admin', 'scrypt:32768:8:1$LpPfdF9SdqukQ8Gs$bacd682d5c50e7e8eed01a021da0bce54b518d1a21e97e07860ea74157cab0bceb530503b2443613acb8e2ccdb3915ec1c36955bf47be6dc7f8bb4453beb9eaa', 'admin', '001');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (118, 'prash_admin', 'scrypt:32768:8:1$HSeZvuCbnpKDaTsS$62bd3d85a89a7ba681759804d1f19648ef7e1c2350df78e58b8332f9a74455e4d72040b3fa9f0f786e4e4e7f869c6e256a60676140d747b011d8241527a5ab73', 'admin', '001');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (119, 'effendy_admin', 'scrypt:32768:8:1$KD35HKSyBpBFCMk2$24cf139bcdf5933b14badd78af06ef967fb89def93433d22064cd19aea8aec1e15fb4775cdfda6d6d17cd30eda8edc2b4f835a7fc270390de9cffabfcebaa270', 'admin', '001');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (120, 'amzar_admin', 'scrypt:32768:8:1$ZBpS6SUDa6IGzwMC$c40a685ca11b8c8c1af400ba4fd87263ff14d94afe327cd1070b96d9d387f0475bc38f8464096b44d44d11026089469fbfce35f12a2cf8bab29e54d5534f89c1', 'admin', '001');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (56, 'student056', 'scrypt:32768:8:1$k6NJ72MlM6jvuN4R$90206a373097e40a646341e6a77ff959d5830219fb27a79416004a6978df167a0f026cbb1ddad2c4fff10739b2fc1a647745777626de763ad4cf3b5964bee050', 'student', '056');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (57, 'student057', 'scrypt:32768:8:1$G7LWac61o3jnrzxt$ebcf1b93b18d496a9044b6fdb3119feb21bffa4b6c539e36a403f340f5a28fc5f030c1ec3118baad219edb5ed43fadfb476c7ae82b19363ef7e649f44448b55c', 'student', '057');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (58, 'student058', 'scrypt:32768:8:1$TMJv4g2E7pSssTM9$9b5f64dc3ffa87d8212efc6457734d4ea52e5bd0aba58cc31ef6af9a902ac547a0bdd38518829d90dc2cc30d3979a3fb37ee4d10003c1187900a1c20e11d794a', 'student', '058');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (59, 'student059', 'scrypt:32768:8:1$32pr4FnwgHqNqlKf$f5c4710a5cdba76ea4e5ed9434cc71aca575fce9a601c31b53ed9ec9f3f049a95a7281a535f337466e6e175ce12e5736910026fd4cc1cd1d05e3d6ef7a1d3f20', 'student', '059');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (60, 'student060', 'scrypt:32768:8:1$JpEL8LgPaLOXTeBv$2e0796db0e009ae42ee6ac1856afa757f3606a7b3dd63a0e1eec5d4459003cedf3dcff21ab6a282558de0ff922c0e4271695d76ece999fa46be588c6061905ed', 'student', '060');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (61, 'student061', 'scrypt:32768:8:1$ttbyRJ1JNZkzdbDG$789839c27b1316a351652bcadbf0d866c5fdf7572fcfde7fee707c8f562177c39c413218d490c7295b8ae4e662119075f7a1b1559c92ee719028398f0129d0c8', 'student', '061');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (62, 'student062', 'scrypt:32768:8:1$9jQpRtDsad9TaUVC$3adbcb837e466d15cd876123979d4c1d64040de807af853cd527eb76a9eed68da8c22c4159f824a637d1870dfab4c52d3d6edf72d4f91510ca97c977792bde4e', 'student', '062');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (63, 'student063', 'scrypt:32768:8:1$HYCFuxxuuK3Skzlr$706a0cfb07e8b532a2f5c709730d9f9204c36065c6461f79fbca97621ba407700cda11e60ea85625481b737d10ae96d32faeef53daad0d866681c84869d3dba1', 'student', '063');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (64, 'student064', 'scrypt:32768:8:1$hh99Q9XfAyvpbRe0$74cdc9d9fb67dff303e069ffea2c3a38b9e87a266812ed6bbfe749a542fdf3683d1158b8c7caab9d0d692ee89b92e32c9fe2b69798aeede2a560d72bf876013b', 'student', '064');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (65, 'student065', 'scrypt:32768:8:1$qByc8zOEKRbjYPLH$3894bf2d7761289325f6d3145010604c4159b094f8a92cd5a59243c1601cede8b44e8b3459981197228f783fbe275b9d916c090e8b8b70937b8aa1956eb3816b', 'student', '065');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (66, 'student066', 'scrypt:32768:8:1$a7KVhV3q9yebGlXs$96bbbea1171c95d0c20fa9c0549276b5b98eb1e4d8ea83af6568692129a0b0315cad024226e57f40a1b34fae634350349c6ede18e742201e7f557112c22d1210', 'student', '066');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (67, 'student067', 'scrypt:32768:8:1$2JHaCqvmKVUMQm4G$da00c3fb7a7ab4b4a86019e3a97903cb68328e58e2c3e5776ff488d122a67810fd85497e194b5d7712840391e7ae104b7131620817cdcc79f9ec33197dd5ee78', 'student', '067');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (68, 'student068', 'scrypt:32768:8:1$pe89jNamZv4gyUCZ$96775bd3c628afb1bf90443c2526c04d63e411d099ef8e94701fa6d69857586619f0f0a63884c26f0fa383b7fb46b77c5e03d1d252e6a70954074b01fe9910cc', 'student', '068');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (69, 'student069', 'scrypt:32768:8:1$tU3nA8gazUe4jwb8$dde9baf7df430b6a011b9b888a0ba362f92b0158287fbe38f1a04136ca420f9130370d2cff97ba237ba4c6461afad8353271159010e5097d650c05e4ce0bdbd3', 'student', '069');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (70, 'student070', 'scrypt:32768:8:1$B9Ly5Qh4RO2YnfrO$c146a5e6aeb327e51144a09375294102b4733224408e89b921ccc4bbf170bc6f22836005cd47f696406ee2886596c15a3a9a241f30d9b49d28b280d01efd393f', 'student', '070');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (71, 'student071', 'scrypt:32768:8:1$6daceOcP1Iy8crJL$f6ccca56b970564e3fc2fde2d397e24d74ae3c367daa806d39f20be24a5043d51ea6b6f45689cb6a7cb2eff17a5c2c725efe4ad9c05606576f4360c243852207', 'student', '071');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (72, 'student072', 'scrypt:32768:8:1$wMjewfrPvp5pEmNx$e81981550a7df8406edee19d71d30737f4a15ed5d7f2df2d0355bdd9f1330edd3284781658465b2443e4fee839351264dc98752874dda9c5135dd785dea3c527', 'student', '072');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (73, 'student073', 'scrypt:32768:8:1$krUqMTBmimmRaSHU$7147f679a125e4e4a0788fdbf2c3b986eb5c770b2292e6beb042f66031fbabcffa3f3d9667f3806035c04fbedc9c20ee6ae6d6255d122c731178699f763cf289', 'student', '073');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (74, 'student074', 'scrypt:32768:8:1$AbchwgL4x6yrUdUG$cfaaa907a738007a5862774e2eea98a52a43ae3b055131da712e9b156ba46ddf77b7c98d9c9b0a6f2ecfc42308d9a680f70933da6b44621f53a473bae6499a66', 'student', '074');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (75, 'student075', 'scrypt:32768:8:1$NmLqlf4u4PIIMVeb$8aad7b362b792e73ad3b76b46bf78ca138f8d18e6ef6391c51df3406657cdb5e40978d8b64783d21bb4dbbeff5ae0b421c63e49b02965926367f2e0db5139726', 'student', '075');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (76, 'student076', 'scrypt:32768:8:1$pgdvFzcANOtnKeLP$6d32c02afbcbd2497b4d16319b503e0b0ce32f00569c6c36aecc7bbabaed99d7014017ca61cfc94244a076e9ec8fe8d37dd3cdd1b27618cb8d2ebdcb1214dd2c', 'student', '076');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (77, 'student077', 'scrypt:32768:8:1$sQFBaWHxjvA9xCPv$1976cfbb2f7f9750e8ed41051149801ab54c292b77c69c8cf329f2f36410ad786f46988f74e5c2aaee06c925b1d68ba4d9c4715032deec59b4027cac644db6ba', 'student', '077');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (78, 'student078', 'scrypt:32768:8:1$fM52itQgssbyuKb1$3b0c7c7662095cc92058cb172d8950c6586b82bee36ac2a9b06361b7642b4439f5ed686abcfc10f25b77a554e77012129b4e1aff1c8d731875f4ea42940c42a0', 'student', '078');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (79, 'student079', 'scrypt:32768:8:1$2pKqG7j8D0YwyhFC$462e206c2c6c9d5b7b56267260adb0c5508750999c5d07d00c35cb05beafe72f12f0cbcd167d412f50f3bcc7709114dcec2f33b7aa274f088cc95e0ee9fb2418', 'student', '079');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (80, 'student080', 'scrypt:32768:8:1$8mQ1fqvBnefr1ROf$90c7a7f63169296f993ddb3bbd0e9b9e8fceb0200ff88e572fdfaccfa5692f030c23ed4c958826ad749ba0cf6052bd133463510c9159113e2d1552c463410e9d', 'student', '080');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (81, 'student081', 'scrypt:32768:8:1$qT8AkTnvgmpd4xO6$282847bfa815285c34fb582cfc822a59b1f87682302901508fc7f1c760bacce66603bb79a858e10b5b8e34c8296d83d69899bd0b2629c2aaa6cce4b5c6d3ba74', 'student', '081');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (82, 'student082', 'scrypt:32768:8:1$KbRBdZ2qbj7XGaBW$2368a926d069862dab286eb85436dda74c9f7a21c8fed87b4b25a4ddd0ebe5af0d66a60c86a441189cc3362ddec52ca6eddaaf31dadd8dfdd1f6fb0b0025e4ce', 'student', '082');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (83, 'student083', 'scrypt:32768:8:1$7ae19kCytHpp113z$527c9190987dde379aa2baf32d99bcdb85263c64da91da5d03056225b12e75315a8a0aa2f6e9cb0f60ef53f2e3dbbc503a3403d3d2616d7e157fce4b1eed4451', 'student', '083');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (84, 'student084', 'scrypt:32768:8:1$HUkrqBJvdm4KVcXA$654190329abf906577aa393625ce40f4dd628edb1f782519d790769731cf73969ab5176ca0b2951822b9fe586588d4dc632615ed565aae23050eba758db8eeb0', 'student', '084');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (85, 'student085', 'scrypt:32768:8:1$5g6ztyLeZ6hpk9mm$31d5cea756d310a5850bfa9126ab5a7a59db1dc9ad3c4213c4b758a7822534540e4c10762173d667b1aa5a5f175d44466a5452a9eca72c3f10972ac199dd28fb', 'student', '085');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (86, 'student086', 'scrypt:32768:8:1$iU7RySFnM0C0wTNu$2495266cc8558e2dfae5604123ae5d8a1856ebc301134ddf5a263a74f51993984135b9cbb908fcfd92d88bfaf34401f819d5c26feea7a540611fc0fad750b8bc', 'student', '086');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (87, 'student087', 'scrypt:32768:8:1$wMUAyPsThrb3YeIe$e16906b32d14c32314e911f133f2fbb3f7a183d84f502ce5a6ec0964d7b404b1bd7d1dcf3c157b9647c1484ce138032ed7cd02d5ea9080c4edd3bdc078704dda', 'student', '087');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (88, 'student088', 'scrypt:32768:8:1$2e5WgHGLrBvcZKSQ$c21b327274b3ea5bde3405e77c9e16c8576a8150da47454acc40da5bf03e89750b3c51714b2a976653f8bc1bdd0fe2bec9ceeaa99891878e2b0ca5e811507266', 'student', '088');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (89, 'student089', 'scrypt:32768:8:1$VhzQzmitH16tKXnd$b4d9255180d20436a2699ee00c988641d6a0e2d0d1021cb466b4ec70ec65a9ebb7dfce6cd28bf233b7ce392747920e710142dc607dab68a1294f6777f05f9aed', 'student', '089');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (90, 'student090', 'scrypt:32768:8:1$cD1yBHRhtaHwpPdd$b8e63039f12874a15f52d48049bb3da5400318178c29313d0033ea43767ed5c8e6b891bd03f6785d9b61ca41cef786a64b6a56420761c95ddcb10dba96992eb3', 'student', '090');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (102, 'teacher002', 'scrypt:32768:8:1$pouXRzAUBJoa9Kkn$c39cd70ff24bc1d4b5ac36e7aa7a398af4b3f50ee66c2ab584fe8f3d1ae71fff24dc8cb68d7cbe741993c830682ab0c02375c3e22dd09e27dba02373492d8e54', 'teacher', '002');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (103, 'teacher003', 'scrypt:32768:8:1$xmpqitYhjAtems8l$81b15f0571f9a169e0d2ca3798f2a3b769f11928d3d9982d3386236802d77f03033ed3bd57ca83b2fdbb7f5af9bbf5bf34fb02893cd2943b0278d00c01259f05', 'teacher', '003');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (104, 'teacher004', 'scrypt:32768:8:1$KRDyhaP7bMppewQv$eebc93b1a756bae6573dea22120a92544e63f4322beaea2820aca8f6db68e4a4a629ef44cf35d9138e2653e7269ace6bfc84600048180894de39f6f2576de600', 'teacher', '004');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (105, 'teacher005', 'scrypt:32768:8:1$B8bbKBWQgpPa9KXK$6eb0493282328d309760c743f7ccce85ab78380ba686325ea7ca73a670590249bc00822494c04658ccbc038373a0a2302c6d1b2451f214bf0d276b761df10130', 'teacher', '005');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (106, 'teacher006', 'scrypt:32768:8:1$XwrWFOEad02ABMbm$e7025f9a3db44739e6387c412e64d62004eb6a6545cd7161b0f0b579d7951047d99a6be286f1579ddf603eb521e5dcfd835e99b7c4ed60c68ff4117e91a884a6', 'teacher', '006');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (107, 'teacher007', 'scrypt:32768:8:1$zAl33TE3Lhe4EtIP$ea575905d0de522c5decf496414275af6818744cc554eb3b88b486306521398806bedda71959098ea495e6db0914e74236d149c5edd25882d8b4ed18c7568ac9', 'teacher', '007');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (108, 'teacher008', 'scrypt:32768:8:1$gVehhrBkcZWv5n9P$8dd95fc28ed24693381019f6310760524dcf2f4d454bbf5f2dabeb1ac0a47d35df14343beea62513c0f2a15e3fd65f19df9577fe942b38c3ecf5c7280dfa0f3a', 'teacher', '008');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (109, 'teacher009', 'scrypt:32768:8:1$hpKtWRYmqujrEaYp$a4e4711695c1992f5f511ba3442623c7f44d3e0efc8271c62645e9e3323ef148b11dc625dfe2eabaaa74f318899616274c036621aa3cdaad5d3c65afe39decff', 'teacher', '009');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (110, 'teacher010', 'scrypt:32768:8:1$wLItQmx1EgJ1Nprg$c0df66739e7068aec4a1017cea0d5aec48a386a4de2d2de9628d658657598716f4e4f0ffd00ec1e8fcabfdabd8c3c040d016afb3f97ebb10963b71b0df862ef4', 'teacher', '010');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (115, 'rei_admin', 'scrypt:32768:8:1$NGzSntQxZwW2VrWI$1b259cebc7085e13584e1601c306cd99edf433d59a837f38dd3eda3d0eeca7512b7f5522b1581ea2d390194671a644b4c210a9c1093ec1187286bdb165927026', 'admin', '001');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (91, 'student091', 'scrypt:32768:8:1$rSpMXTI4wMFtCBOu$98cb942bbb22789e351fc5be2f464cf59a8c6a597f28e06f68def15e5f2304b1e8b3851110e99d91c9b6ce21b5f7124dedf7511171fb1cc74052b6a5c0d53167', 'student', '091');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (92, 'student092', 'scrypt:32768:8:1$iWCKPMITMlyTsBWt$3cfd1411b0fdae4cdda71179d869dd10f230d2cbb601905e7f6fcfad5db60458eb839368070c6147b9c358923abc8813b8d508815582a99b3d66fdac322484db', 'student', '092');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (93, 'student093', 'scrypt:32768:8:1$js8jMaBBhrnTlYgM$8b3ca4d6b0761bc690f28291a1ed0fd9eca31daa06a554fd85388d5afca34a88a546d01103fc88760c634b22514959d17df022a90a03f102299f798b778cc87f', 'student', '093');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (94, 'student094', 'scrypt:32768:8:1$p2i15G9YQaXNt7Ka$60a82b6d18c7f7a2b7c51941e033f17db9fb1c54cb149abf9ad7592ab03786acfa25c7889fd12f767e9fc59c70a97fc181e07ed70b1962af364175ffefa27a41', 'student', '094');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (95, 'student095', 'scrypt:32768:8:1$62DkZ7l7o0YWsB50$dc6da825706c18c58c395861f2877b80d1b1991aba71e09f3e1ecbeb95332bb9cdadc65026582ad29d7d3fdb2638a5eee9d6ce91e37192461898099da80699ee', 'student', '095');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (96, 'student096', 'scrypt:32768:8:1$wQxPZVyDDxx3X1Am$7ce24239dfb547c47371feec7e790930e30da24ee8b26af49c1565c34ac9ccfe9763981a2387335d8b31e670204999291a3a9188e52a973b384c0692f56a2bc4', 'student', '096');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (97, 'student097', 'scrypt:32768:8:1$7G1ZGNTCLuK3HvOv$11c8811fcb772ff85ba6a78cd5c857f575d792a3634d0dd5f3a595cb541ec73e1fb16fb89c6f9e7029fecf3223a41ca1c7731b21a8dc0de77458d07bb9b74366', 'student', '097');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (98, 'student098', 'scrypt:32768:8:1$eNGwvL3dEzD9woKk$75a407cc372f02cfa187229471315f3fb9dcb16f60841b8fe171b70428b4f701a229739318421fa464aed2d30787119915128cf337fc27dd38eec8e0d2e0f6cb', 'student', '098');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (99, 'student099', 'scrypt:32768:8:1$BbzhVZnf3Udo8HdD$b7ca457e85ffa4fb0cfa853bccfa1401df58abfbd54c38149febf1268315762d075bdbd23ca3e103e5048502db7f3f27f3a980dcfd70c0bf3ed4f49ef129ff86', 'student', '099');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (100, 'student100', 'scrypt:32768:8:1$yyNzkT9rtgrd8Ydb$16ac7e5e422dc31f3c345a53522eccbbeaaed655c900cea3e3f9687882300f3222e8aab7f30eea243199e73c7973af3eb3806c8dcacf023d499bec801874f89c', 'student', '100');
INSERT INTO users (user_id, username, password, role, initial_password) VALUES (101, 'teacher001', 'scrypt:32768:8:1$LTC3Jz4BX7OcxFSb$67c755c2b141502f9ce56910d68fd69521781a9d36b2b7928dd507e8b5a914d33ced536e7089bbb5484d4d7a1735542048a4a9506b7f12ee2074d7e133f23ffe', 'teacher', '001');

--
-- Name: classrooms_classroom_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--
--
-- Name: facilities_facility_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--
--
-- Name: facility_bookings_booking_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--
--
-- Name: facility_staff_staff_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--
--
-- Name: students_student_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--
--
-- Name: teachers_teacher_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--
--
-- Name: users_user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--
--
-- Name: classrooms classrooms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
--
-- Name: facilities facilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
--
-- Name: facility_bookings facility_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
--
-- Name: facility_staff facility_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
--
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
--
-- Name: users users_password_format_chk; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--
--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--
--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--
--
-- Name: users_username_lower_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_username_lower_uniq ON users (lower((username)));

--
-- Name: classrooms classrooms_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
--
-- Name: facility_bookings facility_bookings_facility_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--
-- Make errors fail fast if you run via psql

-- === Permissions and defaults ===
-- === Make database accessible to everyone ===

-- Allow all users to connect to this database (if permissions allow running this)
-- Allow all users to use the public schema
-- Allow all users full rights on existing tables and sequences in public schema
-- Make future tables/sequences automatically accessible to everyone
-- Set the database's default search_path for all future connections
-- Ensure the current session sees the public schema right now