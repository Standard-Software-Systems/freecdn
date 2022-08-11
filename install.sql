CREATE TABLE users (
    userid varchar(255),
    secret TEXT,
    folder TEXT,
    webhook TEXT,
    cookie TEXT,
    admin BOOLEAN
);

CREATE TABLE images (
    userid varchar(255),
    fileid TEXT,
    filename TEXT
);
CREATE TABLE downloads (
  id int NOT NULL,
  user text NOT NULL,
  url text NOT NULL,
  amount int NOT NULL,
  name text NOT NULL,
  password text
);