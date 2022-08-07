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